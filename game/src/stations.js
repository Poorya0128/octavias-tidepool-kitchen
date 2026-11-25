/**
 * The cooking stations: Shell Board (chop), Bubble Pots (simmer), Vent Grill (sear, with a flip)
 * and Kelp Steamer (steam). Cooked food goes raw, then perfect (a glowing window), then overdone,
 * then burnt. The pot burns twice as fast with no arm stirring it.
 */

import { SLOT_TARGETS, TUNING } from './config.js';
import { allowsPrep, INGREDIENT } from './data/ingredients.js';
import { freeArmNear, holdItem, releaseArm, sendArm } from './arms.js';
import { chargeInk } from './ink.js';

/** The arm left to the station keeps working it; any other arm only touches the station and returns. */
const WORKING_PREPS = new Set(['chop', 'simmer']);

/** Station id to its preparation and slot count. */
export const STATION_KINDS = {
  board: { prep: 'chop', slots: 1, name: 'Shell Board' },
  pot0: { prep: 'simmer', slots: 1, name: 'Bubble Pot' },
  pot1: { prep: 'simmer', slots: 1, name: 'Second Pot' },
  grill: { prep: 'sear', slots: 2, name: 'Vent Grill' },
  steamer: { prep: 'steam', slots: 2, name: 'Kelp Steamer' },
};

/** The stations of a night; the second pot exists only with its upgrade. */
export function createStations(upgrades) {
  const out = {};
  for (const [id, kind] of Object.entries(STATION_KINDS)) {
    out[id] = { id, prep: kind.prep, slots: Array(kind.slots).fill(null), locked: id === 'pot1' && !upgrades.secondPot };
  }
  return out;
}

/** A new cooking item placed in a station slot. */
function newCook(ing, prep) {
  return { ing, prep, t: 0, phase: prep === 'chop' ? 'chop' : 'cook', flipped: false, warned: false };
}

/** Phase thresholds for steam and simmer: [end of cook, end of perfect, end of overdone]. */
function cookBands(prep) {
  const b = prep === 'steam' ? TUNING.steam : TUNING.simmer;
  return [b.cook, b.cook + b.perfect, b.cook + b.perfect + b.over];
}

/** Whether a pot slot counts as stirred: an arm works it, or the Auto-Stir Anemone does. */
export function isStirred(state, stationId) {
  if (state.upgrades.autoStir) return true;
  return state.arms.some((a) => a.state === 'stir' && a.station === stationId);
}

/** 0..1 progress toward the perfect window, for the station rings and the "about to be perfect" cue. */
export function cookProgress(item) {
  if (!item) return 0;
  if (item.prep === 'chop') return Math.min(1, item.t / TUNING.chopTime);
  if (item.prep === 'sear') {
    const s = TUNING.sear;
    return item.flipped ? 0.5 + 0.5 * Math.min(1, item.t / s.sideB) : 0.5 * Math.min(1, item.t / s.sideA);
  }
  return Math.min(1, item.t / cookBands(item.prep)[0]);
}

/** Seconds left in the perfect window, or in the flip window for the grill. */
export function windowLeft(item) {
  if (!item) return 0;
  if (item.prep === 'sear') {
    const s = TUNING.sear;
    if (item.phase === 'flip') return s.sideA + s.flipWindow - item.t;
    if (item.phase === 'perfect') return s.sideB + s.perfect - item.t;
    return 0;
  }
  if (item.phase === 'perfect') return cookBands(item.prep)[1] - item.t;
  return 0;
}

/** Advances one cooking item and records phase changes as events. */
function cookItem(state, stationId, slotIndex, item, dt) {
  const at = SLOT_TARGETS[stationId][slotIndex];
  const before = item.phase;
  if (item.prep === 'chop') {
    const worker = state.arms.find((a) => a.state === 'chop' && a.station === stationId);
    if (!worker || worker.reach > 0) return;
    const base = TUNING.chopTime / (state.upgrades.quickArms ? TUNING.quickChopTime : TUNING.chopTime);
    const rate = state.ink.active ? base * TUNING.inkChopBoost : base;
    item.t += dt * rate;
    if (Math.floor((item.t - dt * rate) / 0.32) !== Math.floor(item.t / 0.32)) state.emit({ type: 'chop', ...at });
    if (item.t >= TUNING.chopTime) {
      item.phase = 'done';
      state.stations[stationId].slots[slotIndex] = null;
      holdItem(state, worker, { ing: item.ing, prep: 'chop', quality: 'good' });
      sendArm(state, worker, at);
      state.emit({ type: 'chopDone', ...at, ing: item.ing });
    }
    return;
  }
  if (item.prep === 'sear') {
    const s = TUNING.sear;
    item.t += dt;
    if (!item.flipped) {
      if (item.phase === 'cook' && item.t >= s.sideA) item.phase = 'flip';
      if (item.phase === 'flip' && item.t >= s.sideA + s.flipWindow) item.phase = 'burnt';
    } else {
      if (item.phase === 'cook' && item.t >= s.sideB) item.phase = 'perfect';
      if (item.phase === 'perfect' && item.t >= s.sideB + s.perfect) item.phase = 'over';
      if (item.phase === 'over' && item.t >= s.sideB + s.perfect + s.over) item.phase = 'burnt';
    }
  } else {
    const bands = cookBands(item.prep);
    const hot = item.t >= bands[0];
    const rate = item.prep === 'simmer' && hot && !isStirred(state, stationId) ? TUNING.simmer.unstirredRate : 1;
    item.t += dt * rate;
    item.phase = item.t < bands[0] ? 'cook' : item.t < bands[1] ? 'perfect' : item.t < bands[2] ? 'over' : 'burnt';
  }
  if (item.phase !== before) {
    const map = { flip: 'flipReady', perfect: 'cookPerfect', over: 'overdone', burnt: 'cookBurnt' };
    if (map[item.phase]) state.emit({ type: map[item.phase], station: stationId, slot: slotIndex, ...at, ing: item.ing });
    if (item.phase === 'burnt') {
      state.stats.burnt++;
      releaseStirrer(state, stationId);
    }
  }
}

/** Frees any arm stirring a pot whose food is gone or burnt. */
function releaseStirrer(state, stationId) {
  for (const arm of state.arms) if (arm.state === 'stir' && arm.station === stationId) releaseArm(state, arm);
}

/** Advances every station by dt. */
export function updateStations(state, dt) {
  for (const [id, st] of Object.entries(state.stations)) {
    if (st.locked) continue;
    st.slots.forEach((item, i) => {
      if (item && item.phase !== 'burnt') cookItem(state, id, i, item, dt);
    });
  }
}

/** Quality of food taken from a station. */
function qualityOf(item) {
  return item.phase === 'perfect' ? 'perfect' : 'ok';
}

/** Whether a station slot holds food that can be served now. */
export function isUsable(item) {
  return !!item && (item.phase === 'perfect' || item.phase === 'over');
}

/** Places the newest suitable held item in a free slot of the station. */
export function placeAtStation(state, stationId, slotIndex = null) {
  const st = state.stations[stationId];
  const free = slotIndex ?? st.slots.findIndex((s) => s === null);
  if (free < 0 || st.slots[free]) return { ok: false, reason: `${STATION_KINDS[stationId].name} is full` };
  const arm = state.arms
    .filter((a) => a.state === 'hold' && a.item.prep === null && allowsPrep(a.item.ing, st.prep))
    .sort((a, b) => b.heldAt - a.heldAt)[0];
  if (!arm) return { ok: false, reason: 'Nothing to put there' };
  const at = SLOT_TARGETS[stationId][free];
  st.slots[free] = newCook(arm.item.ing, st.prep);
  const ing = arm.item.ing;
  arm.item = null;
  sendArm(state, arm, at);
  const keepsWorking = WORKING_PREPS.has(st.prep) && !(st.prep === 'simmer' && state.upgrades.autoStir);
  arm.state = keepsWorking ? (st.prep === 'chop' ? 'chop' : 'stir') : 'idle';
  arm.station = keepsWorking ? stationId : null;
  state.emit({ type: 'place', station: stationId, ...at, ing });
  return { ok: true };
}

/** Takes ready food from a slot into an arm (the pot's stirring arm takes its own pot's food). */
export function takeFromStation(state, stationId, slotIndex) {
  const st = state.stations[stationId];
  const item = st.slots[slotIndex];
  if (!isUsable(item)) return { ok: false, reason: 'Not ready yet' };
  const at = SLOT_TARGETS[stationId][slotIndex];
  const arm = state.arms.find((a) => a.state === 'stir' && a.station === stationId) ?? freeArmNear(state, at);
  if (!arm) return { ok: false, reason: 'No free arm!', noArm: true };
  const quality = qualityOf(item);
  st.slots[slotIndex] = null;
  holdItem(state, arm, { ing: item.ing, prep: item.prep, quality });
  sendArm(state, arm, at);
  state.emit({ type: 'take', station: stationId, ...at, ing: item.ing, quality });
  if (quality === 'perfect') {
    state.stats.perfectCooks++;
    chargeInk(state, TUNING.inkPerfectTake);
  }
  return { ok: true };
}

/** Flips a grill item that is in its flip window. */
export function flipGrill(state, slotIndex) {
  const item = state.stations.grill.slots[slotIndex];
  if (!item || item.phase !== 'flip') return { ok: false, reason: 'Nothing to flip' };
  const at = SLOT_TARGETS.grill[slotIndex];
  const arm = freeArmNear(state, at);
  if (!arm) return { ok: false, reason: 'No free arm to flip!', noArm: true };
  item.flipped = true;
  item.t = 0;
  item.phase = 'cook';
  sendArm(state, arm, at);
  state.emit({ type: 'flip', station: 'grill', ...at, ing: item.ing });
  return { ok: true };
}

/** Starts or stops an arm stirring a pot. */
export function toggleStir(state, stationId) {
  const item = state.stations[stationId].slots[0];
  const stirrer = state.arms.find((a) => a.state === 'stir' && a.station === stationId);
  if (stirrer) {
    releaseArm(state, stirrer);
    return { ok: true, info: 'Stopped stirring' };
  }
  if (!item || item.phase === 'burnt') return { ok: false, reason: 'The pot is empty' };
  const at = SLOT_TARGETS[stationId][0];
  const arm = freeArmNear(state, at);
  if (!arm) return { ok: false, reason: 'No free arm to stir!', noArm: true };
  arm.state = 'stir';
  arm.station = stationId;
  sendArm(state, arm, at);
  return { ok: true, info: 'Stirring' };
}

/** Clears a burnt slot into the ink bin. */
export function clearBurnt(state, stationId, slotIndex) {
  const item = state.stations[stationId].slots[slotIndex];
  if (!item || item.phase !== 'burnt') return false;
  state.stations[stationId].slots[slotIndex] = null;
  state.emit({ type: 'trash', ...SLOT_TARGETS[stationId][slotIndex], ing: item.ing });
  return true;
}

/**
 * The one-key station interaction (Q W E R or a click): flip if a flip is due, clear burnt food,
 * take ready food, place a suitable held item, and for a pot, toggle stirring.
 */
export function useStation(state, stationId, slotIndex = null) {
  const st = state.stations[stationId];
  if (!st || st.locked) return { ok: false, reason: 'Buy the Second Bubble Pot upgrade' };
  const slots = slotIndex === null ? st.slots.map((_, i) => i) : [slotIndex];
  if (stationId === 'grill') {
    const flip = slots.find((i) => st.slots[i]?.phase === 'flip');
    if (flip !== undefined) return flipGrill(state, flip);
  }
  const burnt = slots.find((i) => st.slots[i]?.phase === 'burnt');
  if (burnt !== undefined) {
    clearBurnt(state, stationId, burnt);
    return { ok: true, info: 'Burnt food binned' };
  }
  const ready = slots.find((i) => isUsable(st.slots[i]));
  if (ready !== undefined) return takeFromStation(state, stationId, ready);
  const free = slots.find((i) => st.slots[i] === null);
  if (free !== undefined) {
    const res = placeAtStation(state, stationId, free);
    if (res.ok || st.prep !== 'simmer') return res;
  }
  if (st.prep === 'simmer') return toggleStir(state, stationId);
  return { ok: false, reason: free === undefined ? `${STATION_KINDS[stationId].name} is busy` : 'Nothing to put there' };
}

/** Display name of a station item, like "Sand Rice (steaming)". */
export function describeCook(item) {
  const name = INGREDIENT[item.ing].name;
  const words = { chop: 'chopping', cook: 'cooking', flip: 'FLIP!', perfect: 'perfect', over: 'overdone', burnt: 'burnt' };
  return `${name} (${words[item.phase] ?? item.phase})`;
}
