import type { BattleUnitState } from "../../types/battle";
import type { Character } from "../../types/character";
import { BattleArtwork } from "./battle-art";

const elementStyles: Record<
  Character["element"],
  { accent: string; chip: string; frame: string }
> = {
  Earth: {
    accent: "from-emerald-500 via-lime-400 to-amber-200",
    chip: "bg-emerald-100 text-emerald-800",
    frame: "border-emerald-200",
  },
  Water: {
    accent: "from-cyan-500 via-sky-400 to-blue-200",
    chip: "bg-cyan-100 text-cyan-800",
    frame: "border-cyan-200",
  },
  Fire: {
    accent: "from-orange-500 via-rose-400 to-amber-200",
    chip: "bg-orange-100 text-orange-800",
    frame: "border-orange-200",
  },
  Air: {
    accent: "from-slate-500 via-sky-300 to-slate-100",
    chip: "bg-slate-100 text-slate-700",
    frame: "border-slate-200",
  },
  Lightning: {
    accent: "from-yellow-400 via-amber-300 to-orange-100",
    chip: "bg-yellow-100 text-yellow-800",
    frame: "border-yellow-200",
  },
  Light: {
    accent: "from-fuchsia-300 via-violet-200 to-white",
    chip: "bg-fuchsia-100 text-fuchsia-800",
    frame: "border-fuchsia-200",
  },
  Dark: {
    accent: "from-slate-900 via-slate-700 to-slate-500",
    chip: "bg-slate-200 text-slate-800",
    frame: "border-slate-300",
  },
};

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

interface CharacterCardProps {
  character: Character;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function CharacterCard({
  character,
  selected = false,
  compact = false,
  onClick,
}: CharacterCardProps) {
  const style = elementStyles[character.element];
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group flex w-full flex-col overflow-hidden rounded-[28px] border bg-white text-left shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition ${
        style.frame
      } ${selected ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#eef4fb]" : ""} ${
        onClick ? "hover:-translate-y-1" : ""
      }`}
    >
      <div className={`relative aspect-[5/7] overflow-hidden bg-gradient-to-b ${style.accent} p-4`}>
        <BattleArtwork
          entity={character}
          variant="character"
          alt={`${character.name} portrait`}
          priority={compact}
          imageClassName="scale-[1.02]"
          overlayClassName="bg-gradient-to-t from-black/8 via-transparent to-black/12"
        />
        <div className="relative z-10 flex h-full flex-col justify-between rounded-[22px] border border-white/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/72 drop-shadow-[0_1px_4px_rgba(15,23,42,0.6)]">
                {character.anime}
              </p>
              <h3
                className={`${compact ? "text-lg" : "text-2xl"} font-semibold text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.72)]`}
              >
                {character.name}
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}
            >
              {character.element}
            </span>
          </div>

          <div className="space-y-3 rounded-[20px] border border-white/18 bg-slate-950/14 p-3 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-[8px]">
            <div className="text-sm text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-white/58">
                Passive
              </p>
              <p className="mt-1 font-medium text-white">
                {character.passiveAbility.name}
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-white/86">
                {character.passiveAbility.effect}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-white">
              <StatPill label="Rarity" value={`${character.rarity}*`} />
              <StatPill label="Role" value={character.archetype} />
              <StatPill label="HP" value={String(character.baseStats.hp)} />
              <StatPill label="ATK" value={String(character.baseStats.atk)} />
            </div>
          </div>
        </div>
      </div>
    </Component>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/18 bg-white/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[6px]">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">
        {label}
      </p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

interface BattleUnitCardProps {
  unit: BattleUnitState;
  active?: boolean;
  compact?: boolean;
  motion?: BattleUnitMotionState;
  className?: string;
}

export interface BattleUnitMotionState {
  lunge?: boolean;
  hit?: boolean;
  flash?: boolean;
  shield?: boolean;
  ultimate?: boolean;
}

export function BattleUnitCard({
  unit,
  active = false,
  compact = false,
  motion,
  className = "",
}: BattleUnitCardProps) {
  const style = elementStyles[unit.element];
  const hpPercent = unit.maxHp > 0 ? (unit.currentHp / unit.maxHp) * 100 : 0;
  const manaPercent = unit.maxMana > 0 ? (unit.currentMana / unit.maxMana) * 100 : 0;

  return (
    <div
      className={`battle-card-shell relative overflow-hidden rounded-[28px] border bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${
        style.frame
      } ${active ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#eef4fb]" : ""} ${className}`}
    >
      {motion?.flash ? (
        <div className="battle-impact-flash pointer-events-none absolute inset-0 z-20" />
      ) : null}
      {motion?.shield ? (
        <div className="battle-shield-pulse pointer-events-none absolute inset-2 z-20 rounded-[24px]" />
      ) : null}
      <div
        className={`battle-idle-ally relative aspect-[5/7] overflow-hidden bg-gradient-to-b ${style.accent} ${
          compact ? "p-2.5" : "p-3"
        } ${motion?.lunge ? "battle-motion-lunge" : ""} ${
          motion?.hit ? "battle-motion-hit" : ""
        } ${motion?.ultimate ? "battle-motion-ultimate" : ""}`}
      >
        <BattleArtwork
          entity={{ id: unit.characterId, name: unit.name }}
          variant={unit.isBoss ? "boss" : "character"}
          alt={`${unit.name} artwork`}
          imageClassName="scale-[1.03]"
          overlayClassName="bg-gradient-to-t from-black/10 via-transparent to-black/12"
        />
        <div
          className={`relative z-10 flex h-full flex-col justify-between rounded-[22px] border border-white/20 ${
            compact ? "p-3" : "p-4"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className={`uppercase tracking-[0.18em] text-white/72 drop-shadow-[0_1px_4px_rgba(15,23,42,0.6)] ${
                  compact ? "text-[10px]" : "text-xs"
                }`}
              >
                {unit.isBoss ? "Boss" : "Ally"}
              </p>
              <h3
                className={`font-semibold text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.72)] ${
                  compact ? "text-base" : "text-lg"
                }`}
              >
                {unit.name}
              </h3>
            </div>
            <span
              className={`rounded-full font-semibold ${style.chip} ${
                compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-xs"
              }`}
            >
              {unit.element}
            </span>
          </div>

          <div
            className={`rounded-[20px] border border-white/18 bg-slate-950/14 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-[8px] ${
              compact ? "space-y-2.5 p-2.5" : "space-y-3 p-3"
            }`}
          >
            <Meter
              label={`HP ${unit.currentHp}/${unit.maxHp}`}
              value={hpPercent}
              barClassName="bg-gradient-to-r from-rose-500 to-orange-400"
              compact={compact}
            />
            <Meter
              label={`Mana ${unit.currentMana}/${unit.maxMana}`}
              value={manaPercent}
              barClassName="bg-gradient-to-r from-cyan-500 to-sky-400"
              compact={compact}
            />

            <div className={`grid grid-cols-2 text-white ${compact ? "gap-1.5 text-[11px]" : "gap-2 text-xs"}`}>
              <StatPill label="ATK" value={String(unit.currentStats.atk)} />
              <StatPill label="DEF" value={String(unit.currentStats.def)} />
              <StatPill label="SPD" value={String(unit.currentStats.speed)} />
              <StatPill label="Shield" value={String(unit.shield)} />
            </div>

            <div
              className={`rounded-2xl border border-white/16 bg-white/10 text-white/82 backdrop-blur-[6px] ${
                compact ? "min-h-10 px-2.5 py-2 text-[10px]" : "min-h-12 px-3 py-2 text-xs"
              }`}
            >
              {unit.activeStatusEffects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {unit.activeStatusEffects.map((effect) => (
                    <span
                      key={effect.id}
                        className={`rounded-full border border-white/14 bg-white/12 font-medium text-white ${
                          compact ? "px-2 py-0.5" : "px-2.5 py-1"
                        }`}
                    >
                      {effect.name}
                      {effect.durationTurns !== undefined
                        ? ` ${effect.durationTurns}t`
                        : ""}
                      {effect.valuePercent !== undefined
                        ? ` ${formatPercent(effect.valuePercent)}`
                        : ""}
                      {effect.valueFlat !== undefined ? ` ${effect.valueFlat}` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/66">No active effects</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  barClassName,
  compact = false,
}: {
  label: string;
  value: number;
  barClassName: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div
        className={`mb-1 flex items-center justify-between font-medium text-slate-600 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <span className="text-white/78">{label}</span>
        <span className="text-white/72">{Math.max(0, Math.round(value))}%</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-white/14 ${
          compact ? "h-2" : "h-2.5"
        }`}
      >
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function BossShowcase({ character }: { character: Character }) {
  const style = elementStyles[character.element];

  return (
    <div
      className={`overflow-hidden rounded-[28px] border bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${style.frame}`}
    >
      <div className={`relative aspect-[7/5] overflow-hidden bg-gradient-to-r ${style.accent} p-4`}>
        <BattleArtwork
          entity={character}
          variant="boss"
          alt={`${character.name} boss artwork`}
          priority
          imageClassName="scale-[1.02]"
          overlayClassName="bg-gradient-to-t from-black/12 via-transparent to-black/18"
        />
        <div className="relative z-10 flex h-full flex-col justify-between rounded-[22px] border border-white/25 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/72 drop-shadow-[0_1px_4px_rgba(15,23,42,0.6)]">
                Selected Boss
              </p>
              <h3 className="text-2xl font-semibold text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.72)]">
                {character.name}
              </h3>
              <p className="mt-2 max-w-[22rem] text-sm text-white/86 drop-shadow-[0_1px_3px_rgba(15,23,42,0.55)]">
                {character.description}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
              {character.element}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-[20px] border border-white/18 bg-slate-950/14 p-3 text-sm text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-[8px]">
            <StatPill label="Anime" value={character.anime} />
            <StatPill label="Rarity" value={`${character.rarity}*`} />
            <StatPill label="Role" value={character.archetype} />
            <StatPill label="Speed" value={String(character.baseStats.speed)} />
          </div>
        </div>
      </div>
    </div>
  );
}
