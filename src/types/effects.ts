import type {
  EffectCategory,
  ModifiableStat,
  SkillTargetType,
} from "./shared";

export type StatusEffectType =
  | "stun"
  | "burn"
  | "freeze"
  | "shock"
  | "poison"
  | "atkDown"
  | "defDown"
  | "speedDown"
  | "atkUp"
  | "defUp"
  | "speedUp"
  | "shield"
  | "lifesteal"
  | "energyDrain"
  | "energyBoost"
  | "taunt"
  | "cleanse"
  | "dispel";

export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  name: string;
  category: EffectCategory;
  target?: SkillTargetType;
  durationTurns?: number;
  chance?: number;
  maxStacks?: number;
  stacks?: number;
  modifiesStat?: ModifiableStat;
  valuePercent?: number;
  valueFlat?: number;
  damagePerTurnFlat?: number;
  damagePerTurnPercentMaxHp?: number;
  preventsAction?: boolean;
  forcesActLast?: boolean;
  actsLastOnRound?: number;
  refreshesDurationOnReapply?: boolean;
  canStack?: boolean;
  removesNegativeEffects?: boolean;
  removesPositiveEffects?: boolean;
  removesEffectCount?: number;
  description?: string;
}
