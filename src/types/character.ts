import type { StatusEffect } from "./effects";
import type {
  CharacterArchetype,
  CharacterRarity,
  CharacterStats,
  Element,
  LevelRange,
  ManaProfile,
  ModifiableStat,
  PassiveTarget,
  SkillSlot,
  SkillTargetType,
} from "./shared";

export type PassiveCategory = "battle" | "reward";

export type PassiveTrigger =
  | "battle-start"
  | "always-on"
  | "after-action"
  | "post-battle";

export type PassiveEffectKind =
  | "statModifier"
  | "damageTakenModifier"
  | "critChanceModifier"
  | "manaModifier"
  | "xpGainModifier"
  | "healing";

export interface PassiveEffect {
  kind: PassiveEffectKind;
  trigger: PassiveTrigger;
  targetStat?: ModifiableStat;
  valuePercent: number;
  description?: string;
}

export interface PassiveAbility {
  id: string;
  name: string;
  category: PassiveCategory;
  target: PassiveTarget;
  effect: string;
  effects: PassiveEffect[];
}

export interface DamageProfile {
  baseDamage: number;
  hitCount?: number;
  isAreaOfEffect?: boolean;
  ignoresDefensePercent?: number;
}

export interface Skill {
  id: string;
  slot: SkillSlot;
  name: string;
  manaCost: number;
  target: SkillTargetType;
  damage: DamageProfile;
  effects: StatusEffect[];
  description?: string;
}

export interface CharacterSkillSet {
  basicAttack: Skill & { slot: "basic"; manaCost: 0 };
  skill1: Skill & { slot: "skill1" };
  skill2: Skill & { slot: "skill2" };
}

export interface Character {
  id: string;
  name: string;
  anime: string;
  rarity: CharacterRarity;
  element: Element;
  archetype: CharacterArchetype;
  levelRange: LevelRange;
  baseStats: CharacterStats;
  statGrowth: CharacterStats;
  mana: ManaProfile;
  passiveAbility: PassiveAbility;
  skills: CharacterSkillSet;
  loreTags?: string[];
  description?: string;
}
