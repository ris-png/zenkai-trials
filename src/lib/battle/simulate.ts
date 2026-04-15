import { charactersById } from "../../data/characters";
import type { BattleState, BattleUnitState } from "../../types/battle";
import type { StatusEffect } from "../../types/effects";
import {
  initializeBattle,
  resolveTurn,
  startRound,
  type BattleActionSelection,
  type BattleParticipantInput,
} from "./engine";

interface SimulationScenario {
  name: string;
  seed: number;
  players: BattleParticipantInput[];
  boss: BattleParticipantInput;
}

interface UnitSnapshot {
  hp: number;
  mana: number;
  shield: number;
  statuses: Record<string, string>;
}

export interface BattleSimulationResult {
  scenarioName: string;
  winner: BattleState["outcome"];
  logLines: string[];
  finalState: BattleState;
}

const DEFAULT_MAX_ROUNDS = 25;

/**
 * Example:
 * `printDevelopmentBattleSimulations();`
 */
export function printDevelopmentBattleSimulations(): void {
  const results = runDevelopmentBattleSimulations();

  for (const result of results) {
    console.log(result.logLines.join("\n"));
    console.log("");
  }
}

export function runDevelopmentBattleSimulations(): BattleSimulationResult[] {
  const scenarios = getDefaultSimulationScenarios();

  return scenarios.map((scenario) => simulateBattleScenario(scenario));
}

export function simulateBattleScenario(
  scenario: SimulationScenario,
): BattleSimulationResult {
  const random = createSeededRandom(scenario.seed);
  const logLines: string[] = [];

  let state = initializeBattle({
    battleId: slugifyScenarioName(scenario.name),
    players: scenario.players,
    boss: scenario.boss,
  });

  logLines.push(`=== ${scenario.name} ===`);
  logLines.push(
    `Players: ${scenario.players.map((entry) => entry.character.name).join(", ")}`,
  );
  logLines.push(`Boss: ${scenario.boss.character.name}`);
  logLines.push("");

  for (let round = 1; round <= DEFAULT_MAX_ROUNDS; round += 1) {
    if (state.outcome !== "in-progress") {
      break;
    }

    state = startRound(state);

    if (state.outcome !== "in-progress") {
      break;
    }

    logLines.push(`-- Round ${state.round} --`);
    logLines.push(
      `Turn Order: ${state.turnOrder
        .map((unitId) => formatTurnOrderEntry(requireUnit(state, unitId)))
        .join(" -> ")}`,
    );
    logLines.push(`State: ${formatSideSummary(state.playerUnits)} || ${formatSideSummary(state.enemyUnits)}`);

    while (state.phase === "turn" && state.outcome === "in-progress") {
      const activeUnit = requireUnit(state, state.activeUnitId);
      const action =
        activeUnit.side === "player"
          ? choosePlayerAction(state, activeUnit)
          : undefined;

      const turnHeader = formatTurnHeader(state, activeUnit, action);
      const beforeSnapshot = snapshotUnits(state);
      const previousLogCount = state.combatLog.length;

      state = resolveTurn(state, action, { random });

      logLines.push(turnHeader);
      logLines.push(
        ...formatCombatLogDelta(state, previousLogCount),
        ...formatStateDelta(beforeSnapshot, state),
      );
    }

    logLines.push(`Round ${state.round} End: ${formatSideSummary(state.playerUnits)} || ${formatSideSummary(state.enemyUnits)}`);
    logLines.push("");
  }

  if (state.outcome === "in-progress") {
    logLines.push(`Winner: None (stopped after ${DEFAULT_MAX_ROUNDS} rounds)`);
  } else {
    logLines.push(`Winner: ${formatOutcome(state.outcome)}`);
  }

  return {
    scenarioName: scenario.name,
    winner: state.outcome,
    logLines,
    finalState: state,
  };
}

function getDefaultSimulationScenarios(): SimulationScenario[] {
  return [
    {
      name: "1v1 Demo: Ulquiorra vs Shion",
      seed: 101,
      players: [createParticipant("ulquiorra-cifer")],
      boss: createParticipant("shion"),
    },
    {
      name: "3v1 Demo: Maki, Geto, Rimuru vs Gojo",
      seed: 202,
      players: [
        createParticipant("maki-zenin"),
        createParticipant("geto-suguru"),
        createParticipant("rimuru-tempest"),
      ],
      boss: createParticipant("gojo-satoru"),
    },
  ];
}

function createParticipant(characterId: string): BattleParticipantInput {
  const character = charactersById[characterId];

  if (!character) {
    throw new Error(`Character "${characterId}" is not defined in the data layer.`);
  }

  return { character };
}

function choosePlayerAction(
  state: BattleState,
  actor: BattleUnitState,
): BattleActionSelection {
  const target = getLowestHpEnemy(state, actor);

  if (actor.actionAvailability.canSkill2) {
    return { type: "skill2", targetUnitId: target?.unitId };
  }

  if (actor.currentHp / actor.maxHp <= 0.25 && actor.actionAvailability.canDodge) {
    return { type: "dodge" };
  }

  if (actor.currentHp / actor.maxHp <= 0.4 && actor.actionAvailability.canBlock) {
    return { type: "block" };
  }

  if (actor.actionAvailability.canSkill1) {
    return { type: "skill1", targetUnitId: target?.unitId };
  }

  return { type: "basicAttack", targetUnitId: target?.unitId };
}

function getLowestHpEnemy(
  state: BattleState,
  actor: BattleUnitState,
): BattleUnitState | undefined {
  return [...state.enemyUnits, ...state.playerUnits]
    .filter((unit) => unit.side !== actor.side && unit.isAlive)
    .sort((left, right) => left.currentHp - right.currentHp)[0];
}

function snapshotUnits(state: BattleState): Record<string, UnitSnapshot> {
  return Object.fromEntries(
    [...state.playerUnits, ...state.enemyUnits].map((unit) => [
      unit.unitId,
      {
        hp: unit.currentHp,
        mana: unit.currentMana,
        shield: unit.shield,
        statuses: Object.fromEntries(
          unit.activeStatusEffects.map((effect) => [effect.id, getStatusSignature(effect)]),
        ),
      },
    ]),
  );
}

function formatCombatLogDelta(
  state: BattleState,
  previousLogCount: number,
): string[] {
  return state.combatLog
    .slice(previousLogCount)
    .map((entry) => `  Log: ${entry.description}`);
}

function formatStateDelta(
  beforeSnapshot: Record<string, UnitSnapshot>,
  state: BattleState,
): string[] {
  const lines: string[] = [];

  for (const unit of [...state.playerUnits, ...state.enemyUnits]) {
    const before = beforeSnapshot[unit.unitId];

    if (!before) {
      continue;
    }

    if (before.hp !== unit.currentHp || before.mana !== unit.currentMana) {
      lines.push(
        `  ${unit.name}: HP ${before.hp} -> ${unit.currentHp}, Mana ${before.mana} -> ${unit.currentMana}`,
      );
    }

    if (before.shield !== unit.shield) {
      lines.push(`  ${unit.name}: Shield ${before.shield} -> ${unit.shield}`);
    }

    const currentStatuses = Object.fromEntries(
      unit.activeStatusEffects.map((effect) => [effect.id, getStatusSignature(effect)]),
    );
    const beforeStatusIds = Object.keys(before.statuses);
    const currentStatusIds = Object.keys(currentStatuses);
    const addedStatuses = currentStatusIds.filter(
      (statusId) => !(statusId in before.statuses),
    );
    const removedStatuses = beforeStatusIds.filter(
      (statusId) => !(statusId in currentStatuses),
    );
    const updatedStatuses = currentStatusIds.filter(
      (statusId) =>
        statusId in before.statuses &&
        before.statuses[statusId] !== currentStatuses[statusId],
    );

    for (const statusId of addedStatuses) {
      lines.push(`  ${unit.name}: Status Applied -> ${currentStatuses[statusId]}`);
    }

    for (const statusId of updatedStatuses) {
      lines.push(
        `  ${unit.name}: Status Updated -> ${before.statuses[statusId]} -> ${currentStatuses[statusId]}`,
      );
    }

    for (const statusId of removedStatuses) {
      lines.push(`  ${unit.name}: Status Removed -> ${before.statuses[statusId]}`);
    }
  }

  return lines.length > 0 ? lines : ["  No visible state changes."];
}

function formatTurnHeader(
  state: BattleState,
  actor: BattleUnitState,
  action?: BattleActionSelection,
): string {
  if (!action) {
    return `${actor.name}'s turn (${actor.currentHp}/${actor.maxHp} HP, ${actor.currentMana}/${actor.maxMana} Mana)`;
  }

  const targetName = action.targetUnitId
    ? requireUnit(state, action.targetUnitId).name
    : "no target";

  return `${actor.name}'s turn (${actor.currentHp}/${actor.maxHp} HP, ${actor.currentMana}/${actor.maxMana} Mana) -> ${action.type}${
    action.targetUnitId ? ` on ${targetName}` : ""
  }`;
}

function formatTurnOrderEntry(unit: BattleUnitState): string {
  return `${unit.name}(${unit.currentStats.speed} SPD)`;
}

function formatSideSummary(units: BattleUnitState[]): string {
  return units
    .map(
      (unit) =>
        `${unit.name} HP ${unit.currentHp}/${unit.maxHp} Mana ${unit.currentMana}/${unit.maxMana}${
          unit.activeStatusEffects.length > 0
            ? ` [${unit.activeStatusEffects.map(formatShortStatus).join(", ")}]`
            : ""
        }`,
    )
    .join(" | ");
}

function formatShortStatus(effect: StatusEffect): string {
  if (effect.durationTurns !== undefined) {
    return `${effect.name}(${effect.durationTurns})`;
  }

  if (effect.valueFlat !== undefined && effect.type === "shield") {
    return `${effect.name}(${effect.valueFlat})`;
  }

  return effect.name;
}

function getStatusSignature(effect: StatusEffect): string {
  const details: string[] = [];

  if (effect.durationTurns !== undefined) {
    details.push(`${effect.durationTurns} turn`);
  }

  if (effect.stacks !== undefined) {
    details.push(`${effect.stacks} stack`);
  }

  if (effect.valuePercent !== undefined) {
    details.push(`${effect.valuePercent}%`);
  }

  if (effect.valueFlat !== undefined) {
    details.push(`${effect.valueFlat}`);
  }

  return details.length > 0
    ? `${effect.name} (${details.join(", ")})`
    : effect.name;
}

function requireUnit(state: BattleState, unitId?: string): BattleUnitState {
  if (!unitId) {
    throw new Error("Expected an active unit id.");
  }

  const unit = [...state.playerUnits, ...state.enemyUnits].find(
    (entry) => entry.unitId === unitId,
  );

  if (!unit) {
    throw new Error(`Unit "${unitId}" was not found in battle state.`);
  }

  return unit;
}

function formatOutcome(outcome: BattleState["outcome"]): string {
  switch (outcome) {
    case "player-victory":
      return "Player Victory";
    case "enemy-victory":
      return "Boss Victory";
    default:
      return "In Progress";
  }
}

function slugifyScenarioName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createSeededRandom(seed: number): () => number {
  let current = seed >>> 0;

  return () => {
    current += 0x6d2b79f5;
    let result = current;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

printDevelopmentBattleSimulations();
