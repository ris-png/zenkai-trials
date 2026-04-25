import type { BattleParticipantInput } from "../battle/engine";
import type { Character } from "../../types/character";
import type { Element } from "../../types/shared";
import { applyCharacterModifiers } from "./shared";

export type DailyDungeonDifficulty = "Easy" | "Normal" | "Hard";

const DAILY_ELEMENT_ROTATION: Element[] = [
  "Dark",
  "Earth",
  "Water",
  "Fire",
  "Air",
  "Lightning",
  "Light",
];

export interface DailyDungeonState {
  boostedElement: Element;
  boostPercent: number;
  weekendBonusActive: boolean;
  cardDropRates: {
    easy: number;
    normal: number;
    hard: number;
  };
  currentDifficultyLabel: DailyDungeonDifficulty;
  currentDropRate: number;
}

export interface DailyEncounterSetup {
  players: BattleParticipantInput[];
  boss: BattleParticipantInput;
  state: DailyDungeonState;
}

export function getDailyDungeonState(
  date = new Date(),
  difficulty: DailyDungeonDifficulty = "Normal",
): DailyDungeonState {
  const dayIndex = date.getDay();
  const boostedElement = DAILY_ELEMENT_ROTATION[dayIndex];
  const weekendBonusActive = dayIndex === 0 || dayIndex === 6;
  const baseDropRates = {
    easy: 2.5,
    normal: 4.5,
    hard: 6.5,
  };

  const multiplier = weekendBonusActive ? 2 : 1;

  return {
    boostedElement,
    boostPercent: 15,
    weekendBonusActive,
    cardDropRates: {
      easy: baseDropRates.easy * multiplier,
      normal: baseDropRates.normal * multiplier,
      hard: baseDropRates.hard * multiplier,
    },
    currentDifficultyLabel: difficulty,
    currentDropRate:
      baseDropRates[difficulty.toLowerCase() as Lowercase<DailyDungeonDifficulty>] *
      multiplier,
  };
}

export function createDailyEncounterSetup(
  players: Character[],
  boss: Character,
  date = new Date(),
  difficulty: DailyDungeonDifficulty = "Normal",
): DailyEncounterSetup {
  const state = getDailyDungeonState(date, difficulty);

  return {
    players: players.map((character) => ({
      character: applyDailyBoostIfNeeded(character, state),
    })),
    boss: {
      character: applyDailyBoostIfNeeded(boss, state),
    },
    state,
  };
}

function applyDailyBoostIfNeeded(
  character: Character,
  state: DailyDungeonState,
): Character {
  if (character.element !== state.boostedElement) {
    return character;
  }

  const boostMultiplier = 1 + state.boostPercent / 100;

  return applyCharacterModifiers(character, {
    hpMultiplier: boostMultiplier,
    manaMultiplier: boostMultiplier,
    damageMultiplier: boostMultiplier,
  });
}
