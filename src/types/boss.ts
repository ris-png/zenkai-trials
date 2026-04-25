import type { CharacterSkillSet, PassiveAbility } from "./character";
import type { StatusEffect } from "./effects";
import type { CharacterStats, Element, ManaProfile } from "./shared";

export type BossDifficulty =
  | "Easy"
  | "Normal"
  | "Hard"
  | "Floor Boss"
  | "Final Boss"
  | "Custom";

export type BossRole =
  | "Fighter"
  | "Tank"
  | "Assassin"
  | "Mage"
  | "Controller"
  | "Balanced";

export type BossGameMode = "adventure" | "daily" | "endless" | "custom";

export interface BossEncounterAssignment {
  mode: BossGameMode;
  difficulty?: BossDifficulty;
  floor?: number;
  stageId?: string;
  stageLabel?: string;
}

export interface BossEncounterEffect {
  id: string;
  name: string;
  effect: string;
  triggerCondition?: string;
  description?: string;
  effects?: StatusEffect[];
}

export interface BossCombatProfile {
  level: number;
  stats: CharacterStats;
  mana: ManaProfile;
  passiveAbility: PassiveAbility;
  skills: CharacterSkillSet;
}

export interface Boss {
  id: string;
  name: string;
  anime: string;
  element: Element;
  difficulty: BossDifficulty;
  role: BossRole;
  assetPath: string;
  gameModeAssignments: BossEncounterAssignment[];
  combat: BossCombatProfile;
  encounterEffect?: BossEncounterEffect;
  description?: string;
}
