import type { BattleUnitState } from "../../types/battle";
import type { Character } from "../../types/character";

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
      <div className={`aspect-[5/7] bg-gradient-to-b ${style.accent} p-4`}>
        <div className="flex h-full flex-col justify-between rounded-[22px] border border-white/60 bg-white/55 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                {character.anime}
              </p>
              <h3 className={`${compact ? "text-lg" : "text-2xl"} font-semibold text-slate-900`}>
                {character.name}
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}
            >
              {character.element}
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-[20px] bg-white/80 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Passive
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {character.passiveAbility.name}
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                {character.passiveAbility.effect}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
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
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

interface BattleUnitCardProps {
  unit: BattleUnitState;
  active?: boolean;
}

export function BattleUnitCard({ unit, active = false }: BattleUnitCardProps) {
  const style = elementStyles[unit.element];
  const hpPercent = unit.maxHp > 0 ? (unit.currentHp / unit.maxHp) * 100 : 0;
  const manaPercent = unit.maxMana > 0 ? (unit.currentMana / unit.maxMana) * 100 : 0;

  return (
    <div
      className={`overflow-hidden rounded-[28px] border bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${
        style.frame
      } ${active ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#eef4fb]" : ""}`}
    >
      <div className={`aspect-[5/7] bg-gradient-to-b ${style.accent} p-3`}>
        <div className="flex h-full flex-col justify-between rounded-[22px] border border-white/60 bg-white/60 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {unit.isBoss ? "Boss" : "Ally"}
              </p>
              <h3 className="text-lg font-semibold text-slate-900">{unit.name}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
              {unit.element}
            </span>
          </div>

          <div className="space-y-3">
            <Meter
              label={`HP ${unit.currentHp}/${unit.maxHp}`}
              value={hpPercent}
              barClassName="bg-gradient-to-r from-rose-500 to-orange-400"
            />
            <Meter
              label={`Mana ${unit.currentMana}/${unit.maxMana}`}
              value={manaPercent}
              barClassName="bg-gradient-to-r from-cyan-500 to-sky-400"
            />

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <StatPill label="ATK" value={String(unit.currentStats.atk)} />
              <StatPill label="DEF" value={String(unit.currentStats.def)} />
              <StatPill label="SPD" value={String(unit.currentStats.speed)} />
              <StatPill label="Shield" value={String(unit.shield)} />
            </div>

            <div className="min-h-12 rounded-2xl bg-white/80 px-3 py-2 text-xs text-slate-600">
              {unit.activeStatusEffects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {unit.activeStatusEffects.map((effect) => (
                    <span
                      key={effect.id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700"
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
                <p>No active effects</p>
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
}: {
  label: string;
  value: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span>{Math.max(0, Math.round(value))}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
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
      <div className={`aspect-[7/5] bg-gradient-to-r ${style.accent} p-4`}>
        <div className="flex h-full flex-col justify-between rounded-[22px] border border-white/60 bg-white/55 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Selected Boss
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                {character.name}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{character.description}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
              {character.element}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-sm text-slate-700">
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
