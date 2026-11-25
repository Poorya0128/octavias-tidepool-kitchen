/**
 * Tickets on the Current Board, the customers behind them, the Clam Plate where dishes are
 * assembled, and the Current Window where finished plates wait to be served.
 */

import { LAYOUT, TUNING } from './config.js';
import { CUSTOMERS } from './data/customers.js';
import { RECIPE } from './data/recipes.js';
import { ARM_HOLD, holdingArms, releaseArm, sendArm } from './arms.js';
import { chargeInk, spillInk } from './ink.js';
import { criticLiveStars, criticVerdict, scoreServe } from './scoring.js';

const PLATE_POINT = { x: LAYOUT.plate.x, y: LAYOUT.plate.y - 12 };

/** A customer speaks a voice line; it is chosen by ticket id so the seeded draws stay untouched. */
function say(state, ticket, kind) {
  const lines = CUSTOMERS[ticket.customerId].lines[kind];
  state.speech.push({ ticketId: ticket.id, customerId: ticket.customerId, kind, text: lines[ticket.id % lines.length], at: state.time });
  if (state.speech.length > 6) state.speech.shift();
}

/** Adds a ticket for a customer; twins share a pair id. */
export function spawnTicket(state, customerId, recipeId, pairId = null) {
  const customer = CUSTOMERS[customerId];
  const calm = state.upgrades.calmingCoral ? 1 / TUNING.calmingDrain : 1;
  const ticket = {
    id: state.nextTicketId++, customerId, recipeId, pairId,
    patience: customer.patience, maxPatience: customer.patience, drain: 1 / calm,
    born: state.time, changed: false, grumbled: false, critic: !!customer.vip,
  };
  state.tickets.push(ticket);
  if (state.selectedTicket === null) state.selectedTicket = ticket.id;
  state.emit({ type: 'spawn', ticket: ticket.id, customer: customerId });
  say(state, ticket, 'arrive');
  return ticket;
}

/** Spawns the next regular from the night's weighted pool; the twins arrive as two tickets. */
export function spawnRegular(state) {
  const cfg = state.cfg;
  const menu = cfg.recipes;
  let customerId = state.rng.weighted(cfg.customers);
  if (customerId === 'twins' && state.tickets.length + 2 > state.maxTickets) customerId = 'puffy';
  if (customerId === 'twins') {
    const pair = state.nextTicketId;
    spawnTicket(state, 'twins', state.rng.pick(menu), pair);
    spawnTicket(state, 'twins', state.rng.pick(menu), pair);
    return;
  }
  spawnTicket(state, customerId, state.rng.pick(menu));
}

/** Madame Mantis arrives with her standing order, the Grand Reef Platter. */
export function spawnCritic(state) {
  spawnTicket(state, 'mantis', 'platter');
  state.emit({ type: 'criticArrives' });
}

/** Share of patience left on a ticket, 0..1. */
export function patienceShare(ticket) {
  return Math.max(0, ticket.patience / ticket.maxPatience);
}

/**
 * Drains patience (held while an Ink Burst flows), lets Shelby change her mind once, has each
 * customer grumble once when patience runs low, and walks out customers who waited too long.
 */
export function updateTickets(state, dt) {
  for (const ticket of [...state.tickets]) {
    if (!state.ink.active) ticket.patience -= dt * ticket.drain;
    if (ticket.customerId === 'shelby' && !ticket.changed && patienceShare(ticket) <= TUNING.shelbyChangeAt) {
      const options = state.cfg.recipes.filter((r) => r !== ticket.recipeId);
      ticket.recipeId = state.rng.pick(options);
      ticket.changed = true;
      ticket.patience = Math.min(ticket.maxPatience, ticket.patience + TUNING.shelbyPatienceGift);
      state.stats.ordersChanged++;
      state.emit({ type: 'orderChanged', ticket: ticket.id });
      state.toast('Shelby swapped shells and changed her order!', '#ffd166');
    }
    if (!ticket.grumbled && patienceShare(ticket) < TUNING.grumbleAt) {
      ticket.grumbled = true;
      say(state, ticket, 'wait');
    }
    if (ticket.patience <= 0) missTicket(state, ticket);
  }
  const critic = state.tickets.find((t) => t.critic);
  state.critic.live = critic ? criticLiveStars(patienceShare(critic)) : null;
}

/** A customer leaves unserved: the Ink Streak breaks and half the ink spills. */
function missTicket(state, ticket) {
  removeTicket(state, ticket.id);
  state.stats.missed++;
  if (state.streak > 0) state.emit({ type: 'streakBroken' });
  state.streak = 0;
  spillInk(state);
  if (ticket.critic) state.critic.reviews.push(1);
  state.emit({ type: 'miss', ticket: ticket.id, customer: ticket.customerId });
  say(state, ticket, 'angry');
  state.toast(`${CUSTOMERS[ticket.customerId].name} swam off hungry`, '#ef5b4c');
}

function removeTicket(state, id) {
  state.tickets = state.tickets.filter((t) => t.id !== id);
  if (state.selectedTicket === id) state.selectedTicket = state.tickets[0]?.id ?? null;
}

/** Selects a ticket by id, or the next one on the board for 'next'. */
export function selectTicket(state, id) {
  if (!state.tickets.length) return { ok: false, reason: 'No tickets yet' };
  if (id === 'next') {
    const i = state.tickets.findIndex((t) => t.id === state.selectedTicket);
    state.selectedTicket = state.tickets[(i + 1) % state.tickets.length].id;
  } else if (state.tickets.some((t) => t.id === id)) {
    state.selectedTicket = id;
  } else {
    return { ok: false, reason: 'That customer has left' };
  }
  state.emit({ type: 'select' });
  return { ok: true };
}

/** The parts of the plate's recipe that are still missing. */
export function missingParts(recipeId, plateParts) {
  const left = [...plateParts];
  return RECIPE[recipeId].parts.filter(([ing, prep]) => {
    const i = left.findIndex((p) => p.ing === ing && p.prep === prep);
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
}

/** Whether a held item fills a missing part of a recipe. */
function fits(recipeId, plateParts, item) {
  return missingParts(recipeId, plateParts).some(([ing, prep]) => ing === item.ing && prep === item.prep);
}

/** The recipe the plate should build when it is empty: the selected ticket's, else any ticket a held item fits. */
function chooseRecipe(state, held) {
  const order = [...state.tickets].sort((a, b) => (a.id === state.selectedTicket ? -1 : b.id === state.selectedTicket ? 1 : 0));
  for (const ticket of order) {
    if (held.some((arm) => fits(ticket.recipeId, [], arm.item))) return ticket;
  }
  return null;
}

/**
 * The Clam Plate (Space or a click): finish a complete dish onto the pass, or lay every held
 * item the dish needs onto the plate.
 */
export function usePlate(state) {
  const plate = state.plate;
  if (plate.recipeId && missingParts(plate.recipeId, plate.parts).length === 0) return finishPlate(state);
  const held = holdingArms(state);
  if (!plate.recipeId) {
    const ticket = chooseRecipe(state, held);
    if (!ticket) return { ok: false, reason: held.length ? 'No ticket needs that' : 'Hold something first' };
    plate.recipeId = ticket.recipeId;
    state.selectedTicket = ticket.id;
  }
  let placed = 0;
  for (const arm of held) {
    if (!fits(plate.recipeId, plate.parts, arm.item)) continue;
    plate.parts.push(arm.item);
    state.emit({ type: 'plateAdd', ...PLATE_POINT, ing: arm.item.ing });
    releaseArm(state, arm);
    sendArm(state, arm, PLATE_POINT);
    placed++;
  }
  if (!placed) return { ok: false, reason: 'Nothing held fits this dish' };
  return { ok: true };
}

/** Finishing step: the plate moves to the Current Window if there is room. */
export function finishPlate(state) {
  const plate = state.plate;
  const slots = state.upgrades.biggerPlate ? TUNING.biggerPassSlots : TUNING.passSlots;
  if (state.pass.length >= slots) return { ok: false, reason: 'The Current Window is full: serve first' };
  const recipe = RECIPE[plate.recipeId];
  const warmth = state.upgrades.biggerPlate ? TUNING.biggerPlateWarmth : TUNING.plateWarmth;
  state.pass.push({ id: state.nextPlateId++, recipeId: plate.recipeId, parts: plate.parts, warmth, maxWarmth: warmth });
  state.emit({ type: 'finish', ...PLATE_POINT, recipe: recipe.id, word: recipe.finish });
  plate.recipeId = null;
  plate.parts = [];
  return { ok: true };
}

/** Plates on the pass cool down; a cold plate loses its perfect tips. */
export function updatePass(state, dt) {
  for (const p of state.pass) p.warmth = Math.max(0, p.warmth - dt);
}

/** The ticket a pass plate would go to: the selected one if it matches, else the most impatient match. */
export function ticketForPlate(state, passPlate) {
  const matches = state.tickets.filter((t) => t.recipeId === passPlate.recipeId);
  if (!matches.length) return null;
  return matches.find((t) => t.id === state.selectedTicket) ?? matches.sort((a, b) => a.patience - b.patience)[0];
}

/** Serves a plate from the pass (S or a click on it) to its matching ticket. */
export function servePass(state, index = null) {
  if (!state.pass.length) return { ok: false, reason: 'No plate is ready' };
  const order = index === null ? state.pass.map((_, i) => i) : [index];
  const i = order.find((k) => state.pass[k] && ticketForPlate(state, state.pass[k]));
  if (i === undefined) return { ok: false, reason: 'Nobody ordered that dish' };
  const plate = state.pass[i];
  const ticket = ticketForPlate(state, plate);
  const customer = CUSTOMERS[ticket.customerId];
  const share = patienceShare(ticket);
  const cold = plate.warmth <= 0;
  const result = scoreServe({ recipe: RECIPE[plate.recipeId], customer, parts: plate.parts, patienceFrac: share, cold, streak: state.streak });
  state.pass.splice(i, 1);
  removeTicket(state, ticket.id);
  state.coins += result.total;
  state.stats.served++;
  state.stats.tips += result.speedTip + result.perfectTip;
  state.streak = result.nextStreak;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  if (result.perfect) chargeInk(state, TUNING.inkPerfectServe);
  if (ticket.critic) {
    const stars = criticVerdict(plate.parts, share, cold);
    state.critic.reviews.push(stars);
    state.emit({ type: 'criticVerdict', stars });
  }
  if (ticket.pairId !== null) twinBonus(state, ticket.pairId);
  const slot = slotPoint(i);
  state.emit({ type: 'serve', ...slot, coins: result.total, perfect: result.perfect, mult: result.mult, ticket: ticket.id, customer: ticket.customerId, streak: state.streak });
  say(state, ticket, 'happy');
  if (cold) state.toast('Cold plate: no perfect tip', '#9fc7d6');
  return { ok: true, result };
}

/** The Seahorse Twins tip extra when both of their plates arrive close together. */
function twinBonus(state, pairId) {
  const first = state.twinsServed[pairId];
  if (first === undefined) {
    state.twinsServed[pairId] = state.time;
    return;
  }
  if (state.time - first <= TUNING.twinsWindow) {
    state.coins += TUNING.twinsBonus;
    state.stats.twins++;
    state.emit({ type: 'twinBonus', ...slotPoint(0), coins: TUNING.twinsBonus });
    state.toast(`Twin bonus +${TUNING.twinsBonus}`, '#7fd1b9');
  }
  delete state.twinsServed[pairId];
}

/** Centre of a plate slot in the Current Window. */
export function slotPoint(i) {
  const p = LAYOUT.pass;
  return { x: p.x + p.w / 2, y: p.y + 118 + i * 124 };
}

/**
 * Backspace: drop the newest held item, else bin burnt food, else clear the plate, else bin a
 * plate nobody ordered. Everything goes into the ink jar with a puff.
 */
export function trash(state, clearBurnt) {
  const held = holdingArms(state)[0];
  const jar = { x: LAYOUT.trash.x + LAYOUT.trash.w / 2, y: LAYOUT.trash.y + 20 };
  if (held) {
    state.emit({ type: 'trash', ...ARM_HOLD[held.id], ing: held.item.ing });
    releaseArm(state, held);
    sendArm(state, held, jar);
    return { ok: true };
  }
  for (const [id, st] of Object.entries(state.stations)) {
    const i = st.slots.findIndex((s) => s?.phase === 'burnt');
    if (i >= 0 && clearBurnt(state, id, i)) return { ok: true };
  }
  if (state.plate.parts.length) {
    state.emit({ type: 'trash', ...PLATE_POINT });
    state.plate.parts = [];
    state.plate.recipeId = null;
    return { ok: true };
  }
  const stray = state.pass.findIndex((p) => !ticketForPlate(state, p));
  if (stray >= 0) {
    state.emit({ type: 'trash', ...slotPoint(stray) });
    state.pass.splice(stray, 1);
    return { ok: true };
  }
  return { ok: false, reason: 'Nothing to bin' };
}
