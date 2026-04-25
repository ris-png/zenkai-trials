"use client";

import { useState } from "react";
import {
  createBattleReadyBossCharacter,
  getAdventureBossForFloor,
  getBossesForMode,
  getDailyBossForDifficulty,
} from "../../data/bosses";
import { allCharacters } from "../../data/characters";
import type { BattleParticipantInput } from "../../lib/battle/engine";
import {
  createDailyEncounterSetup,
  getDailyDungeonState,
  type DailyDungeonDifficulty,
  type EndlessRunState,
} from "../../lib/game-modes";
import type { BattleState } from "../../types/battle";
import type { Character } from "../../types/character";
import { BattleScreen } from "./battle-screen";
import { BossShowcase, CharacterCard } from "./cards";
import { EndlessRunScreen } from "./endless-run-screen";

type AppScreen =
  | "home"
  | "modes"
  | "team"
  | "battle"
  | "result"
  | "collection";

type GameModeId = "adventure" | "daily" | "endless";

interface GameModeOption {
  id: GameModeId;
  name: string;
  difficulty: string;
  description: string;
}

const gameModes: GameModeOption[] = [
  {
    id: "adventure",
    name: "Adventure Trial",
    difficulty: "Starter",
    description: "A floor-based boss encounter that pulls from the adventure boss roster.",
  },
  {
    id: "daily",
    name: "Daily Rift",
    difficulty: "Standard",
    description: "A balanced encounter for quick repeat battles and testing teams.",
  },
  {
    id: "endless",
    name: "Endless Summit",
    difficulty: "Hard",
    description: "A tougher boss assignment meant for stronger three-unit squads.",
  },
];
const ADVENTURE_FLOOR_OPTIONS = [50, 100] as const;

export function TrialsApp() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [selectedModeId, setSelectedModeId] = useState<GameModeId | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedAdventureFloor, setSelectedAdventureFloor] =
    useState<(typeof ADVENTURE_FLOOR_OPTIONS)[number]>(50);
  const [selectedDailyDifficulty, setSelectedDailyDifficulty] =
    useState<DailyDungeonDifficulty>("Normal");
  const [activeEncounter, setActiveEncounter] = useState<{
    players: BattleParticipantInput[];
    boss: BattleParticipantInput;
  } | null>(null);
  const [activeBossPreview, setActiveBossPreview] = useState<Character | null>(null);
  const [latestBattle, setLatestBattle] = useState<BattleState | null>(null);
  const [latestEndlessRun, setLatestEndlessRun] = useState<EndlessRunState | null>(
    null,
  );

  const selectedMode =
    gameModes.find((mode) => mode.id === selectedModeId) ?? gameModes[0];
  const selectedTeam = allCharacters.filter((character) =>
    selectedTeamIds.includes(character.id),
  );
  const previewBoss = getPreviewBossCharacter(
    selectedMode.id,
    selectedAdventureFloor,
    selectedDailyDifficulty,
  );
  const featuredCharacters = allCharacters.slice(0, 3);
  const collectionByAnime = groupCharactersByAnime(allCharacters);
  const dailyDungeonState = getDailyDungeonState(new Date(), selectedDailyDifficulty);

  function toggleTeamMember(characterId: string) {
    setSelectedTeamIds((current) => {
      if (current.includes(characterId)) {
        return current.filter((id) => id !== characterId);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, characterId];
    });
  }

  function beginModeSelection() {
    setSelectedTeamIds([]);
    setSelectedAdventureFloor(50);
    setSelectedDailyDifficulty("Normal");
    setActiveEncounter(null);
    setActiveBossPreview(null);
    setLatestBattle(null);
    setLatestEndlessRun(null);
    setScreen("modes");
  }

  function beginBattle() {
    if (selectedTeam.length < 1) {
      return;
    }

    const boss = getPreviewBossCharacter(
      selectedMode.id,
      selectedAdventureFloor,
      selectedDailyDifficulty,
    );
    setLatestBattle(null);
    setLatestEndlessRun(null);

    if (selectedMode.id === "endless") {
      setActiveEncounter(null);
      setActiveBossPreview(null);
      setScreen("battle");
      return;
    }

    if (selectedMode.id === "daily") {
      const dailySetup = createDailyEncounterSetup(
        selectedTeam,
        boss,
        new Date(),
        selectedDailyDifficulty,
      );
      setActiveEncounter({
        players: dailySetup.players,
        boss: dailySetup.boss,
      });
      setActiveBossPreview(dailySetup.boss.character);
      setScreen("battle");
      return;
    }

    setActiveEncounter({
      players: selectedTeam.map((character) => ({ character })),
      boss: { character: boss },
    });
    setActiveBossPreview(boss);
    setScreen("battle");
  }

  if (screen === "battle" && selectedMode.id === "endless") {
    return (
      <div className="mx-auto h-[100dvh] w-full max-w-[1600px] overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
        <EndlessRunScreen
          team={selectedTeam}
          bossPool={getBossesForMode("endless").map(createBattleReadyBossCharacter)}
          onExit={() => setScreen("team")}
          onRunComplete={(run, state) => {
            setLatestEndlessRun(run);
            setLatestBattle(state);
            setActiveBossPreview(run.currentBoss);
            setScreen("result");
          }}
        />
      </div>
    );
  }

  if (screen === "battle" && activeEncounter && activeBossPreview) {
    return (
      <div className="mx-auto h-[100dvh] w-full max-w-[1600px] overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
        <BattleScreen
          key={`${selectedMode.id}-${activeBossPreview.id}-${selectedTeamIds.join("-")}`}
          players={activeEncounter.players}
          boss={activeEncounter.boss}
          modeLabel={selectedMode.name}
          onExit={() => setScreen("team")}
          onComplete={(state) => {
            setLatestBattle(state);
            setScreen("result");
          }}
        />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <HeroShell
        eyebrow="Zenkai Trials"
        title={getScreenTitle(screen)}
        description={getScreenDescription(screen)}
      />

      {screen === "home" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-800">
              Minimal Playable Prototype
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
              Build a team, face one boss, and test the battle loop.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-slate-600">
              This first UI pass keeps the structure simple and iOS-inspired while
              hooking directly into the current character roster and turn engine.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={beginModeSelection}>
                Start Battle
              </PrimaryButton>
              <SecondaryButton onClick={() => setScreen("collection")}>
                Open Collection
              </SecondaryButton>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <QuickFact label="Roster" value={`${allCharacters.length} Characters`} />
              <QuickFact label="Modes" value={`${gameModes.length} Battle Types`} />
              <QuickFact label="Battle Size" value="1 to 3 vs 1 Boss" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {featuredCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                compact
              />
            ))}
          </div>
        </section>
      ) : null}

      {screen === "modes" ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {gameModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setSelectedModeId(mode.id);
                  setScreen("team");
                }}
                className="rounded-[28px] border border-white/70 bg-white/80 p-6 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:bg-white"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  {mode.difficulty}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  {mode.name}
                </h2>
                <p className="mt-3 text-sm text-slate-600">{mode.description}</p>
                {mode.id === "daily" ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p>Today&apos;s boost: {dailyDungeonState.boostedElement} +{dailyDungeonState.boostPercent}%</p>
                    <p className="mt-1">
                      {dailyDungeonState.currentDifficultyLabel} drop rate: {dailyDungeonState.currentDropRate}%
                      {dailyDungeonState.weekendBonusActive ? " (weekend bonus active)" : ""}
                    </p>
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          <SecondaryButton onClick={() => setScreen("home")}>
            Back Home
          </SecondaryButton>
        </section>
      ) : null}

      {screen === "team" ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Team Selection
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Pick 1 to 3 characters
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {selectedTeam.length}/3 selected
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {allCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  selected={selectedTeamIds.includes(character.id)}
                  onClick={() => toggleTeamMember(character.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Run Summary
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {selectedMode.name}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {selectedMode.description}
              </p>
              {selectedMode.id === "daily" ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>
                    Daily boost: {dailyDungeonState.boostedElement} gains +{dailyDungeonState.boostPercent}% HP, Mana, and Damage.
                  </p>
                  <p className="mt-1">
                    Attempt rule: 1 attempt per difficulty. Selected difficulty: {selectedDailyDifficulty} with a {dailyDungeonState.currentDropRate}% drop rate.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["Easy", "Normal", "Hard"] as const).map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() => setSelectedDailyDifficulty(difficulty)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selectedDailyDifficulty === difficulty
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedMode.id === "adventure" ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>Adventure boss selection is floor-based.</p>
                  <p className="mt-1">Current floor: {selectedAdventureFloor}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ADVENTURE_FLOOR_OPTIONS.map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        onClick={() => setSelectedAdventureFloor(floor)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selectedAdventureFloor === floor
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        Floor {floor}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedMode.id === "endless" ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>Endless carries mana between encounters and heals living allies for 20% HP after each win.</p>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((slot) => {
                  const character = selectedTeam[slot];

                  return (
                    <div
                      key={slot}
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      {character ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{character.name}</span>
                          <span className="text-slate-400">
                            {character.element} | {character.archetype}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Empty slot</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <PrimaryButton
                  onClick={beginBattle}
                  disabled={selectedTeam.length < 1}
                >
                  Start Encounter
                </PrimaryButton>
                <SecondaryButton onClick={() => setScreen("modes")}>
                  Change Mode
                </SecondaryButton>
              </div>
            </div>

            <BossShowcase character={previewBoss} />
          </div>
        </section>
      ) : null}

      {screen === "result" && latestBattle && activeBossPreview ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Result
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {latestBattle.outcome === "player-victory" ? "Victory" : "Defeat"}
            </h2>
            <p className="mt-3 text-base text-slate-600">
              {latestBattle.outcome === "player-victory"
                ? "Your squad cleared the encounter."
                : "The boss held the line this time."}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <QuickFact label="Rounds" value={String(latestBattle.round)} />
              <QuickFact
                label="Final Boss HP"
                value={String(latestBattle.enemyUnits[0]?.currentHp ?? 0)}
              />
              <QuickFact label="Mode" value={selectedMode.name} />
              <QuickFact
                label="Rewards"
                value={
                  selectedMode.id === "endless"
                    ? `${latestEndlessRun?.rewards.length ?? 0} reward rolls`
                    : "XP placeholder"
                }
              />
            </div>
            {selectedMode.id === "endless" && latestEndlessRun ? (
              <div className="mt-6 rounded-[24px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  Endless Summary
                </p>
                <p className="mt-2">
                  Cleared encounters: {latestEndlessRun.encountersCleared}
                </p>
                <p className="mt-1">{latestEndlessRun.runMessage}</p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3">
              <PrimaryButton
                onClick={() => {
                  setLatestBattle(null);
                  setLatestEndlessRun(null);
                  setScreen("team");
                }}
              >
                {selectedMode.id === "endless" ? "Start New Run" : "Battle Again"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setScreen("home")}>
                Back Home
              </SecondaryButton>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {selectedTeam.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  compact
                />
              ))}
            </div>
            <BossShowcase character={activeBossPreview} />
          </div>
        </section>
      ) : null}

      {screen === "collection" ? (
        <section className="space-y-8">
          {Object.entries(collectionByAnime).map(([anime, characters]) => (
            <div key={anime} className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Collection
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">{anime}</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {characters.map((character) => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </div>
            </div>
          ))}

          <SecondaryButton onClick={() => setScreen("home")}>
            Back Home
          </SecondaryButton>
        </section>
      ) : null}
    </main>
  );
}

function getScreenTitle(screen: AppScreen): string {
  switch (screen) {
    case "modes":
      return "Choose a game mode";
    case "team":
      return "Build your squad";
    case "battle":
      return "Battle";
    case "result":
      return "Battle result";
    case "collection":
      return "Character collection";
    default:
      return "Minimal playable battle prototype";
  }
}

function getScreenDescription(screen: AppScreen): string {
  switch (screen) {
    case "modes":
      return "Pick a starting encounter profile before you assemble your team.";
    case "team":
      return "Select between one and three characters, then launch the fight.";
    case "battle":
      return "Use attacks, skills, block, and dodge against the assigned boss.";
    case "result":
      return "Review the winner and jump into another fight.";
    case "collection":
      return "Browse the current roster by anime franchise.";
    default:
      return "A clean first pass on the Zenkai Trials flow using the existing battle engine.";
  }
}

function getPreviewBossCharacter(
  modeId: GameModeId,
  adventureFloor: number,
  dailyDifficulty: DailyDungeonDifficulty,
): Character {
  switch (modeId) {
    case "daily":
      return createBattleReadyBossCharacter(
        requireBoss(
          getDailyBossForDifficulty(dailyDifficulty) ?? getBossesForMode("daily")[0],
          "daily",
        ),
      );
    case "endless":
      return createBattleReadyBossCharacter(
        requireBoss(getBossesForMode("endless")[0], "endless"),
      );
    default:
      return createBattleReadyBossCharacter(
        requireBoss(
          getAdventureBossForFloor(adventureFloor) ?? getBossesForMode("adventure")[0],
          "adventure",
        ),
      );
  }
}

function requireBoss<T>(boss: T | undefined, mode: string): T {
  if (!boss) {
    throw new Error(`No boss is configured for ${mode} mode.`);
  }

  return boss;
}

function groupCharactersByAnime(characters: Character[]) {
  return characters.reduce<Record<string, Character[]>>((groups, character) => {
    if (!groups[character.anime]) {
      groups[character.anime] = [];
    }

    groups[character.anime].push(character);
    return groups;
  }, {});
}

function HeroShell({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(235,245,255,0.78))] p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-base text-slate-600">{description}</p>
    </header>
  );
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-slate-50 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}
