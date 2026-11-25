/**
 * Ink Burst, Octavia's signature move. Food taken off a station at its perfect moment fills her
 * ink meter; once it is full she can squirt a cloud of ink that, for a few seconds, holds every
 * customer's patience, speeds up her arms and quickens the chopping. A hungry walk-out spills
 * half the meter.
 */

import { LAYOUT, TUNING } from './config.js';

/** Adds ink to the meter; filling it announces that the burst is ready. */
export function chargeInk(state, amount) {
  const ink = state.ink;
  const wasFull = ink.meter >= 1;
  ink.meter = Math.min(1, ink.meter + amount);
  if (ink.meter >= 1 && !wasFull) {
    state.emit({ type: 'inkReady' });
    state.toast('Ink Burst ready! Press I', '#d9b8ff');
  }
}

/** A customer swam off hungry: half the ink spills away. */
export function spillInk(state) {
  state.ink.meter *= TUNING.inkMissKeep;
}

/** Fires the Ink Burst (key I) when the meter is full and no burst is flowing. */
export function fireInkBurst(state) {
  const ink = state.ink;
  if (ink.active) return { ok: false, reason: 'The Ink Burst is already flowing' };
  if (ink.meter < 1) return { ok: false, reason: 'Ink fills up with perfect cooking' };
  ink.active = true;
  ink.endsAt = state.time + TUNING.inkDuration;
  ink.meter = 0;
  ink.uses++;
  state.emit({ type: 'inkBurst', ...LAYOUT.octavia });
  return { ok: true, info: 'Ink Burst!' };
}

/** Ends the burst once its time is up. */
export function updateInk(state) {
  if (state.ink.active && state.time >= state.ink.endsAt) state.ink.active = false;
}
