import type {
  BattleActionType,
  BattleRules,
  BattleState,
  BattleUnitState,
  ElementMatchup,
} from "../../types/battle";
import type { Character, Skill } from "../../types/character";
import type { StatusEffect } from "../../types/effects";
import type {
  CharacterStats,
  ModifiableStat,
  SkillTargetType,
} from "../../types/shared";
import {
  BLOCK_DAMAGE_MULTIPLIER,
  CRITICAL_HIT_CHANCE,
  DEFAULT_MANA_GAIN_PER_ROUND,
  DEFAULT_MAX_MANA,
  applyManaGain,
  calculateCriticalHit,
  calculateDamage,
  clampMana,
  sortTurnOrderBySpeed,
} from "./utils";

const FORCE_ACT_LAST_SPEED = Number.MIN_SAFE_INTEGER;
const DODGE_SUCCESS_RATE = 0.5;

const DEFAULT_ELEMENTAL_MATCHUPS: ElementMatchup[] = [
  { attacker: "Earth", defender: "Water", multiplier: 1.2 },
  { attacker: "Water", defender: "Fire", multiplier: 1.2 },
  { attacker: "Fire", defender: "Air", multiplier: 1.2 },
  { attacker: "Air", defender: "Lightning", multiplier: 1.2 },
  { attacker: "Lightning", defender: "Earth", multiplier: 1.2 },
  { attacker: "Light", defender: "Dark", multiplier: 1.2 },
  { attacker: "Dark", defender: "Light", multiplier: 1.2 },
];

export const DEFAULT_BATTLE_RULES: BattleRules = {
  playerTeamSize: {
    min: 1,
    max: 3,
  },
  enemyTeamSize: 1,
  manaGainPerRound: DEFAULT_MANA_GAIN_PER_ROUND,
  maxMana: DEFAULT_MAX_MANA,
  critChance: CRITICAL_HIT_CHANCE,
  critMultiplier: 1.5,
  dodgeSuccessRate: DODGE_SUCCESS_RATE,
  blockDamageMultiplier: BLOCK_DAMAGE_MULTIPLIER,
  speedTieBreaker: "player-first",
  elementalMatchups: DEFAULT_ELEMENTAL_MATCHUPS,
};

export interface BattleParticipantInput {
  character: Character;
  level?: number;
  unitId?: string;
  currentHp?: number;
  currentMana?: number;
}

export interface InitializeBattleParams {
  players: BattleParticipantInput[];
  boss: BattleParticipantInput;
  battleId?: string;
  rules?: Partial<BattleRules>;
}

export interface BattleActionSelection {
  type: BattleActionType;
  targetUnitId?: string;
}

export interface BattleEngineOptions {
  random?: () => number;
}

/**
 * Step 1-2 from the design flow:
 * - Initialize battle state
 * - Apply battle passives
 */
export function initializeBattle({
  players,
  boss,
  battleId = "battle-1",
  rules,
}: InitializeBattleParams): BattleState {
  if (players.length < 1 || players.length > 3) {
    throw new Error("Battle requires between 1 and 3 player characters.");
  }

  const mergedRules = mergeBattleRules(rules);
  const playerUnits = players.map((participant, index) =>
    createBattleUnitState(participant, "player", false, index, mergedRules),
  );
  const enemyUnits = [
    createBattleUnitState(boss, "enemy", true, 0, mergedRules),
  ];

  return refreshBattleState({
    id: battleId,
    round: 0,
    phase: "passives",
    outcome: "in-progress",
    playerUnits,
    enemyUnits,
    turnOrder: [],
    activeUnitId: undefined,
    rules: mergedRules,
    combatLog: [],
  });
}

/**
 * Step 3-5 from the design flow:
 * - Start round
 * - Add mana to all living units
 * - Sort turn order by speed
 */
export function startRound(state: BattleState): BattleState {
  if (state.outcome !== "in-progress") {
    return state;
  }

  const nextState = cloneBattleState(state);
  nextState.round += 1;
  nextState.phase = "round-start";

  nextState.playerUnits = nextState.playerUnits.map((unit) => ({
    ...applyManaGain(unit, nextState.rules.manaGainPerRound),
    hasActedThisRound: false,
  }));
  nextState.enemyUnits = nextState.enemyUnits.map((unit) => ({
    ...applyManaGain(unit, nextState.rules.manaGainPerRound),
    hasActedThisRound: false,
  }));

  refreshBattleState(nextState);

  const turnOrder = buildRoundTurnOrder(nextState);
  nextState.turnOrder = turnOrder;
  nextState.activeUnitId = turnOrder[0];
  nextState.phase = turnOrder.length > 0 ? "turn" : "round-end";

  return checkWinCondition(nextState);
}

/**
 * Resolves one turn for the current active unit.
 * Player units require an explicit action. Boss turns are selected by AI.
 */
export function resolveTurn(
  state: BattleState,
  playerAction?: BattleActionSelection,
  options: BattleEngineOptions = {},
): BattleState {
  if (state.outcome !== "in-progress" || state.phase !== "turn") {
    return state;
  }

  const random = options.random ?? Math.random;
  const nextState = refreshBattleState(cloneBattleState(state));
  const actorId = nextState.activeUnitId;

  if (!actorId) {
    return nextState;
  }

  let actor = getUnitById(nextState, actorId);
  if (!actor || !actor.isAlive) {
    return finalizeTurn(nextState, actorId, false);
  }

  const skippedEffectIds = new Set<string>();

  processStartOfTurn(nextState, actorId);
  checkWinCondition(nextState);

  actor = getUnitById(nextState, actorId);
  if (!actor || !actor.isAlive) {
    return finalizeTurn(nextState, actorId, false, skippedEffectIds);
  }

  if (unitCannotAct(actor)) {
    return finalizeTurn(nextState, actorId, false, skippedEffectIds);
  }

  const action =
    actor.side === "enemy"
      ? selectBossAction(nextState, actorId, options)
      : requirePlayerAction(actor, playerAction);

  validateActionSelection(nextState, actor, action);

  if (action.type === "block") {
    actor.blockActive = true;
    actor.dodgeReady = false;
    actor.hasActedThisRound = true;
    addCombatLog(nextState, actorId, [], action.type, `${actor.name} uses Block.`);
    refreshBattleState(nextState);
    return finalizeTurn(nextState, actorId, true, skippedEffectIds, action.type);
  }

  if (action.type === "dodge") {
    actor.dodgeReady = true;
    actor.blockActive = false;
    actor.hasActedThisRound = true;
    addCombatLog(
      nextState,
      actorId,
      [],
      action.type,
      `${actor.name} prepares to Dodge the next incoming hit.`,
    );
    refreshBattleState(nextState);
    return finalizeTurn(nextState, actorId, true, skippedEffectIds, action.type);
  }

  const skill = getSkillForAction(actor, action.type);
  actor.currentMana = clampMana(actor.currentMana - skill.manaCost, actor.maxMana);

  const actionTargets = resolveTargetsForSkill(
    nextState,
    actor,
    skill.target,
    action.targetUnitId,
    random,
  );
  const damageTargets = skill.damage.baseDamage > 0 ? actionTargets : [];
  const damageResult = resolveSkillDamage(
    nextState,
    actorId,
    skill,
    damageTargets,
    random,
  );
  const effectTargets = resolveSkillEffects(
    nextState,
    actorId,
    skill,
    action.targetUnitId,
    damageResult.totalDamageDealt,
    random,
  );

  for (const effectId of effectTargets.appliedToActorEffectIds) {
    skippedEffectIds.add(effectId);
  }

  actor = getUnitById(nextState, actorId);
  if (actor && actor.isAlive) {
    actor.hasActedThisRound = true;
    applyAfterActionPassives(nextState, actorId);
  }

  refreshBattleState(nextState);
  checkWinCondition(nextState);

  return finalizeTurn(nextState, actorId, true, skippedEffectIds, action.type);
}

export function checkWinCondition(state: BattleState): BattleState {
  const playerAlive = state.playerUnits.some((unit) => unit.isAlive);
  const enemyAlive = state.enemyUnits.some((unit) => unit.isAlive);

  if (!playerAlive) {
    state.outcome = "enemy-victory";
    state.phase = "finished";
    state.turnOrder = [];
    state.activeUnitId = undefined;
  } else if (!enemyAlive) {
    state.outcome = "player-victory";
    state.phase = "finished";
    state.turnOrder = [];
    state.activeUnitId = undefined;
  }

  return state;
}

/**
 * Boss AI from the design docs:
 * 1. Use skill 2 if possible
 * 2. Otherwise use skill 1 if possible
 * 3. Otherwise basic attack
 */
export function selectBossAction(
  state: BattleState,
  actorUnitId: string,
  options: BattleEngineOptions = {},
): BattleActionSelection {
  const actor = getUnitById(state, actorUnitId);

  if (!actor) {
    throw new Error(`Boss unit "${actorUnitId}" was not found.`);
  }

  const random = options.random ?? Math.random;
  const validTargets = getLivingOpponents(state, actor);
  const forcedTargetId = getForcedTargetId(actor, validTargets);
  const randomTarget =
    validTargets.length > 0
      ? validTargets[Math.floor(random() * validTargets.length)]
      : undefined;

  if (actor.currentMana >= actor.skills.skill2.manaCost) {
    return { type: "skill2", targetUnitId: forcedTargetId ?? randomTarget?.unitId };
  }

  if (actor.currentMana >= actor.skills.skill1.manaCost) {
    return { type: "skill1", targetUnitId: forcedTargetId ?? randomTarget?.unitId };
  }

  return { type: "basicAttack", targetUnitId: forcedTargetId ?? randomTarget?.unitId };
}

function createBattleUnitState(
  participant: BattleParticipantInput,
  side: BattleUnitState["side"],
  isBoss: boolean,
  index: number,
  rules: BattleRules,
): BattleUnitState {
  const level = participant.level ?? participant.character.levelRange.min;
  const leveledStats = getStatsForLevel(participant.character, level);
  const unitId =
    participant.unitId ??
    `${side}-${participant.character.id || participant.character.name}-${index + 1}`;

  return {
    unitId,
    characterId: participant.character.id,
    side,
    isBoss,
    level,
    name: participant.character.name,
    element: participant.character.element,
    baseStats: leveledStats,
    currentStats: leveledStats,
    maxHp: leveledStats.hp,
    currentHp: clampToRange(participant.currentHp ?? leveledStats.hp, 0, leveledStats.hp),
    maxMana: participant.character.mana.max || rules.maxMana,
    currentMana: clampMana(
      participant.currentMana ?? participant.character.mana.start,
      participant.character.mana.max || rules.maxMana,
    ),
    passiveAbility: participant.character.passiveAbility,
    skills: participant.character.skills,
    activeStatusEffects: [],
    shield: 0,
    isAlive: true,
    hasActedThisRound: false,
    blockActive: false,
    dodgeReady: false,
    dodgeDisabledForTurns: 0,
    tauntedByUnitId: undefined,
    actionAvailability: {
      canBasicAttack: true,
      canSkill1:
        participant.character.skills.skill1.manaCost <= participant.character.mana.start,
      canSkill2:
        participant.character.skills.skill2.manaCost <= participant.character.mana.start,
      canBlock: true,
      canDodge: true,
    },
  };
}

function getStatsForLevel(character: Character, level: number): CharacterStats {
  const boundedLevel = Math.max(
    character.levelRange.min,
    Math.min(level, character.levelRange.max),
  );
  const levelOffset = boundedLevel - character.levelRange.min;

  return {
    hp: character.baseStats.hp + character.statGrowth.hp * levelOffset,
    atk: character.baseStats.atk + character.statGrowth.atk * levelOffset,
    def: character.baseStats.def + character.statGrowth.def * levelOffset,
    speed: character.baseStats.speed + character.statGrowth.speed * levelOffset,
  };
}

function mergeBattleRules(rules?: Partial<BattleRules>): BattleRules {
  return {
    ...DEFAULT_BATTLE_RULES,
    ...rules,
    playerTeamSize: {
      ...DEFAULT_BATTLE_RULES.playerTeamSize,
      ...rules?.playerTeamSize,
    },
    elementalMatchups:
      rules?.elementalMatchups ?? DEFAULT_BATTLE_RULES.elementalMatchups,
  };
}

function cloneBattleState(state: BattleState): BattleState {
  return {
    ...state,
    playerUnits: state.playerUnits.map(cloneUnitState),
    enemyUnits: state.enemyUnits.map(cloneUnitState),
    turnOrder: [...state.turnOrder],
    combatLog: [...state.combatLog],
  };
}

function cloneUnitState(unit: BattleUnitState): BattleUnitState {
  return {
    ...unit,
    baseStats: { ...unit.baseStats },
    currentStats: { ...unit.currentStats },
    activeStatusEffects: unit.activeStatusEffects.map((effect) => ({ ...effect })),
    actionAvailability: { ...unit.actionAvailability },
  };
}

function refreshBattleState(state: BattleState): BattleState {
  const allUnits = getAllUnits(state);
  state.playerUnits = state.playerUnits.map((unit) => refreshUnitState(unit, allUnits));
  state.enemyUnits = state.enemyUnits.map((unit) => refreshUnitState(unit, allUnits));
  return checkWinCondition(state);
}

function refreshUnitState(
  unit: BattleUnitState,
  allUnits: BattleUnitState[],
): BattleUnitState {
  const passiveHpPercent = getPassiveStatModifierPercent(allUnits, unit, "hp");
  const passiveAtkPercent = getPassiveStatModifierPercent(allUnits, unit, "atk");
  const passiveDefPercent = getPassiveStatModifierPercent(allUnits, unit, "def");
  const passiveSpeedPercent = getPassiveStatModifierPercent(allUnits, unit, "speed");

  const statusHpPercent = getStatusStatModifierPercent(unit, "hp");
  const statusAtkPercent = getStatusStatModifierPercent(unit, "atk");
  const statusDefPercent = getStatusStatModifierPercent(unit, "def");
  const statusSpeedPercent = getStatusStatModifierPercent(unit, "speed");

  const maxHp = applyPercentageModifier(
    unit.baseStats.hp,
    passiveHpPercent + statusHpPercent,
  );

  const currentStats: CharacterStats = {
    hp: maxHp,
    atk: applyPercentageModifier(
      unit.baseStats.atk,
      passiveAtkPercent + statusAtkPercent,
    ),
    def: applyPercentageModifier(
      unit.baseStats.def,
      passiveDefPercent + statusDefPercent,
    ),
    speed: applyPercentageModifier(
      unit.baseStats.speed,
      passiveSpeedPercent + statusSpeedPercent,
    ),
  };

  const currentHp = clampToRange(unit.currentHp, 0, maxHp);
  const shield = getTotalShieldValue(unit.activeStatusEffects);
  const isAlive = currentHp > 0;
  const cannotAct = hasControlLock(unit);

  return {
    ...unit,
    currentStats,
    maxHp,
    currentHp,
    shield,
    isAlive,
    actionAvailability: {
      canBasicAttack: isAlive && !cannotAct,
      canSkill1: isAlive && !cannotAct && unit.currentMana >= unit.skills.skill1.manaCost,
      canSkill2: isAlive && !cannotAct && unit.currentMana >= unit.skills.skill2.manaCost,
      canBlock: isAlive && !cannotAct && !unit.blockActive,
      canDodge:
        isAlive &&
        !cannotAct &&
        !unit.blockActive &&
        !unit.dodgeReady &&
        unit.dodgeDisabledForTurns <= 0,
    },
  };
}

function buildRoundTurnOrder(state: BattleState): string[] {
  const sortableUnits = getAllUnits(state).map((unit) => ({
    ...unit,
    currentStats: {
      ...unit.currentStats,
      speed: hasForceActLastEffect(unit)
        ? FORCE_ACT_LAST_SPEED
        : unit.currentStats.speed,
    },
  }));

  return sortTurnOrderBySpeed(sortableUnits).map((unit) => unit.unitId);
}

function processStartOfTurn(state: BattleState, actorUnitId: string): void {
  const actor = getUnitById(state, actorUnitId);

  if (!actor || !actor.isAlive) {
    return;
  }

  for (const effect of actor.activeStatusEffects) {
    const dotDamage = getDamageOverTimeAmount(actor, effect);
    if (dotDamage > 0) {
      applyRawDamage(state, actorUnitId, dotDamage);
    }
  }

  refreshBattleState(state);
}

function resolveSkillDamage(
  state: BattleState,
  actorUnitId: string,
  skill: Skill,
  targets: BattleUnitState[],
  random: () => number,
): { totalDamageDealt: number } {
  const actor = getUnitById(state, actorUnitId);

  if (!actor || !actor.isAlive) {
    return { totalDamageDealt: 0 };
  }

  let totalDamageDealt = 0;
  const hitCount = Math.max(1, skill.damage.hitCount ?? 1);

  for (const target of targets) {
    for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
      const refreshedTarget = getUnitById(state, target.unitId);
      if (!refreshedTarget || !refreshedTarget.isAlive) {
        break;
      }

      totalDamageDealt += resolveHitDamage(
        state,
        actorUnitId,
        refreshedTarget.unitId,
        skill,
        hitIndex === 0,
        random,
      );
    }
  }

  return { totalDamageDealt };
}

function resolveHitDamage(
  state: BattleState,
  actorUnitId: string,
  targetUnitId: string,
  skill: Skill,
  allowReactions: boolean,
  random: () => number,
): number {
  const actor = getUnitById(state, actorUnitId);
  const target = getUnitById(state, targetUnitId);

  if (!actor || !target || !actor.isAlive || !target.isAlive) {
    return 0;
  }

  if (allowReactions && target.dodgeReady) {
    const dodgeSucceeded = random() < state.rules.dodgeSuccessRate;
    target.dodgeReady = false;

    if (dodgeSucceeded) {
      addCombatLog(
        state,
        actorUnitId,
        [targetUnitId],
        getActionTypeFromSkill(skill),
        `${target.name} dodges ${actor.name}'s ${skill.name}.`,
      );
      refreshBattleState(state);
      return 0;
    }
  }

  const isCritical = rollCriticalHit(state, actor, random);
  const damageTakenReductionPercent = getDamageTakenReductionPercent(state, target);
  const blocked = allowReactions && target.blockActive;
  const damageBeforeReduction = calculateDamage({
    baseDamage: skill.damage.baseDamage,
    attackerElement: actor.element,
    defenderElement: target.element,
    isCritical,
    isBlocked: blocked,
  });
  const reducedDamage = Math.max(
    0,
    damageBeforeReduction * (1 - damageTakenReductionPercent / 100),
  );
  const finalDamage = Math.max(0, Math.round(reducedDamage));

  if (blocked) {
    target.blockActive = false;
  }

  const appliedDamage = applyRawDamage(state, targetUnitId, finalDamage);

  addCombatLog(
    state,
    actorUnitId,
    [targetUnitId],
    getActionTypeFromSkill(skill),
    `${actor.name} uses ${skill.name} on ${target.name} for ${appliedDamage} damage${
      isCritical ? " (Critical)" : ""
    }.`,
  );

  refreshBattleState(state);

  return appliedDamage;
}

function resolveSkillEffects(
  state: BattleState,
  actorUnitId: string,
  skill: Skill,
  selectedTargetUnitId: string | undefined,
  totalDamageDealt: number,
  random: () => number,
): { appliedToActorEffectIds: string[] } {
  const actor = getUnitById(state, actorUnitId);

  if (!actor || !actor.isAlive) {
    return { appliedToActorEffectIds: [] };
  }

  const appliedToActorEffectIds: string[] = [];

  skill.effects.forEach((effect, index) => {
    const effectTargets = resolveTargetsForEffect(
      state,
      actor,
      skill,
      effect,
      selectedTargetUnitId,
      random,
    );

    for (const target of effectTargets) {
      if (!target.isAlive && effect.type !== "cleanse" && effect.type !== "dispel") {
        continue;
      }

      if (!rollEffectApplication(effect, random)) {
        continue;
      }

      const appliedEffectId = applySkillEffect(
        state,
        actorUnitId,
        target.unitId,
        effect,
        skill,
        totalDamageDealt,
        index,
      );

      if (appliedEffectId && target.unitId === actorUnitId) {
        appliedToActorEffectIds.push(appliedEffectId);
      }
    }
  });

  refreshBattleState(state);

  return { appliedToActorEffectIds };
}

function applySkillEffect(
  state: BattleState,
  actorUnitId: string,
  targetUnitId: string,
  effect: StatusEffect,
  skill: Skill,
  totalDamageDealt: number,
  effectIndex: number,
): string | undefined {
  const actor = getUnitById(state, actorUnitId);
  const target = getUnitById(state, targetUnitId);

  if (!actor || !target) {
    return undefined;
  }

  switch (effect.type) {
    case "lifesteal": {
      const healAmount = Math.round(totalDamageDealt * getEffectPercent(effect));
      healUnit(target, healAmount);
      addCombatLog(
        state,
        actorUnitId,
        [targetUnitId],
        getActionTypeFromSkill(skill),
        `${target.name} restores ${healAmount} HP from Lifesteal.`,
      );
      return undefined;
    }

    case "energyDrain": {
      const drainedMana = Math.round(target.currentMana * getEffectPercent(effect));
      target.currentMana = clampMana(target.currentMana - drainedMana, target.maxMana);
      addCombatLog(
        state,
        actorUnitId,
        [targetUnitId],
        getActionTypeFromSkill(skill),
        `${target.name} loses ${drainedMana} mana.`,
      );
      return undefined;
    }

    case "energyBoost": {
      const manaGain =
        effect.valueFlat ?? Math.round(target.maxMana * getEffectPercent(effect));
      target.currentMana = clampMana(target.currentMana + manaGain, target.maxMana);
      addCombatLog(
        state,
        actorUnitId,
        [targetUnitId],
        getActionTypeFromSkill(skill),
        `${target.name} gains ${manaGain} mana.`,
      );
      return undefined;
    }

    case "cleanse": {
      target.activeStatusEffects = removeEffectsByCategory(
        target.activeStatusEffects,
        "negative",
        effect.removesEffectCount,
      );
      return undefined;
    }

    case "dispel": {
      target.activeStatusEffects = removeEffectsByCategory(
        target.activeStatusEffects,
        "positive",
        effect.removesEffectCount ?? 1,
      );
      return undefined;
    }

    default: {
      const normalizedEffect = createActiveEffectInstance(
        state,
        effect,
        actorUnitId,
        targetUnitId,
        skill,
        effectIndex,
      );
      upsertStatusEffect(target, normalizedEffect);
      if (normalizedEffect.type === "taunt") {
        target.tauntedByUnitId = actorUnitId;
      }
      return normalizedEffect.id;
    }
  }
}

function applyAfterActionPassives(state: BattleState, actorUnitId: string): void {
  const actor = getUnitById(state, actorUnitId);

  if (!actor || !actor.isAlive) {
    return;
  }

  for (const source of getAllUnits(state)) {
    if (!source.isAlive || source.passiveAbility.category !== "battle") {
      continue;
    }

    if (!passiveTargetsUnit(source, actor, source.passiveAbility.target)) {
      continue;
    }

    for (const effect of source.passiveAbility.effects) {
      if (effect.trigger !== "after-action") {
        continue;
      }

      if (effect.kind === "healing") {
        const healAmount = Math.round(actor.maxHp * (effect.valuePercent / 100));
        healUnit(actor, healAmount);
      }
    }
  }
}

function finalizeTurn(
  state: BattleState,
  actorUnitId: string,
  actionCompleted: boolean,
  skippedEffectIds = new Set<string>(),
  actionType?: BattleActionType,
): BattleState {
  const actor = getUnitById(state, actorUnitId);

  if (actor) {
    if (actionCompleted) {
      actor.hasActedThisRound = true;

      if (actionType !== "block" && actor.dodgeDisabledForTurns > 0) {
        actor.dodgeDisabledForTurns -= 1;
      }

      if (actionType === "block") {
        actor.dodgeDisabledForTurns = Math.max(actor.dodgeDisabledForTurns, 1);
      }
    }

    decrementStatusDurations(actor, skippedEffectIds, state.round);
  }

  refreshBattleState(state);
  checkWinCondition(state);

  if (state.outcome !== "in-progress") {
    return state;
  }

  state.turnOrder = state.turnOrder.filter((unitId) => {
    const unit = getUnitById(state, unitId);
    return unit?.isAlive ?? false;
  });

  if (state.turnOrder[0] === actorUnitId) {
    state.turnOrder.shift();
  } else {
    state.turnOrder = state.turnOrder.filter((unitId) => unitId !== actorUnitId);
  }

  state.activeUnitId = state.turnOrder[0];
  state.phase = state.turnOrder.length > 0 ? "turn" : "round-end";

  return state;
}

function decrementStatusDurations(
  unit: BattleUnitState,
  skippedEffectIds: Set<string>,
  currentRound: number,
): void {
  const remainingEffects: StatusEffect[] = [];

  for (const effect of unit.activeStatusEffects) {
    if (effect.durationTurns === undefined) {
      remainingEffects.push(effect);
      continue;
    }

    if (skippedEffectIds.has(effect.id)) {
      remainingEffects.push(effect);
      continue;
    }

    if (effect.type === "freeze" && effect.actsLastOnRound !== undefined) {
      if (currentRound < effect.actsLastOnRound) {
        remainingEffects.push(effect);
        continue;
      }
    }

    const nextDuration = effect.durationTurns - 1;
    if (nextDuration > 0) {
      remainingEffects.push({
        ...effect,
        durationTurns: nextDuration,
      });
    }
  }

  unit.activeStatusEffects = remainingEffects;
  if (!hasActiveEffect(unit, "taunt")) {
    unit.tauntedByUnitId = undefined;
  }
}

function applyRawDamage(
  state: BattleState,
  targetUnitId: string,
  amount: number,
): number {
  const target = getUnitById(state, targetUnitId);

  if (!target || amount <= 0) {
    return 0;
  }

  let remainingDamage = amount;

  for (const effect of target.activeStatusEffects) {
    if (effect.type !== "shield" || remainingDamage <= 0) {
      continue;
    }

    const shieldValue = effect.valueFlat ?? 0;
    const absorbed = Math.min(shieldValue, remainingDamage);
    effect.valueFlat = shieldValue - absorbed;
    remainingDamage -= absorbed;
  }

  target.activeStatusEffects = target.activeStatusEffects.filter(
    (effect) => effect.type !== "shield" || (effect.valueFlat ?? 0) > 0,
  );

  const hpDamage = Math.min(target.currentHp, remainingDamage);
  target.currentHp -= hpDamage;

  if (target.currentHp <= 0) {
    target.currentHp = 0;
    target.isAlive = false;
    target.dodgeReady = false;
    target.blockActive = false;
  }

  return hpDamage;
}

function resolveTargetsForSkill(
  state: BattleState,
  actor: BattleUnitState,
  targetType: SkillTargetType,
  selectedTargetUnitId: string | undefined,
  random: () => number,
): BattleUnitState[] {
  switch (targetType) {
    case "self":
      return [actor];

    case "all-allies":
      return getLivingAllies(state, actor);

    case "all-enemies":
      return getLivingOpponents(state, actor);

    case "random-enemy": {
      const opponents = getLivingOpponents(state, actor);
      const forcedTargetId = getForcedTargetId(actor, opponents);
      if (forcedTargetId) {
        const forcedTarget = getUnitById(state, forcedTargetId);
        return forcedTarget ? [forcedTarget] : [];
      }

      const target = opponents[Math.floor(random() * opponents.length)];
      return target ? [target] : [];
    }

    case "single-ally":
      return resolveSingleTarget(
        state,
        getLivingAllies(state, actor),
        selectedTargetUnitId,
      );

    case "single-enemy":
    default: {
      const opponents = getLivingOpponents(state, actor);
      const forcedTargetId = getForcedTargetId(actor, opponents);
      return resolveSingleTarget(
        state,
        opponents,
        forcedTargetId ?? selectedTargetUnitId,
      );
    }
  }
}

function resolveSingleTarget(
  state: BattleState,
  validTargets: BattleUnitState[],
  selectedTargetUnitId: string | undefined,
): BattleUnitState[] {
  if (validTargets.length === 0) {
    return [];
  }

  if (selectedTargetUnitId) {
    const target = getUnitById(state, selectedTargetUnitId);
    if (!target || !validTargets.some((unit) => unit.unitId === target.unitId)) {
      throw new Error(`Invalid target "${selectedTargetUnitId}" for this action.`);
    }
    return [target];
  }

  if (validTargets.length === 1) {
    return [validTargets[0]];
  }

  throw new Error("This action requires an explicit target.");
}

function validateActionSelection(
  state: BattleState,
  actor: BattleUnitState,
  action: BattleActionSelection,
): void {
  switch (action.type) {
    case "basicAttack":
      if (!actor.actionAvailability.canBasicAttack) {
        throw new Error(`${actor.name} cannot use a basic attack right now.`);
      }
      break;
    case "skill1":
      if (!actor.actionAvailability.canSkill1) {
        throw new Error(`${actor.name} cannot use Skill 1 right now.`);
      }
      break;
    case "skill2":
      if (!actor.actionAvailability.canSkill2) {
        throw new Error(`${actor.name} cannot use Skill 2 right now.`);
      }
      break;
    case "block":
      if (!actor.actionAvailability.canBlock) {
        throw new Error(`${actor.name} cannot use Block right now.`);
      }
      break;
    case "dodge":
      if (!actor.actionAvailability.canDodge) {
        throw new Error(`${actor.name} cannot use Dodge right now.`);
      }
      break;
  }

  if (state.outcome !== "in-progress") {
    throw new Error("The battle is already over.");
  }
}

function requirePlayerAction(
  actor: BattleUnitState,
  action?: BattleActionSelection,
): BattleActionSelection {
  if (!action) {
    throw new Error(`A player action is required for ${actor.name}'s turn.`);
  }

  return action;
}

function getSkillForAction(
  actor: BattleUnitState,
  actionType: Extract<BattleActionType, "basicAttack" | "skill1" | "skill2">,
): Skill {
  switch (actionType) {
    case "basicAttack":
      return actor.skills.basicAttack;
    case "skill1":
      return actor.skills.skill1;
    case "skill2":
      return actor.skills.skill2;
  }
}

function getActionTypeFromSkill(
  skill: Skill,
): Extract<BattleActionType, "basicAttack" | "skill1" | "skill2"> {
  switch (skill.slot) {
    case "basic":
      return "basicAttack";
    case "skill1":
      return "skill1";
    case "skill2":
      return "skill2";
  }
}

function getAllUnits(state: BattleState): BattleUnitState[] {
  return [...state.playerUnits, ...state.enemyUnits];
}

function getUnitById(
  state: BattleState,
  unitId: string,
): BattleUnitState | undefined {
  return getAllUnits(state).find((unit) => unit.unitId === unitId);
}

function getLivingAllies(
  state: BattleState,
  actor: BattleUnitState,
): BattleUnitState[] {
  return getAllUnits(state).filter(
    (unit) => unit.side === actor.side && unit.isAlive,
  );
}

function getLivingOpponents(
  state: BattleState,
  actor: BattleUnitState,
): BattleUnitState[] {
  return getAllUnits(state).filter(
    (unit) => unit.side !== actor.side && unit.isAlive,
  );
}

function getForcedTargetId(
  actor: BattleUnitState,
  candidates: BattleUnitState[],
): string | undefined {
  const tauntTarget = candidates.find(
    (unit) => unit.isAlive && hasActiveEffect(unit, "taunt"),
  );

  if (!tauntTarget) {
    return undefined;
  }

  return tauntTarget.unitId;
}

function hasActiveEffect(
  unit: BattleUnitState,
  type: StatusEffect["type"],
): boolean {
  return unit.activeStatusEffects.some((effect) => effect.type === type);
}

function hasForceActLastEffect(unit: BattleUnitState): boolean {
  return unit.activeStatusEffects.some(
    (effect) => effect.forcesActLast || effect.type === "freeze",
  );
}

function hasControlLock(unit: BattleUnitState): boolean {
  return unit.activeStatusEffects.some(
    (effect) => effect.preventsAction || effect.type === "stun",
  );
}

function unitCannotAct(unit: BattleUnitState): boolean {
  return !unit.isAlive || hasControlLock(unit);
}

function getDamageOverTimeAmount(
  unit: BattleUnitState,
  effect: StatusEffect,
): number {
  switch (effect.type) {
    case "burn":
      return Math.round(effect.damagePerTurnFlat ?? 0);
    case "poison": {
      const perTurnDamage =
        effect.damagePerTurnFlat ??
        Math.round(unit.maxHp * getEffectPercent(effect));
      return perTurnDamage * Math.max(1, effect.stacks ?? 1);
    }
    default:
      return 0;
  }
}

function getTotalShieldValue(effects: StatusEffect[]): number {
  return effects.reduce((total, effect) => {
    if (effect.type !== "shield") {
      return total;
    }

    return total + Math.max(0, effect.valueFlat ?? 0);
  }, 0);
}

function getPassiveStatModifierPercent(
  allUnits: BattleUnitState[],
  target: BattleUnitState,
  stat: Extract<ModifiableStat, "hp" | "atk" | "def" | "speed">,
): number {
  let total = 0;

  for (const source of allUnits) {
    if (!source.isAlive || source.passiveAbility.category !== "battle") {
      continue;
    }

    if (!passiveTargetsUnit(source, target, source.passiveAbility.target)) {
      continue;
    }

    for (const effect of source.passiveAbility.effects) {
      if (
        (effect.trigger === "battle-start" || effect.trigger === "always-on") &&
        effect.kind === "statModifier" &&
        effect.targetStat === stat
      ) {
        total += effect.valuePercent;
      }
    }
  }

  return total;
}

function getStatusStatModifierPercent(
  unit: BattleUnitState,
  stat: Extract<ModifiableStat, "hp" | "atk" | "def" | "speed">,
): number {
  return unit.activeStatusEffects.reduce((total, effect) => {
    switch (effect.type) {
      case "freeze":
        return stat === "speed" ? total - (effect.valuePercent ?? 30) : total;
      case "shock":
        return stat === "speed" ? total - (effect.valuePercent ?? 50) : total;
      case "atkDown":
        return stat === "atk" ? total - (effect.valuePercent ?? 0) : total;
      case "defDown":
        return stat === "def" ? total - (effect.valuePercent ?? 0) : total;
      case "speedDown":
        return stat === "speed" ? total - (effect.valuePercent ?? 0) : total;
      case "atkUp":
        return stat === "atk" ? total + (effect.valuePercent ?? 0) : total;
      case "defUp":
        return stat === "def" ? total + (effect.valuePercent ?? 0) : total;
      case "speedUp":
        return stat === "speed" ? total + (effect.valuePercent ?? 0) : total;
      default: {
        if (effect.modifiesStat !== stat) {
          return total;
        }

        const rawValue = effect.valuePercent ?? 0;
        if (effect.category === "debuff") {
          return total - Math.abs(rawValue);
        }
        if (effect.category === "buff") {
          return total + Math.abs(rawValue);
        }
        return total + rawValue;
      }
    }
  }, 0);
}

function getDamageTakenReductionPercent(
  state: BattleState,
  target: BattleUnitState,
): number {
  const passiveReduction = getAllUnits(state).reduce((total, source) => {
    if (!source.isAlive || source.passiveAbility.category !== "battle") {
      return total;
    }

    if (!passiveTargetsUnit(source, target, source.passiveAbility.target)) {
      return total;
    }

    return (
      total +
      source.passiveAbility.effects.reduce((effectTotal, effect) => {
        if (
          (effect.trigger === "battle-start" || effect.trigger === "always-on") &&
          effect.kind === "damageTakenModifier"
        ) {
          return effectTotal + effect.valuePercent;
        }

        return effectTotal;
      }, 0)
    );
  }, 0);

  const statusReduction = target.activeStatusEffects.reduce((total, effect) => {
    if (effect.modifiesStat !== "damageTaken") {
      return total;
    }

    const value = effect.valuePercent ?? 0;
    if (effect.category === "debuff") {
      return total - Math.abs(value);
    }
    return total + value;
  }, 0);

  return passiveReduction + statusReduction;
}

function rollCriticalHit(
  state: BattleState,
  actor: BattleUnitState,
  random: () => number,
): boolean {
  const critBonus = getCritChanceBonusPercent(state, actor) / 100;
  const critChance = clampToRange(state.rules.critChance + critBonus, 0, 1);
  const roll = random();

  if (critChance === state.rules.critChance) {
    return calculateCriticalHit(roll);
  }

  return roll < critChance;
}

function getCritChanceBonusPercent(
  state: BattleState,
  target: BattleUnitState,
): number {
  const passiveBonus = getAllUnits(state).reduce((total, source) => {
    if (!source.isAlive || source.passiveAbility.category !== "battle") {
      return total;
    }

    if (!passiveTargetsUnit(source, target, source.passiveAbility.target)) {
      return total;
    }

    return (
      total +
      source.passiveAbility.effects.reduce((effectTotal, effect) => {
        if (
          (effect.trigger === "battle-start" || effect.trigger === "always-on") &&
          effect.kind === "critChanceModifier"
        ) {
          return effectTotal + effect.valuePercent;
        }

        return effectTotal;
      }, 0)
    );
  }, 0);

  const statusBonus = target.activeStatusEffects.reduce((total, effect) => {
    if (effect.modifiesStat !== "critChance") {
      return total;
    }

    const value = effect.valuePercent ?? 0;
    if (effect.category === "debuff") {
      return total - Math.abs(value);
    }
    return total + value;
  }, 0);

  return passiveBonus + statusBonus;
}

function passiveTargetsUnit(
  source: BattleUnitState,
  target: BattleUnitState,
  passiveTarget: BattleUnitState["passiveAbility"]["target"],
): boolean {
  switch (passiveTarget) {
    case "self":
      return source.unitId === target.unitId;
    case "team":
      return source.side === target.side;
    case "enemy":
      return source.side !== target.side;
  }
}

function createActiveEffectInstance(
  state: BattleState,
  effect: StatusEffect,
  actorUnitId: string,
  targetUnitId: string,
  skill: Skill,
  effectIndex: number,
): StatusEffect {
  const normalized = normalizeEffectDefaults(effect);

  return {
    ...normalized,
    actsLastOnRound:
      normalized.type === "freeze"
        ? normalized.actsLastOnRound ?? state.round + 1
        : normalized.actsLastOnRound,
    id: `${skill.id}-${actorUnitId}-${targetUnitId}-${effect.type}-${state.round}-${state.combatLog.length}-${effectIndex}`,
    stacks: normalized.canStack ? normalized.stacks ?? 1 : normalized.stacks,
  };
}

function normalizeEffectDefaults(effect: StatusEffect): StatusEffect {
  switch (effect.type) {
    case "stun":
      return {
        ...effect,
        durationTurns: effect.durationTurns ?? 1,
        preventsAction: effect.preventsAction ?? true,
        canStack: false,
      };
    case "freeze":
      return {
        ...effect,
        durationTurns: effect.durationTurns ?? 1,
        valuePercent: effect.valuePercent ?? 30,
        modifiesStat: effect.modifiesStat ?? "speed",
        forcesActLast: effect.forcesActLast ?? true,
        actsLastOnRound: effect.actsLastOnRound,
        canStack: false,
      };
    case "shock":
      return {
        ...effect,
        durationTurns: effect.durationTurns ?? 2,
        valuePercent: effect.valuePercent ?? 50,
        modifiesStat: effect.modifiesStat ?? "speed",
        refreshesDurationOnReapply: effect.refreshesDurationOnReapply ?? true,
        canStack: false,
      };
    case "burn":
      return {
        ...effect,
        refreshesDurationOnReapply: effect.refreshesDurationOnReapply ?? true,
        canStack: false,
      };
    case "poison":
      return {
        ...effect,
        canStack: effect.canStack ?? true,
        stacks: effect.stacks ?? 1,
      };
    case "taunt":
      return {
        ...effect,
        durationTurns: effect.durationTurns ?? 1,
        canStack: false,
      };
    default:
      return effect;
  }
}

function upsertStatusEffect(target: BattleUnitState, effect: StatusEffect): void {
  if (effect.type === "shield") {
    const shieldEffect: StatusEffect = {
      ...effect,
      valueFlat:
        effect.valueFlat ??
        Math.round(target.maxHp * getEffectPercent(effect)),
    };

    const existingShieldIndex = target.activeStatusEffects.findIndex(
      (activeEffect) =>
        activeEffect.type === "shield" && activeEffect.name === shieldEffect.name,
    );

    if (existingShieldIndex >= 0) {
      target.activeStatusEffects[existingShieldIndex] = {
        ...target.activeStatusEffects[existingShieldIndex],
        ...shieldEffect,
      };
      return;
    }

    target.activeStatusEffects.push(shieldEffect);
    return;
  }

  const existingIndex = target.activeStatusEffects.findIndex(
    (activeEffect) => activeEffect.type === effect.type,
  );

  if (existingIndex < 0) {
    target.activeStatusEffects.push(effect);
    return;
  }

  const existingEffect = target.activeStatusEffects[existingIndex];

  if (effect.canStack) {
    const nextStacks = (existingEffect.stacks ?? 1) + (effect.stacks ?? 1);
    target.activeStatusEffects[existingIndex] = {
      ...existingEffect,
      ...effect,
      stacks:
        effect.maxStacks !== undefined
          ? Math.min(nextStacks, effect.maxStacks)
          : nextStacks,
      durationTurns: effect.durationTurns ?? existingEffect.durationTurns,
    };
    return;
  }

  target.activeStatusEffects[existingIndex] = {
    ...existingEffect,
    ...effect,
    durationTurns:
      effect.refreshesDurationOnReapply || effect.durationTurns !== undefined
        ? effect.durationTurns
        : existingEffect.durationTurns,
  };
}

function removeEffectsByCategory(
  effects: StatusEffect[],
  category: "positive" | "negative",
  removeCount?: number,
): StatusEffect[] {
  let removed = 0;

  return effects.filter((effect) => {
    const matches =
      category === "negative" ? isNegativeEffect(effect) : isPositiveEffect(effect);

    if (!matches) {
      return true;
    }

    if (removeCount === undefined) {
      return false;
    }

    if (removed >= removeCount) {
      return true;
    }

    removed += 1;
    return false;
  });
}

function isNegativeEffect(effect: StatusEffect): boolean {
  return (
    effect.category === "control" ||
    effect.category === "damage-over-time" ||
    effect.category === "debuff"
  );
}

function isPositiveEffect(effect: StatusEffect): boolean {
  return effect.category === "buff" || effect.type === "shield" || effect.type === "taunt";
}

function rollEffectApplication(
  effect: StatusEffect,
  random: () => number,
): boolean {
  if (effect.chance === undefined) {
    return true;
  }

  const chance = effect.chance > 1 ? effect.chance / 100 : effect.chance;
  return random() < chance;
}

function getEffectPercent(effect: StatusEffect): number {
  return (effect.valuePercent ?? 0) / 100;
}

function applyPercentageModifier(baseValue: number, percent: number): number {
  return Math.max(0, Math.round(baseValue * (1 + percent / 100)));
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function healUnit(unit: BattleUnitState, amount: number): void {
  if (amount <= 0 || !unit.isAlive) {
    return;
  }

  unit.currentHp = clampToRange(unit.currentHp + amount, 0, unit.maxHp);
}

function addCombatLog(
  state: BattleState,
  actorUnitId: string,
  targetUnitIds: string[],
  action: BattleActionType,
  description: string,
): void {
  state.combatLog.push({
    id: `log-${state.round}-${state.combatLog.length + 1}`,
    round: state.round,
    actorUnitId,
    targetUnitIds,
    action,
    description,
  });
}

function resolveTargetsForEffect(
  state: BattleState,
  actor: BattleUnitState,
  skill: Skill,
  effect: StatusEffect,
  selectedTargetUnitId: string | undefined,
  random: () => number,
): BattleUnitState[] {
  if (effect.type === "lifesteal") {
    return [actor];
  }

  if (effect.target) {
    return resolveTargetsForSkill(
      state,
      actor,
      effect.target,
      selectedTargetUnitId,
      random,
    );
  }

  if (requiresExplicitSecondaryTarget(effect, skill.target)) {
    throw new Error(
      `Effect "${effect.name}" on skill "${skill.name}" requires an explicit target because it differs from the skill's main target flow.`,
    );
  }

  return resolveTargetsForSkill(
    state,
    actor,
    skill.target,
    selectedTargetUnitId,
    random,
  );
}

function requiresExplicitSecondaryTarget(
  effect: StatusEffect,
  skillTarget: SkillTargetType,
): boolean {
  const enemyTargetedSkill =
    skillTarget === "single-enemy" ||
    skillTarget === "all-enemies" ||
    skillTarget === "random-enemy";

  if (!enemyTargetedSkill) {
    return false;
  }

  return (
    effect.category === "buff" ||
    effect.type === "shield" ||
    effect.type === "energyBoost" ||
    effect.type === "cleanse" ||
    effect.type === "taunt"
  );
}
