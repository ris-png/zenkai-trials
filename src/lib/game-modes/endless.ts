import type { BattleParticipantInput } from "../battle/engine";
import type { BattleState } from "../../types/battle";
import type { Character } from "../../types/character";
import { applyCharacterModifiers } from "./shared";

const ENDLESS_BASE_REWARD_DROP_PERCENT = 2;
const ENDLESS_HEAL_PERCENT = 0.2;
const ENDLESS_DIFFICULTY_STEP = 0.08;

export type EndlessRunStatus =
  | "in-encounter"
  | "between-encounters"
  | "defeated"
  | "exited";

export interface EndlessRewardEntry {
  encounterNumber: number;
  dropChancePercent: number;
  summary: string;
}

export interface EndlessPlayerState {
  character: Character;
  unitId: string;
  currentHp: number;
  currentMana: number;
}

export interface EndlessRunState {
  status: EndlessRunStatus;
  encounterNumber: number;
  encountersCleared: number;
  difficultyMultiplier: number;
  players: EndlessPlayerState[];
  currentBoss: Character;
  rewards: EndlessRewardEntry[];
  runMessage: string;
  lastEncounterOutcome?: BattleState["outcome"];
}

export interface EndlessEncounterSetup {
  players: BattleParticipantInput[];
  boss: BattleParticipantInput;
}

export function initializeEndlessRun(
  team: Character[],
  bossPool: Character[],
): EndlessRunState {
  if (team.length < 1 || team.length > 3) {
    throw new Error("Endless Mode requires between 1 and 3 player characters.");
  }

  const encounterNumber = 1;

  return {
    status: "in-encounter",
    encounterNumber,
    encountersCleared: 0,
    difficultyMultiplier: getEndlessDifficultyMultiplier(encounterNumber),
    players: team.map((character, index) => ({
      character,
      unitId: `player-${character.id}-${index + 1}`,
      currentHp: character.baseStats.hp,
      currentMana: character.mana.max,
    })),
    currentBoss: createScaledEndlessBoss(
      pickEndlessBoss(bossPool, team, encounterNumber),
      getEndlessDifficultyMultiplier(encounterNumber),
    ),
    rewards: [],
    runMessage: "Encounter 1 is live. Mana carries over after each win.",
  };
}

export function getEndlessEncounterSetup(
  run: EndlessRunState,
): EndlessEncounterSetup {
  return {
    players: run.players.map((player) => ({
      character: player.character,
      unitId: player.unitId,
      currentHp: player.currentHp,
      currentMana: player.currentMana,
    })),
    boss: {
      character: run.currentBoss,
      unitId: `enemy-${run.currentBoss.id}-${run.encounterNumber}`,
    },
  };
}

export function completeEndlessEncounter(
  run: EndlessRunState,
  battleState: BattleState,
  bossPool: Character[],
): EndlessRunState {
  if (battleState.outcome === "enemy-victory") {
    return {
      ...run,
      status: "defeated",
      lastEncounterOutcome: battleState.outcome,
      players: syncPlayersFromBattle(run.players, battleState, false),
      runMessage: `The run ends on encounter ${run.encounterNumber}. All player characters were defeated.`,
    };
  }

  const healedPlayers = syncPlayersFromBattle(run.players, battleState, true);
  const nextEncounterNumber = run.encounterNumber + 1;
  const nextDifficultyMultiplier = getEndlessDifficultyMultiplier(nextEncounterNumber);
  const reward: EndlessRewardEntry = {
    encounterNumber: run.encounterNumber,
    dropChancePercent: ENDLESS_BASE_REWARD_DROP_PERCENT,
    summary: `Encounter ${run.encounterNumber} cleared. Endless reward roll: ${ENDLESS_BASE_REWARD_DROP_PERCENT}% card chance.`,
  };

  return {
    ...run,
    status: "between-encounters",
    encounterNumber: nextEncounterNumber,
    encountersCleared: run.encountersCleared + 1,
    difficultyMultiplier: nextDifficultyMultiplier,
    players: healedPlayers,
    currentBoss: createScaledEndlessBoss(
      pickEndlessBoss(
        bossPool,
        healedPlayers.map((player) => player.character),
        nextEncounterNumber,
      ),
      nextDifficultyMultiplier,
    ),
    rewards: [...run.rewards, reward],
    lastEncounterOutcome: battleState.outcome,
    runMessage: `Encounter ${run.encountersCleared + 1} cleared. Living allies recovered 20% HP and kept their mana.`,
  };
}

export function continueEndlessRun(run: EndlessRunState): EndlessRunState {
  return {
    ...run,
    status: "in-encounter",
    runMessage: `Encounter ${run.encounterNumber} is live.`,
  };
}

export function exitEndlessRun(run: EndlessRunState): EndlessRunState {
  return {
    ...run,
    status: "exited",
    runMessage: `Endless Mode exited after ${run.encountersCleared} cleared encounter${run.encountersCleared === 1 ? "" : "s"}.`,
  };
}

export function getEndlessDifficultyMultiplier(encounterNumber: number): number {
  return Number(
    (1 + Math.max(0, encounterNumber - 1) * ENDLESS_DIFFICULTY_STEP).toFixed(2),
  );
}

export function getEndlessStatusLabel(status: EndlessRunStatus): string {
  switch (status) {
    case "between-encounters":
      return "Between Encounters";
    case "defeated":
      return "Defeated";
    case "exited":
      return "Exited";
    default:
      return "In Encounter";
  }
}

function syncPlayersFromBattle(
  previousPlayers: EndlessPlayerState[],
  battleState: BattleState,
  healLivingPlayers: boolean,
): EndlessPlayerState[] {
  return previousPlayers.map((player) => {
    const battleUnit = battleState.playerUnits.find(
      (unit) => unit.unitId === player.unitId,
    );

    if (!battleUnit) {
      return player;
    }

    const healedHp =
      healLivingPlayers && battleUnit.isAlive
        ? Math.min(
            battleUnit.maxHp,
            battleUnit.currentHp + Math.round(battleUnit.maxHp * ENDLESS_HEAL_PERCENT),
          )
        : battleUnit.currentHp;

    return {
      ...player,
      currentHp: healedHp,
      currentMana: battleUnit.currentMana,
    };
  });
}

function pickEndlessBoss(
  bossPool: Character[],
  team: Character[],
  encounterNumber: number,
): Character {
  const availableBosses = bossPool.filter(
    (boss) => !team.some((character) => character.id === boss.id),
  );
  const sourcePool = availableBosses.length > 0 ? availableBosses : bossPool;
  const bossIndex = (encounterNumber - 1) % sourcePool.length;

  return sourcePool[bossIndex];
}

function createScaledEndlessBoss(
  boss: Character,
  difficultyMultiplier: number,
): Character {
  return applyCharacterModifiers(boss, {
    hpMultiplier: difficultyMultiplier,
    atkMultiplier: difficultyMultiplier,
    defMultiplier: difficultyMultiplier,
    speedMultiplier: difficultyMultiplier,
    manaMultiplier: difficultyMultiplier,
    damageMultiplier: difficultyMultiplier,
  });
}
