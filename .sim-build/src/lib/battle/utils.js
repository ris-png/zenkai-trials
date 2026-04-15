"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK_DAMAGE_MULTIPLIER = exports.DEFAULT_MAX_MANA = exports.DEFAULT_MANA_GAIN_PER_ROUND = exports.CRITICAL_HIT_MULTIPLIER = exports.CRITICAL_HIT_CHANCE = exports.NEUTRAL_ELEMENT_MULTIPLIER = exports.WEAK_ELEMENT_MULTIPLIER = exports.STRONG_ELEMENT_MULTIPLIER = void 0;
exports.getElementMultiplier = getElementMultiplier;
exports.calculateCriticalHit = calculateCriticalHit;
exports.calculateDamage = calculateDamage;
exports.clampMana = clampMana;
exports.applyManaGain = applyManaGain;
exports.sortTurnOrderBySpeed = sortTurnOrderBySpeed;
exports.STRONG_ELEMENT_MULTIPLIER = 1.2;
exports.WEAK_ELEMENT_MULTIPLIER = 0.8;
exports.NEUTRAL_ELEMENT_MULTIPLIER = 1;
exports.CRITICAL_HIT_CHANCE = 0.035;
exports.CRITICAL_HIT_MULTIPLIER = 1.5;
exports.DEFAULT_MANA_GAIN_PER_ROUND = 150;
exports.DEFAULT_MAX_MANA = 600;
exports.BLOCK_DAMAGE_MULTIPLIER = 0.2;
const STRONG_AGAINST = {
    Earth: "Water",
    Water: "Fire",
    Fire: "Air",
    Air: "Lightning",
    Lightning: "Earth",
    Light: "Dark",
    Dark: "Light",
};
/**
 * Matches the design rule:
 * - Strong = 1.20
 * - Weak = 0.80
 * - Neutral = 1.00
 */
function getElementMultiplier(attackerElement, defenderElement) {
    if (STRONG_AGAINST[attackerElement] === defenderElement) {
        return exports.STRONG_ELEMENT_MULTIPLIER;
    }
    if (STRONG_AGAINST[defenderElement] === attackerElement) {
        return exports.WEAK_ELEMENT_MULTIPLIER;
    }
    return exports.NEUTRAL_ELEMENT_MULTIPLIER;
}
/**
 * Example:
 * `const isCrit = calculateCriticalHit(0.01); // true`
 */
function calculateCriticalHit(randomRoll = Math.random()) {
    return randomRoll < exports.CRITICAL_HIT_CHANCE;
}
/**
 * Uses the exact formula from the design docs:
 * Final Damage = Base Damage × Element Multiplier × Crit Modifier × Block Modifier
 */
function calculateDamage({ baseDamage, attackerElement, defenderElement, isCritical = false, isBlocked = false, }) {
    const elementMultiplier = getElementMultiplier(attackerElement, defenderElement);
    const critModifier = isCritical ? exports.CRITICAL_HIT_MULTIPLIER : 1;
    const blockModifier = isBlocked ? exports.BLOCK_DAMAGE_MULTIPLIER : 1;
    return baseDamage * elementMultiplier * critModifier * blockModifier;
}
function clampMana(mana, maxMana = exports.DEFAULT_MAX_MANA) {
    return Math.max(0, Math.min(mana, maxMana));
}
/**
 * Example:
 * `const nextUnit = applyManaGain(unit);`
 * `const nextRoundUnits = units.map(applyManaGain);`
 */
function applyManaGain(unit, manaGain = exports.DEFAULT_MANA_GAIN_PER_ROUND) {
    if (!unit.isAlive) {
        return unit;
    }
    return Object.assign(Object.assign({}, unit), { currentMana: clampMana(unit.currentMana + manaGain, unit.maxMana) });
}
/**
 * Returns a new array of living units sorted by:
 * 1. Higher speed first
 * 2. Player units before enemy units on speed ties
 * 3. Original input order if both are still tied
 */
function sortTurnOrderBySpeed(units) {
    return units
        .map((unit, index) => ({ unit, index }))
        .filter(({ unit }) => unit.isAlive)
        .sort((left, right) => {
        const speedDelta = right.unit.currentStats.speed - left.unit.currentStats.speed;
        if (speedDelta !== 0) {
            return speedDelta;
        }
        const sideDelta = getTurnOrderSidePriority(left.unit.side) -
            getTurnOrderSidePriority(right.unit.side);
        if (sideDelta !== 0) {
            return sideDelta;
        }
        return left.index - right.index;
    })
        .map(({ unit }) => unit);
}
function getTurnOrderSidePriority(side) {
    return side === "player" ? 0 : 1;
}
