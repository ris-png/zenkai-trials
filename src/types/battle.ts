import type { CharacterSkillSet, PassiveAbility } from "./character";
import type { StatusEffect } from "./effects";
import type { CharacterStats, Element, UnitSide } from "./shared";

export type BattlePhase =
  | "setup"
  | "passives"
  | "round-start"
  | "turn"
  | "round-end"
  | "finished";

export type BattleOutcome = "in-progress" | "player-victory" | "enemy-victory";

export type BattleActionType =
  | "basicAttack"
  | "skill1"
  | "skill2"
  | "block"
  | "dodge";

export interface ElementMatchup {
  attacker: Element;
  defender: Element;
  multiplier: number;
}

export interface BattleRules {
  playerTeamSize: {
    min: number;
    max: number;
  };
  enemyTeamSize: number;
  manaGainPerRound: number;
  maxMana: number;
  critChance: number;
  critMultiplier: number;
  dodgeSuccessRate: number;
  blockDamageMultiplier: number;
  speedTieBreaker: "player-first";
  elementalMatchups: ElementMatchup[];
}

export interface BattleActionAvailability {
  canBasicAttack: boolean;
  canSkill1: boolean;
  canSkill2: boolean;
  canBlock: boolean;
  canDodge: boolean;
}

export interface BattleLogEntry {
  id: string;
  round: number;
  actorUnitId: string;
  targetUnitIds: string[];
  action: BattleActionType;
  description: string;
}

export interface BattleUnitState {
  unitId: string;
  characterId: string;
  side: UnitSide;
  isBoss: boolean;
  level: number;
  name: string;
  element: Element;
  baseStats: CharacterStats;
  currentStats: CharacterStats;
  maxHp: number;
  currentHp: number;
  maxMana: number;
  currentMana: number;
  passiveAbility: PassiveAbility;
  skills: CharacterSkillSet;
  activeStatusEffects: StatusEffect[];
  shield: number;
  isAlive: boolean;
  hasActedThisRound: boolean;
  blockActive: boolean;
  dodgeReady: boolean;
  dodgeDisabledForTurns: number;
  tauntedByUnitId?: string;
  actionAvailability: BattleActionAvailability;
}

export interface BattleState {
  id: string;
  round: number;
  phase: BattlePhase;
  outcome: BattleOutcome;
  playerUnits: BattleUnitState[];
  enemyUnits: BattleUnitState[];
  turnOrder: string[];
  activeUnitId?: string;
  rules: BattleRules;
  combatLog: BattleLogEntry[];
}
