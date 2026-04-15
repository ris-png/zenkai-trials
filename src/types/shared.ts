export type CharacterRarity = 3 | 4 | 5;

export type Element =
  | "Earth"
  | "Water"
  | "Fire"
  | "Air"
  | "Lightning"
  | "Light"
  | "Dark";

export type CharacterArchetype =
  | "Fighter"
  | "Tank"
  | "Assassin"
  | "Support"
  | "Balanced"
  | "Utility";

export type PassiveTarget = "self" | "team" | "enemy";

export type UnitSide = "player" | "enemy";

export type SkillSlot = "basic" | "skill1" | "skill2";

export type SkillTargetType =
  | "self"
  | "single-ally"
  | "all-allies"
  | "single-enemy"
  | "all-enemies"
  | "random-enemy";

export type EffectCategory =
  | "control"
  | "damage-over-time"
  | "buff"
  | "debuff"
  | "utility";

export type ModifiableStat =
  | "hp"
  | "atk"
  | "def"
  | "speed"
  | "critChance"
  | "damageTaken"
  | "mana"
  | "xpGain";

export interface CharacterStats {
  hp: number;
  atk: number;
  def: number;
  speed: number;
}

export interface ManaProfile {
  start: number;
  max: number;
  gainPerRound?: number;
}

export interface LevelRange {
  min: number;
  max: number;
}
