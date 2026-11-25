/**
 * Coins, tips, the Ink Streak multiplier, night stars and Madame Mantis's critic rating.
 */

import { ON_TIME_SHARE, STREAK_TIERS, TUNING } from './config.js';

/** The Ink Streak multiplier for a run of on-time perfect serves. */
export function streakMultiplier(streak) {
  let mult = 1;
  for (const tier of STREAK_TIERS) if (streak >= tier.at) mult = tier.mult;
  return mult;
}

/** The streak needed for the next multiplier tier, or null at the top tier. */
export function nextStreakTier(streak) {
  const next = STREAK_TIERS.find((tier) => tier.at > streak);
  return next ? next.at : null;
}

/**
 * Prices one serve. Cooked parts (anything a station heats) can be perfect or merely ok;
 * a cold plate from the pass loses its perfect tips.
 */
export function scoreServe({ recipe, customer, parts, patienceFrac, cold, streak }) {
  const cooked = parts.filter((p) => p.prep !== 'raw' && p.prep !== 'chop');
  const perfectCooked = cooked.filter((p) => p.quality === 'perfect').length;
  const allPerfect = cooked.every((p) => p.quality === 'perfect');
  const base = recipe.price;
  const speedTip = Math.round(base * TUNING.speedTipShare * patienceFrac);
  let perfectTip = 0;
  if (!cold) {
    perfectTip = perfectCooked * TUNING.perfectPartTip * customer.perfectTipMul;
    if (allPerfect && cooked.length > 0) perfectTip += TUNING.allPerfectTip * customer.perfectTipMul;
  }
  const onTime = patienceFrac >= ON_TIME_SHARE;
  const perfect = allPerfect && !cold;
  const nextStreak = onTime && perfect ? streak + 1 : 0;
  const mult = streakMultiplier(streak);
  const total = Math.round((base + speedTip + perfectTip) * mult);
  return { base, speedTip, perfectTip, mult, total, perfect, onTime, nextStreak, perfectCooked };
}

/** Stars for a night: coin targets, and on critic nights three stars also need a 4-star review. */
export function starsFor(coins, targets, criticScore = null) {
  let stars = targets.filter((t) => coins >= t).length;
  if (criticScore !== null && stars === 3 && criticScore < 4) stars = 2;
  return stars;
}

/** Madame Mantis's live rating while she waits: she starts delighted and cools as patience drains. */
export function criticLiveStars(patienceFrac) {
  return Math.round((2 + 3 * patienceFrac) * 2) / 2;
}

/** Madame Mantis's final verdict for a served plate, from 1 to 5 in half stars. */
export function criticVerdict(parts, patienceFrac, cold) {
  const cooked = parts.filter((p) => p.prep !== 'raw' && p.prep !== 'chop');
  const perfectShare = cooked.length ? cooked.filter((p) => p.quality === 'perfect').length / cooked.length : 1;
  const raw = 1 + 2.5 * (cold ? perfectShare * 0.5 : perfectShare) + 1.5 * patienceFrac;
  return Math.max(1, Math.min(5, Math.round(raw * 2) / 2));
}
