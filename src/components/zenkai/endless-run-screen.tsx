"use client";

import { useState } from "react";
import type { BattleState } from "../../types/battle";
import type { Character } from "../../types/character";
import {
  completeEndlessEncounter,
  continueEndlessRun,
  exitEndlessRun,
  getEndlessEncounterSetup,
  getEndlessStatusLabel,
  initializeEndlessRun,
  type EndlessRunState,
} from "../../lib/game-modes/endless";
import { BattleScreen } from "./battle-screen";
import { BossShowcase } from "./cards";

interface EndlessRunScreenProps {
  team: Character[];
  bossPool: Character[];
  onExit: () => void;
  onRunComplete: (run: EndlessRunState, finalBattle: BattleState) => void;
}

export function EndlessRunScreen({
  team,
  bossPool,
  onExit,
  onRunComplete,
}: EndlessRunScreenProps) {
  const [runState, setRunState] = useState<EndlessRunState>(() =>
    initializeEndlessRun(team, bossPool),
  );
  const latestReward = runState.rewards.at(-1);

  function handleEncounterComplete(finalBattle: BattleState) {
    const nextRun = completeEndlessEncounter(runState, finalBattle, bossPool);

    if (nextRun.status === "defeated") {
      onRunComplete(nextRun, finalBattle);
      return;
    }

    setRunState(nextRun);
  }

  function handleExit() {
    setRunState((current) => exitEndlessRun(current));
    onExit();
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
      <section className="rounded-[30px] border border-white/70 bg-white/85 px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <StatusPill label="Mode" value="Endless Mode" />
          <StatusPill label="Encounter" value={String(runState.encounterNumber)} />
          <StatusPill
            label="Run Status"
            value={getEndlessStatusLabel(runState.status)}
          />
          <StatusPill
            label="Encounters Cleared"
            value={String(runState.encountersCleared)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{runState.runMessage}</p>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              Difficulty x{runState.difficultyMultiplier.toFixed(2)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              Rewards {runState.rewards.length}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              {runState.status === "between-encounters"
                ? "Between Encounters"
                : "Inside Encounter"}
            </span>
          </div>
        </div>
      </section>

      {runState.status === "between-encounters" ? (
        <div className="grid min-h-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Between Encounters
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Encounter {runState.encounterNumber} is ready
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Living allies already recovered 20% HP and kept their mana from the last fight.
                </p>
              </div>
              {latestReward ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Latest Reward
                  </p>
                  <p className="mt-1 font-medium text-slate-900">
                    {latestReward.summary}
                  </p>
                </div>
              ) : null}
            </div>

            <p className="mt-5 text-xs uppercase tracking-[0.22em] text-slate-400">
              Carryover Team State
            </p>
            <div className="mt-4 space-y-3">
              {runState.players.map((player) => (
                <div
                  key={player.unitId}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{player.character.name}</span>
                    <span className="text-slate-400">
                      HP {player.currentHp} | Mana {player.currentMana}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRunState((current) => continueEndlessRun(current))}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Continue Run
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Exit Run
              </button>
            </div>
          </section>

          <BossShowcase character={runState.currentBoss} />
        </div>
      ) : (
        <BattleScreen
          key={`endless-${runState.encounterNumber}-${runState.difficultyMultiplier}`}
          players={getEndlessEncounterSetup(runState).players}
          boss={getEndlessEncounterSetup(runState).boss}
          modeLabel={`Endless Encounter ${runState.encounterNumber}`}
          onExit={handleExit}
          onComplete={handleEncounterComplete}
        />
      )}
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
