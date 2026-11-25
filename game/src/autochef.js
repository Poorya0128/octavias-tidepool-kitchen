/**
 * A scripted chef that plays a night through the same `dispatch` actions as the keyboard.
 * The screenshot scenes use it to play the campaign and reach real mid-service states, and it
 * doubles as a play-through check that every night can be finished.
 */

import { RECIPE } from './data/recipes.js';
import { INGREDIENT } from './data/ingredients.js';
import { isUsable, windowLeft } from './stations.js';
import { missingParts, ticketForPlate } from './orders.js';
import { freeArmCount, holdingArms } from './arms.js';
import { createNight, dispatch, nightSummary, stepNight } from './state.js';
import { buyUpgrade, newCampaign, recordNight } from './campaign.js';

const PREP_STATIONS = { chop: ['board'], simmer: ['pot0', 'pot1'], sear: ['grill'], steam: ['steamer'] };

/** The chef's pace on each night when it plays the campaign on the way to a screenshot scene. */
const CAMPAIGN_CADENCE = [0.45, 0.8, 0.55, 0.5, 0.5];

/**
 * Creates a chef that acts at most once per `cadence` seconds, plans `focus` tickets ahead, lets
 * a finished plate sit on the pass for `serveAfter` seconds before serving it, and lets perfect
 * food glow on its station until only `takeWithin` seconds of the perfect window are left.
 */
export function createAutoChef({ cadence = 0.24, focus = 3, serveAfter = 0, takeWithin = Infinity } = {}) {
  return { cadence, focus, serveAfter, takeWithin, cooldown: 0, intents: new Map() };
}

/** Tickets the chef works on: the plate's ticket first, then the least patient whose dish is not waiting at the window. */
function focusTickets(state, chef) {
  const order = [...state.tickets].sort((a, b) => a.patience - b.patience);
  const plateTicket = state.plate.recipeId ? order.find((t) => t.recipeId === state.plate.recipeId) : null;
  const waiting = state.pass.map((p) => p.recipeId);
  const open = order.filter((t) => {
    if (t === plateTicket) return false;
    const i = waiting.indexOf(t.recipeId);
    if (i >= 0) waiting.splice(i, 1);
    return i < 0;
  });
  return (plateTicket ? [plateTicket, ...open] : open).slice(0, chef.focus);
}

/** Everything already on its way to a dish: held food and food cooking at stations. */
function pipeline(state, chef) {
  const pool = [];
  for (const arm of holdingArms(state)) pool.push({ ing: arm.item.ing, prep: arm.item.prep ?? chef.intents.get(arm.id) ?? null });
  for (const st of Object.values(state.stations)) {
    for (const item of st.slots) if (item && item.phase !== 'burnt') pool.push({ ing: item.ing, prep: item.prep });
  }
  return pool;
}

/** Parts still to start for the focus tickets, in priority order, once plate and pipeline are counted. */
function missingWork(state, chef) {
  const pool = pipeline(state, chef);
  const out = [];
  for (const ticket of focusTickets(state, chef)) {
    const onPlate = state.plate.recipeId === ticket.recipeId ? state.plate.parts : [];
    for (const [ing, prep] of missingParts(ticket.recipeId, onPlate)) {
      const i = pool.findIndex((p) => p.ing === ing && p.prep === prep);
      if (i >= 0) pool.splice(i, 1);
      else out.push({ ticket, ing, prep });
    }
  }
  return out;
}

/** A free slot for a preparation, as [stationId, slot], or null. */
function freeSlotFor(state, prep) {
  for (const id of PREP_STATIONS[prep]) {
    const st = state.stations[id];
    if (st.locked) continue;
    const slot = st.slots.findIndex((s) => s === null);
    if (slot >= 0) return [id, slot];
  }
  return null;
}

/** Whether any ticket on the board wants this ingredient prepared this way. */
function isWanted(state, ing, prep) {
  return state.tickets.some((t) => RECIPE[t.recipeId].parts.some(([i, p]) => i === ing && p === prep));
}

/** Whether a held, prepared item can go on the plate as it stands. */
function fitsPlate(state, item) {
  if (!state.plate.recipeId) return isWanted(state, item.ing, item.prep);
  return missingParts(state.plate.recipeId, state.plate.parts).some(([i, p]) => i === item.ing && p === item.prep);
}

/** The decision list: a full Ink Burst under pressure, urgent cooking, then serving, plating and new parts. */
function chooseAction(state, chef) {
  if (state.ink.meter >= 1 && !state.ink.active && state.tickets.length >= 3) return { type: 'ink' };
  const flip = state.stations.grill.slots.findIndex((s) => s?.phase === 'flip');
  if (flip >= 0 && freeArmCount(state) > 0) return { type: 'station', id: 'grill', slot: flip };
  for (const [id, st] of Object.entries(state.stations)) {
    const burnt = st.slots.findIndex((s) => s?.phase === 'burnt');
    if (burnt >= 0) return { type: 'station', id, slot: burnt };
  }
  const servable = state.pass.findIndex((p) => p.maxWarmth - p.warmth >= chef.serveAfter && ticketForPlate(state, p));
  if (servable >= 0) return { type: 'serve', index: servable };
  if (state.plate.recipeId && missingParts(state.plate.recipeId, state.plate.parts).length === 0) return { type: 'plate' };

  for (const [id, st] of Object.entries(state.stations)) {
    for (let i = 0; i < st.slots.length; i++) {
      const item = st.slots[i];
      const ripe = isUsable(item) && (item.phase === 'over' || windowLeft(item) <= chef.takeWithin);
      if (ripe && isWanted(state, item.ing, item.prep) && (freeArmCount(state) > 0 || id.startsWith('pot'))) {
        return { type: 'station', id, slot: i };
      }
    }
  }
  const held = holdingArms(state).filter((a) => a.reach <= 0.05);
  for (const arm of held) {
    if (arm.item.prep !== null) continue;
    const slot = freeSlotFor(state, chef.intents.get(arm.id) ?? INGREDIENT[arm.item.ing].preps[0]);
    if (slot) return { type: 'station', id: slot[0], slot: slot[1] };
  }
  const lead = focusTickets(state, chef)[0];
  if (!state.plate.recipeId && lead && lead.id !== state.selectedTicket && held.some((a) => a.item.prep !== null)) {
    return { type: 'select', id: lead.id };
  }
  if (held.some((a) => a.item.prep !== null && fitsPlate(state, a.item))) return { type: 'plate' };

  if (freeArmCount(state) <= 1 || held.length >= 4) return null;
  for (const part of missingWork(state, chef)) {
    if (part.prep === 'raw') {
      if (state.plate.recipeId && state.plate.recipeId !== part.ticket.recipeId) continue;
      return { type: 'grab', ing: part.ing, prep: null };
    }
    const waiting = held.some((a) => a.item.prep === null && chef.intents.get(a.id) === part.prep);
    if (!waiting && freeSlotFor(state, part.prep)) return { type: 'grab', ing: part.ing, prep: part.prep };
  }
  return null;
}

/** Picks and performs the chef's next action, if its cooldown allows. */
export function chefThink(state, chef, dt) {
  chef.cooldown -= dt;
  if (chef.cooldown > 0 || state.over) return null;
  const action = chooseAction(state, chef);
  if (!action) return null;
  chef.cooldown = chef.cadence;
  const res = dispatch(state, action);
  if (res.ok && action.type === 'grab') chef.intents.set(res.arm, action.prep ?? 'raw');
  return action;
}

/** Plays a night with the chef at a fixed step until it ends or reaches `until` seconds. */
export function simulateNight(state, chef, until = Infinity, step = 1 / 60) {
  while (!state.over && state.time < until) {
    chefThink(state, chef, step);
    stepNight(state, step);
    state.events.length = 0;
  }
  return state;
}

/** Plays the first `nights` campaign nights with the chef, banking each and buying `buys[i]` after night i. */
export function playCampaign(nights, seed, buys = {}) {
  const campaign = newCampaign();
  campaign.seenHelp = true;
  for (let i = 0; i < nights; i++) {
    const night = createNight({ nightIndex: i, upgrades: campaign.upgrades, seed: seed + i });
    simulateNight(night, createAutoChef({ cadence: CAMPAIGN_CADENCE[i], focus: 2 }));
    recordNight(campaign, nightSummary(night));
    for (const id of buys[i] ?? []) buyUpgrade(campaign, id);
  }
  return campaign;
}
