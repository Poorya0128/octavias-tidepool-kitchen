/**
 * Octavia's eight arms. Each arm is idle, HOLDS one item, or WORKS a station (chopping the
 * Shell Board or stirring a Bubble Pot). Every move takes a short reach, during which the arm
 * is in transit and cannot take a new job.
 */

import { ARM_COUNT, LAYOUT, TUNING } from './config.js';

/** Where each arm leaves Octavia's mantle, left to right. */
export const ARM_ROOTS = Array.from({ length: ARM_COUNT }, (_, i) => ({
  x: LAYOUT.octavia.x - 66 + i * 19,
  y: LAYOUT.octavia.y + 58 + Math.abs(i - 3.5) * -3,
}));

/** Resting tip positions: idle arms hang down onto the counter like a skirt. */
export const ARM_REST = ARM_ROOTS.map((_, i) => ({ x: LAYOUT.octavia.x + (i - 3.5) * 17, y: 446 - Math.abs(i - 3.5) * 5 }));

/** Where a holding arm lifts its item so the player can see it: a row above the counter. */
export const ARM_HOLD = ARM_ROOTS.map((_, i) => ({ x: 516 + i * 32.6, y: 404 + Math.abs(i - 3.5) * 3 }));

/** Centre of an ingredient bin on the counter, where an arm reaches in to grab. */
export function binPoint(index) {
  const b = LAYOUT.bins;
  return { x: b.x + index * (b.w + b.gap) + b.w / 2, y: b.y + 40 };
}

/** A fresh set of idle arms. */
export function createArms() {
  return ARM_ROOTS.map((_, id) => ({
    id, state: 'idle', item: null, station: null, slot: 0,
    target: { ...ARM_REST[id] }, reach: 0, reachTotal: 0, heldAt: 0,
  }));
}

/** Seconds an arm needs to reach a target, with Quicker Arms and a flowing Ink Burst applied. */
export function reachTime(state) {
  const base = state.upgrades.quickArms ? TUNING.quickReachTime : TUNING.reachTime;
  return state.ink.active ? base / TUNING.inkReachBoost : base;
}

/** Sends an arm's tip toward a point; the logic treats the job as begun, the drawing animates it. */
export function sendArm(state, arm, point) {
  arm.target = { x: point.x, y: point.y };
  arm.reach = reachTime(state);
  arm.reachTotal = arm.reach;
}

/** The free arm whose resting spot is nearest the point, or null when all eight are busy. */
export function freeArmNear(state, point) {
  let best = null;
  let bestD = Infinity;
  for (const arm of state.arms) {
    if (arm.state !== 'idle' || arm.reach > 0.05) continue;
    const d = Math.hypot(ARM_REST[arm.id].x - point.x, ARM_REST[arm.id].y - point.y);
    if (d < bestD) {
      best = arm;
      bestD = d;
    }
  }
  return best;
}

/** How many arms can take a job right now. */
export function freeArmCount(state) {
  return state.arms.filter((a) => a.state === 'idle').length;
}

/** Arms currently holding an item, most recently filled first. */
export function holdingArms(state) {
  return state.arms.filter((a) => a.state === 'hold').sort((a, b) => b.heldAt - a.heldAt);
}

/** Puts an item in an arm, which lifts it into view. */
export function holdItem(state, arm, item) {
  arm.state = 'hold';
  arm.item = item;
  arm.station = null;
  arm.heldAt = state.time + arm.id * 1e-4;
}

/** Empties an arm; it is free at once and its tip drifts back to rest. */
export function releaseArm(state, arm) {
  arm.state = 'idle';
  arm.item = null;
  arm.station = null;
  arm.target = { ...ARM_REST[arm.id] };
}

/**
 * Advances reach timers. When a reach ends, a holding arm lifts its item into view and an idle
 * arm drifts home; arms working a station stay where they are.
 */
export function updateArms(state, dt) {
  for (const arm of state.arms) {
    if (arm.reach <= 0) continue;
    arm.reach = Math.max(0, arm.reach - dt);
    if (arm.reach > 0) continue;
    if (arm.state === 'hold') arm.target = { ...ARM_HOLD[arm.id] };
    else if (arm.state === 'idle') arm.target = { ...ARM_REST[arm.id] };
  }
}
