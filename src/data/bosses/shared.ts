import type { Character, CharacterArchetype } from "../../types";
import type { Boss, BossCombatProfile, BossRole } from "../../types/boss";

export const DEFAULT_BOSS_MANA_PROFILE: BossCombatProfile["mana"] = {
  start: 150,
  max: 600,
  gainPerRound: 150,
};

const ZERO_STAT_GROWTH = {
  hp: 0,
  atk: 0,
  def: 0,
  speed: 0,
} as const;

export function createBossCombatProfile(
  combat: BossCombatProfile,
): BossCombatProfile {
  return {
    ...combat,
    mana: {
      ...DEFAULT_BOSS_MANA_PROFILE,
      ...combat.mana,
    },
  };
}

export function createBattleReadyBossCharacter(boss: Boss): Character {
  return {
    id: boss.id,
    name: boss.name,
    anime: boss.anime,
    rarity: 5,
    element: boss.element,
    archetype: mapBossRoleToCharacterArchetype(boss.role),
    levelRange: {
      min: boss.combat.level,
      max: boss.combat.level,
    },
    baseStats: boss.combat.stats,
    statGrowth: ZERO_STAT_GROWTH,
    mana: boss.combat.mana,
    passiveAbility: boss.combat.passiveAbility,
    skills: boss.combat.skills,
    loreTags: ["boss", boss.difficulty.toLowerCase().replace(/\s+/g, "-")],
    description: boss.description,
  };
}

function mapBossRoleToCharacterArchetype(role: BossRole): CharacterArchetype {
  switch (role) {
    case "Mage":
      return "Support";
    case "Controller":
      return "Utility";
    default:
      return role;
  }
}
