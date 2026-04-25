import type { Character, CharacterSkillSet, Skill } from "../../types/character";

interface CharacterModifierConfig {
  hpMultiplier?: number;
  atkMultiplier?: number;
  defMultiplier?: number;
  speedMultiplier?: number;
  manaMultiplier?: number;
  damageMultiplier?: number;
}

export function applyCharacterModifiers(
  character: Character,
  {
    hpMultiplier = 1,
    atkMultiplier = 1,
    defMultiplier = 1,
    speedMultiplier = 1,
    manaMultiplier = 1,
    damageMultiplier = 1,
  }: CharacterModifierConfig,
): Character {
  return {
    ...character,
    baseStats: {
      hp: scaleValue(character.baseStats.hp, hpMultiplier),
      atk: scaleValue(character.baseStats.atk, atkMultiplier),
      def: scaleValue(character.baseStats.def, defMultiplier),
      speed: scaleValue(character.baseStats.speed, speedMultiplier),
    },
    statGrowth: {
      hp: scaleValue(character.statGrowth.hp, hpMultiplier),
      atk: scaleValue(character.statGrowth.atk, atkMultiplier),
      def: scaleValue(character.statGrowth.def, defMultiplier),
      speed: scaleValue(character.statGrowth.speed, speedMultiplier),
    },
    mana: {
      ...character.mana,
      start: scaleValue(character.mana.start, manaMultiplier),
      max: scaleValue(character.mana.max, manaMultiplier),
    },
    skills: scaleSkillSet(character.skills, damageMultiplier),
  };
}

function scaleSkillSet(skills: CharacterSkillSet, damageMultiplier: number): CharacterSkillSet {
  return {
    basicAttack: scaleSkillDamage(skills.basicAttack, damageMultiplier) as CharacterSkillSet["basicAttack"],
    skill1: scaleSkillDamage(skills.skill1, damageMultiplier) as CharacterSkillSet["skill1"],
    skill2: scaleSkillDamage(skills.skill2, damageMultiplier) as CharacterSkillSet["skill2"],
  };
}

function scaleSkillDamage(skill: Skill, damageMultiplier: number): Skill {
  return {
    ...skill,
    damage: {
      ...skill.damage,
      baseDamage: scaleValue(skill.damage.baseDamage, damageMultiplier),
    },
  };
}

function scaleValue(value: number, multiplier: number): number {
  return Math.max(1, Math.round(value * multiplier));
}
