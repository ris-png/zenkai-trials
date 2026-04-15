"use client";

import { useEffect, useRef, useState } from "react";
import {
  initializeBattle,
  resolveTurn,
  startRound,
  type BattleActionSelection,
} from "../../lib/battle/engine";
import type { BattleActionType, BattleState, BattleUnitState } from "../../types/battle";
import type { Character, Skill } from "../../types/character";
import type { StatusEffect } from "../../types/effects";
import { BattleUnitCard } from "./cards";

interface BattleScreenProps {
  players: Character[];
  boss: Character;
  modeLabel: string;
  onComplete: (state: BattleState) => void;
  onExit: () => void;
}

interface UnitSnapshot {
  hp: number;
  mana: number;
  shield: number;
  statuses: Record<string, string>;
}

const AUTO_STEP_DELAY_MS = 700;
const MAX_LOG_LINES = 80;

export function BattleScreen({
  players,
  boss,
  modeLabel,
  onComplete,
  onExit,
}: BattleScreenProps) {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [isAutoResolving, setIsAutoResolving] = useState(false);
  const completionSentRef = useRef(false);
  const randomRef = useRef(createSeededRandom(players.length * 997 + boss.name.length * 131));

  useEffect(() => {
    const initialState = initializeBattle({
      battleId: `ui-${Date.now()}`,
      players: players.map((character) => ({ character })),
      boss: { character: boss },
    });

    completionSentRef.current = false;
    randomRef.current = createSeededRandom(players.length * 997 + boss.name.length * 131);
    setBattleState(initialState);
    setIsAutoResolving(false);
    setLogLines([
      `${modeLabel} battle ready.`,
      `Team: ${players.map((character) => character.name).join(", ")}`,
      `Boss: ${boss.name}`,
      "Round 1 will begin automatically.",
    ]);
  }, [boss, modeLabel, players]);

  useEffect(() => {
    if (!battleState) {
      return;
    }

    if (battleState.outcome !== "in-progress") {
      setIsAutoResolving(false);
      if (!completionSentRef.current) {
        completionSentRef.current = true;
        onComplete(battleState);
      }
      return;
    }

    if (battleState.phase === "passives" || battleState.phase === "round-end") {
      setIsAutoResolving(true);

      const timer = window.setTimeout(() => {
        const nextState = startRound(battleState);
        commitStateTransition(battleState, nextState, [
          `Round ${nextState.round} begins.`,
          `Turn order: ${formatTurnOrder(nextState)}`,
        ]);
      }, AUTO_STEP_DELAY_MS);

      return () => window.clearTimeout(timer);
    }

    const activeUnit = getUnitById(battleState, battleState.activeUnitId);

    if (battleState.phase === "turn" && activeUnit?.side === "enemy") {
      setIsAutoResolving(true);

      const timer = window.setTimeout(() => {
        const nextState = resolveTurn(battleState, undefined, {
          random: randomRef.current,
        });

        commitStateTransition(battleState, nextState, [
          `${activeUnit.name} takes a turn.`,
        ]);
      }, AUTO_STEP_DELAY_MS);

      return () => window.clearTimeout(timer);
    }

    setIsAutoResolving(false);
  }, [battleState, onComplete]);

  if (!battleState) {
    return null;
  }

  const currentBattleState = battleState;
  const activeUnit = getUnitById(currentBattleState, currentBattleState.activeUnitId);
  const canAct =
    currentBattleState.phase === "turn" &&
    activeUnit?.side === "player" &&
    currentBattleState.outcome === "in-progress" &&
    !isAutoResolving;

  function commitStateTransition(
    previousState: BattleState,
    nextState: BattleState,
    contextLines: string[] = [],
  ) {
    const nextLines = [
      ...contextLines,
      ...nextState.combatLog
        .slice(previousState.combatLog.length)
        .map((entry) => entry.description),
      ...formatStateDelta(snapshotUnits(previousState), nextState),
    ];

    if (nextState.phase === "round-end" && nextState.outcome === "in-progress") {
      nextLines.push(`Round ${nextState.round} ends.`);
    }

    if (nextState.outcome === "player-victory") {
      nextLines.push("Victory. The boss has been defeated.");
    } else if (nextState.outcome === "enemy-victory") {
      nextLines.push("Defeat. The boss wins this encounter.");
    }

    setBattleState(nextState);
    setLogLines((current) => [...current, ...nextLines].slice(-MAX_LOG_LINES));
  }

  function handlePlayerAction(actionType: BattleActionType) {
    if (
      !currentBattleState.activeUnitId ||
      !activeUnit ||
      activeUnit.side !== "player"
    ) {
      return;
    }

    const action = buildActionSelection(currentBattleState, activeUnit, actionType);
    const actionLabel = getActionLabel(activeUnit, actionType);
    const nextState = resolveTurn(currentBattleState, action, {
      random: randomRef.current,
    });

    commitStateTransition(currentBattleState, nextState, [
      `${activeUnit.name} uses ${actionLabel}.`,
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              {modeLabel}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              Battle Screen
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              A minimal playable battle loop using the existing turn engine and
              character data.
            </p>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Exit Battle
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <BossBattlePanel
            unit={currentBattleState.enemyUnits[0]}
            active={activeUnit?.unitId === currentBattleState.enemyUnits[0]?.unitId}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentBattleState.playerUnits.map((unit) => (
              <BattleUnitCard
                key={unit.unitId}
                unit={unit}
                active={activeUnit?.unitId === unit.unitId}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <InfoPanel title="Round Status">
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
              <InfoPill label="Round" value={String(currentBattleState.round)} />
              <InfoPill label="Phase" value={currentBattleState.phase} />
              <InfoPill
                label="Active Unit"
                value={activeUnit?.name ?? "Waiting"}
              />
              <InfoPill
                label="Outcome"
                value={formatOutcomeLabel(currentBattleState.outcome)}
              />
            </div>
          </InfoPanel>

          <InfoPanel title="Turn Order">
            <div className="space-y-2">
              {currentBattleState.turnOrder.length > 0 ? (
                currentBattleState.turnOrder.map((unitId, index) => {
                  const unit = getUnitById(currentBattleState, unitId);

                  if (!unit) {
                    return null;
                  }

                  return (
                    <div
                      key={unitId}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                        unitId === currentBattleState.activeUnitId
                          ? "bg-sky-100 text-sky-900"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="font-medium">
                        {index + 1}. {unit.name}
                      </span>
                      <span>{unit.currentStats.speed} SPD</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">Next round is being prepared.</p>
              )}
            </div>
          </InfoPanel>

          <InfoPanel title="Actions">
            {activeUnit?.side === "player" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  {canAct
                    ? `Choose an action for ${activeUnit.name}.`
                    : "Please wait for auto-resolve or round setup to finish."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <ActionButton
                    label={activeUnit.skills.basicAttack.name}
                    detail="Basic Attack"
                    disabled={!canAct || !activeUnit.actionAvailability.canBasicAttack}
                    onClick={() => handlePlayerAction("basicAttack")}
                  />
                  <ActionButton
                    label={activeUnit.skills.skill1.name}
                    detail={`${activeUnit.skills.skill1.manaCost} mana`}
                    disabled={!canAct || !activeUnit.actionAvailability.canSkill1}
                    onClick={() => handlePlayerAction("skill1")}
                  />
                  <ActionButton
                    label={activeUnit.skills.skill2.name}
                    detail={`${activeUnit.skills.skill2.manaCost} mana`}
                    disabled={!canAct || !activeUnit.actionAvailability.canSkill2}
                    onClick={() => handlePlayerAction("skill2")}
                  />
                  <ActionButton
                    label="Block"
                    detail="Reduce next hit"
                    disabled={!canAct || !activeUnit.actionAvailability.canBlock}
                    onClick={() => handlePlayerAction("block")}
                  />
                  <ActionButton
                    label="Dodge"
                    detail="Avoid next hit"
                    disabled={!canAct || !activeUnit.actionAvailability.canDodge}
                    onClick={() => handlePlayerAction("dodge")}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {currentBattleState.outcome === "in-progress"
                  ? "Enemy action is resolving."
                  : "Battle complete."}
              </p>
            )}
          </InfoPanel>

          <InfoPanel title="Battle Log">
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1 text-sm text-slate-600">
              {logLines.map((line, index) => (
                <div
                  key={`${index}-${line}`}
                  className="rounded-2xl bg-slate-50 px-4 py-3"
                >
                  {line}
                </div>
              ))}
            </div>
          </InfoPanel>
        </div>
      </div>
    </div>
  );
}

function buildActionSelection(
  state: BattleState,
  actor: BattleUnitState,
  actionType: BattleActionType,
): BattleActionSelection {
  if (actionType === "block" || actionType === "dodge") {
    return { type: actionType };
  }

  const skill = getSkillForAction(actor, actionType);
  return {
    type: actionType,
    targetUnitId: getDefaultTargetId(state, actor, skill),
  };
}

function getSkillForAction(
  actor: BattleUnitState,
  actionType: Extract<BattleActionType, "basicAttack" | "skill1" | "skill2">,
): Skill {
  switch (actionType) {
    case "basicAttack":
      return actor.skills.basicAttack;
    case "skill1":
      return actor.skills.skill1;
    case "skill2":
      return actor.skills.skill2;
  }
}

function getDefaultTargetId(
  state: BattleState,
  actor: BattleUnitState,
  skill: Skill,
): string | undefined {
  switch (skill.target) {
    case "self":
      return actor.unitId;
    case "single-ally":
      return getLowestHpUnit(getUnitsOnSide(state, actor.side, true))?.unitId;
    case "single-enemy":
    case "random-enemy":
      return getLowestHpUnit(getUnitsOnSide(state, getOpposingSide(actor.side), true))?.unitId;
    default:
      return undefined;
  }
}

function getUnitsOnSide(
  state: BattleState,
  side: BattleUnitState["side"],
  aliveOnly: boolean,
): BattleUnitState[] {
  return [...state.playerUnits, ...state.enemyUnits].filter(
    (unit) => unit.side === side && (!aliveOnly || unit.isAlive),
  );
}

function getOpposingSide(side: BattleUnitState["side"]): BattleUnitState["side"] {
  return side === "player" ? "enemy" : "player";
}

function getLowestHpUnit(units: BattleUnitState[]): BattleUnitState | undefined {
  return [...units].sort((left, right) => left.currentHp - right.currentHp)[0];
}

function snapshotUnits(state: BattleState): Record<string, UnitSnapshot> {
  return Object.fromEntries(
    [...state.playerUnits, ...state.enemyUnits].map((unit) => [
      unit.unitId,
      {
        hp: unit.currentHp,
        mana: unit.currentMana,
        shield: unit.shield,
        statuses: Object.fromEntries(
          unit.activeStatusEffects.map((effect) => [effect.id, getStatusSignature(effect)]),
        ),
      },
    ]),
  );
}

function formatStateDelta(
  previousSnapshot: Record<string, UnitSnapshot>,
  nextState: BattleState,
): string[] {
  const lines: string[] = [];

  for (const unit of [...nextState.playerUnits, ...nextState.enemyUnits]) {
    const before = previousSnapshot[unit.unitId];

    if (!before) {
      continue;
    }

    if (before.hp !== unit.currentHp || before.mana !== unit.currentMana) {
      lines.push(
        `${unit.name}: HP ${before.hp} -> ${unit.currentHp}, Mana ${before.mana} -> ${unit.currentMana}`,
      );
    }

    if (before.shield !== unit.shield) {
      lines.push(`${unit.name}: Shield ${before.shield} -> ${unit.shield}`);
    }

    const currentStatuses = Object.fromEntries(
      unit.activeStatusEffects.map((effect) => [effect.id, getStatusSignature(effect)]),
    );
    const beforeStatusIds = Object.keys(before.statuses);
    const currentStatusIds = Object.keys(currentStatuses);

    for (const statusId of currentStatusIds.filter((id) => !(id in before.statuses))) {
      lines.push(`${unit.name}: Status Applied -> ${currentStatuses[statusId]}`);
    }

    for (const statusId of currentStatusIds.filter(
      (id) => id in before.statuses && before.statuses[id] !== currentStatuses[id],
    )) {
      lines.push(
        `${unit.name}: Status Updated -> ${before.statuses[statusId]} -> ${currentStatuses[statusId]}`,
      );
    }

    for (const statusId of beforeStatusIds.filter((id) => !(id in currentStatuses))) {
      lines.push(`${unit.name}: Status Removed -> ${before.statuses[statusId]}`);
    }
  }

  return lines.length > 0 ? lines : ["No visible state changes."];
}

function getStatusSignature(effect: StatusEffect): string {
  const details: string[] = [];

  if (effect.durationTurns !== undefined) {
    details.push(`${effect.durationTurns} turn`);
  }

  if (effect.stacks !== undefined) {
    details.push(`${effect.stacks} stack`);
  }

  if (effect.valuePercent !== undefined) {
    details.push(`${effect.valuePercent}%`);
  }

  if (effect.valueFlat !== undefined) {
    details.push(`${effect.valueFlat}`);
  }

  return details.length > 0 ? `${effect.name} (${details.join(", ")})` : effect.name;
}

function getActionLabel(unit: BattleUnitState, actionType: BattleActionType): string {
  switch (actionType) {
    case "basicAttack":
      return unit.skills.basicAttack.name;
    case "skill1":
      return unit.skills.skill1.name;
    case "skill2":
      return unit.skills.skill2.name;
    case "block":
      return "Block";
    case "dodge":
      return "Dodge";
  }
}

function getUnitById(
  state: BattleState,
  unitId?: string,
): BattleUnitState | undefined {
  return [...state.playerUnits, ...state.enemyUnits].find(
    (unit) => unit.unitId === unitId,
  );
}

function formatTurnOrder(state: BattleState): string {
  return state.turnOrder
    .map((unitId) => {
      const unit = getUnitById(state, unitId);
      return unit ? `${unit.name} (${unit.currentStats.speed})` : unitId;
    })
    .join(" -> ");
}

function formatOutcomeLabel(outcome: BattleState["outcome"]): string {
  switch (outcome) {
    case "player-victory":
      return "Victory";
    case "enemy-victory":
      return "Boss Victory";
    default:
      return "In Progress";
  }
}

function createSeededRandom(seed: number): () => number {
  let current = seed >>> 0;

  return () => {
    current += 0x6d2b79f5;
    let result = current;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function ActionButton({
  label,
  detail,
  disabled,
  onClick,
}: {
  label: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <p className="font-medium text-slate-900">{label}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
        {detail}
      </p>
    </button>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

function BossBattlePanel({
  unit,
  active,
}: {
  unit: BattleUnitState;
  active: boolean;
}) {
  const hpPercent = unit.maxHp > 0 ? (unit.currentHp / unit.maxHp) * 100 : 0;
  const manaPercent = unit.maxMana > 0 ? (unit.currentMana / unit.maxMana) * 100 : 0;

  return (
    <div
      className={`overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)] ${
        active ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#eef4fb]" : ""
      }`}
    >
      <div className="aspect-[7/5] bg-gradient-to-br from-slate-900 via-slate-700 to-slate-400 p-4">
        <div className="flex h-full flex-col justify-between rounded-[24px] border border-white/20 bg-white/10 p-5 text-white backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                Boss
              </p>
              <h3 className="mt-2 text-3xl font-semibold">{unit.name}</h3>
              <p className="mt-2 text-sm text-white/75">
                Element {unit.element} | Speed {unit.currentStats.speed}
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {unit.element}
            </span>
          </div>

          <div className="space-y-3">
            <BossMeter
              label={`HP ${unit.currentHp}/${unit.maxHp}`}
              value={hpPercent}
              barClassName="bg-gradient-to-r from-rose-400 to-orange-300"
            />
            <BossMeter
              label={`Mana ${unit.currentMana}/${unit.maxMana}`}
              value={manaPercent}
              barClassName="bg-gradient-to-r from-cyan-300 to-sky-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BossMeter({
  label,
  value,
  barClassName,
}: {
  label: string;
  value: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-white/80">
        <span>{label}</span>
        <span>{Math.max(0, Math.round(value))}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
