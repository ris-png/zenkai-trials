import type { Boss, BossDifficulty, BossGameMode } from "../../types/boss";
import { adventureBosses } from "./adventure";
import { dailyBosses } from "./daily";

export * from "./adventure";
export * from "./daily";
export * from "./shared";

export const allBosses: Boss[] = [...dailyBosses, ...adventureBosses];

export const bossesById: Record<string, Boss> = Object.fromEntries(
  allBosses.map((boss) => [boss.id, boss]),
);

export function getBossesForMode(mode: BossGameMode): Boss[] {
  return allBosses.filter((boss) =>
    boss.gameModeAssignments.some((assignment) => assignment.mode === mode),
  );
}

export function getDailyBossForDifficulty(
  difficulty: Extract<BossDifficulty, "Easy" | "Normal" | "Hard">,
): Boss | undefined {
  return dailyBosses.find((boss) =>
    boss.gameModeAssignments.some(
      (assignment) =>
        assignment.mode === "daily" && assignment.difficulty === difficulty,
    ),
  );
}

export function getAdventureBossForFloor(floor: number): Boss | undefined {
  const eligibleBosses = adventureBosses
    .filter((boss) =>
      boss.gameModeAssignments.some(
        (assignment) =>
          assignment.mode === "adventure" &&
          assignment.floor !== undefined &&
          assignment.floor <= floor,
      ),
    )
    .sort((left, right) => {
      const leftFloor = getAssignedAdventureFloor(left);
      const rightFloor = getAssignedAdventureFloor(right);
      return rightFloor - leftFloor;
    });

  return eligibleBosses[0] ?? adventureBosses[0];
}

function getAssignedAdventureFloor(boss: Boss): number {
  return (
    boss.gameModeAssignments.find(
      (assignment) =>
        assignment.mode === "adventure" && assignment.floor !== undefined,
    )?.floor ?? 0
  );
}
