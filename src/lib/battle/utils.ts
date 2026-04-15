import type { Element, UnitSide } from "../../types/shared";

export const STRONG_ELEMENT_MULTIPLIER = 1.2;
export const WEAK_ELEMENT_MULTIPLIER = 0.8;
export const NEUTRAL_ELEMENT_MULTIPLIER = 1;

export const CRITICAL_HIT_CHANCE = 0.035;
export const CRITICAL_HIT_MULTIPLIER = 1.5;

export const DEFAULT_MANA_GAIN_PER_ROUND = 150;
export const DEFAULT_MAX_MANA = 600;

export const BLOCK_DAMAGE_MULTIPLIER = 0.2;

const STRONG_AGAINST: Record<Element, Element> = {
  Earth: "Water",
  Water: "Fire",
  Fire: "Air",
  Air: "Lightning",
  Lightning: "Earth",
  Light: "Dark",
  Dark: "Light",
};

export interface DamageCalculationParams {
  baseDamage: number;
  attackerElement: Element;
  defenderElement: Element;
  isCritical?: boolean;
  isBlocked?: boolean;
}

export interface ManaUnitLike {
  currentMana: number;
  maxMana: number;
  isAlive: boolean;
}

export interface SpeedUnitLike {
  side: UnitSide;
  isAlive: boolean;
  currentStats: {
    speed: number;
  };
}

/**
 * Matches the design rule:
 * - Strong = 1.20
 * - Weak = 0.80
 * - Neutral = 1.00
 */
export function getElementMultiplier(
  attackerElement: Element,
  defenderElement: Element,
): number {
  if (STRONG_AGAINST[attackerElement] === defenderElement) {
    return STRONG_ELEMENT_MULTIPLIER;
  }

  if (STRONG_AGAINST[defenderElement] === attackerElement) {
    return WEAK_ELEMENT_MULTIPLIER;
  }

  return NEUTRAL_ELEMENT_MULTIPLIER;
}

/**
 * Example:
 * `const isCrit = calculateCriticalHit(0.01); // true`
 */
export function calculateCriticalHit(randomRoll = Math.random()): boolean {
  return randomRoll < CRITICAL_HIT_CHANCE;
}

/**
 * Uses the exact formula from the design docs:
 * Final Damage = Base Damage × Element Multiplier × Crit Modifier × Block Modifier
 */
export function calculateDamage({
  baseDamage,
  attackerElement,
  defenderElement,
  isCritical = false,
  isBlocked = false,
}: DamageCalculationParams): number {
  const elementMultiplier = getElementMultiplier(
    attackerElement,
    defenderElement,
  );
  const critModifier = isCritical ? CRITICAL_HIT_MULTIPLIER : 1;
  const blockModifier = isBlocked ? BLOCK_DAMAGE_MULTIPLIER : 1;

  return baseDamage * elementMultiplier * critModifier * blockModifier;
}

export function clampMana(
  mana: number,
  maxMana = DEFAULT_MAX_MANA,
): number {
  return Math.max(0, Math.min(mana, maxMana));
}

/**
 * Example:
 * `const nextUnit = applyManaGain(unit);`
 * `const nextRoundUnits = units.map(applyManaGain);`
 */
export function applyManaGain<T extends ManaUnitLike>(
  unit: T,
  manaGain = DEFAULT_MANA_GAIN_PER_ROUND,
): T {
  if (!unit.isAlive) {
    return unit;
  }

  return {
    ...unit,
    currentMana: clampMana(unit.currentMana + manaGain, unit.maxMana),
  };
}

/**
 * Returns a new array of living units sorted by:
 * 1. Higher speed first
 * 2. Player units before enemy units on speed ties
 * 3. Original input order if both are still tied
 */
export function sortTurnOrderBySpeed<T extends SpeedUnitLike>(units: T[]): T[] {
  return units
    .map((unit, index) => ({ unit, index }))
    .filter(({ unit }) => unit.isAlive)
    .sort((left, right) => {
      const speedDelta =
        right.unit.currentStats.speed - left.unit.currentStats.speed;

      if (speedDelta !== 0) {
        return speedDelta;
      }

      const sideDelta =
        getTurnOrderSidePriority(left.unit.side) -
        getTurnOrderSidePriority(right.unit.side);

      if (sideDelta !== 0) {
        return sideDelta;
      }

      return left.index - right.index;
    })
    .map(({ unit }) => unit);
}

function getTurnOrderSidePriority(side: UnitSide): number {
  return side === "player" ? 0 : 1;
}
