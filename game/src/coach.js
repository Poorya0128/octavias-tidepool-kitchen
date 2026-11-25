/**
 * The first-shift coach. On the very first night it reads the kitchen every step and says what
 * to do next for the selected ticket, with the key to press and the spot to point at. Once two
 * dishes are served it says goodbye and retires (the app then saves `coachDone`).
 */

import { LAYOUT, SLOT_TARGETS } from './config.js';
import { CUSTOMERS } from './data/customers.js';
import { INGREDIENTS } from './data/ingredients.js';
import { RECIPE } from './data/recipes.js';
import { binPoint, holdingArms } from './arms.js';
import { missingParts, slotPoint, ticketForPlate } from './orders.js';

/** The lesson lasts this many served dishes; the goodbye stays up this many seconds. */
const LESSON_DISHES = 2;
const GOODBYE_TIME = 3;

/** Each preparation's stations, the key that works them and the coach's verb. */
const HOW = {
  chop: { stations: ['board'], key: 'Q', verb: 'Chop' },
  simmer: { stations: ['pot0', 'pot1'], key: 'W', verb: 'Simmer' },
  sear: { stations: ['grill'], key: 'E', verb: 'Sear' },
  steam: { stations: ['steamer'], key: 'R', verb: 'Steam' },
};
const STATION_KEY = { board: 'Q', pot0: 'W', pot1: 'W', grill: 'E', steamer: 'R' };
const PLATE_AT = { x: LAYOUT.plate.x, y: LAYOUT.plate.y - 12 };
const INK_AT = { x: LAYOUT.ink.x + LAYOUT.ink.w / 2, y: LAYOUT.ink.y + LAYOUT.ink.h / 2 };

/** A hint; `step` of `total` is the dish's progress (0 of 0 when the hint is about no dish). */
const hint = (text, target = null, key = null, step = 0, total = 0) => ({ step, total, text, target, key });

/** Food on the stations as { id, slot, item }. */
function stationFood(state) {
  return Object.entries(state.stations).flatMap(([id, st]) => st.slots.map((item, slot) => ({ id, slot, item }))).filter((f) => f.item);
}

/** Where held food for a preparation goes: the first free slot of its stations. */
function stationPoint(state, prep) {
  for (const id of HOW[prep].stations) {
    const slot = state.stations[id].locked ? -1 : state.stations[id].slots.indexOf(null);
    if (slot >= 0) return SLOT_TARGETS[id][slot];
  }
  return SLOT_TARGETS[HOW[prep].stations[0]][0];
}

/** The best next move over the dish's missing parts: take ready food, lay held food, cook it, grab it, else wait. */
function partHint(state, recipe, say) {
  const held = holdingArms(state).map((a) => a.item);
  const food = stationFood(state).filter((f) => f.item.phase !== 'burnt');
  const claim = (list, test) => { const i = list.findIndex(test); return i < 0 ? null : list.splice(i, 1)[0]; };
  let best = null;
  const offer = (rank, text, target, key) => { if (!best || rank < best.rank) best = { rank, text, target, key }; };
  for (const [ing, prep] of missingParts(recipe.id, state.plate.parts)) {
    if (claim(held, (it) => it.ing === ing && it.prep === prep)) {
      offer(1, 'Lay it on the Clam Plate: press Space', PLATE_AT, 'Space');
      continue;
    }
    const at = claim(food, (f) => f.item.ing === ing && f.item.prep === prep);
    if (at) {
      const key = STATION_KEY[at.id];
      const point = SLOT_TARGETS[at.id][at.slot];
      if (at.item.phase === 'perfect') offer(0, `PERFECT! Press ${key} to take it`, point, key);
      else if (at.item.phase === 'over') offer(0, `Take it before it burns: press ${key}`, point, key);
      else if (at.item.phase === 'chop') offer(4, 'An arm is chopping it: one moment', point, null);
      else if (prep === 'sear' && !at.item.flipped) offer(4, 'Wait for FLIP!, then press E', point, 'E');
      else offer(4, `Wait for PERFECT, then press ${key} to take it`, point, key);
      continue;
    }
    if (HOW[prep] && claim(held, (it) => it.ing === ing && it.prep === null)) {
      offer(2, `${HOW[prep].verb} it: press ${HOW[prep].key}`, stationPoint(state, prep), HOW[prep].key);
      continue;
    }
    const i = INGREDIENTS.findIndex((x) => x.id === ing);
    offer(3, `Grab ${INGREDIENTS[i].name}: press ${INGREDIENTS[i].key} or click its crate`, binPoint(i), INGREDIENTS[i].key);
  }
  return say(best.text, best.target, best.key);
}

/**
 * The coach's hint for the live kitchen: `{ step, total, text, target: {x, y} | null, key }`,
 * or null once the lesson and its goodbye are over. Urgent food comes first, then the Ink
 * Burst, a plate to serve, and the next step of the selected ticket's dish.
 */
export function coachHint(state) {
  if (state.stats.served >= LESSON_DISHES) {
    return state.time - (state.moments.serve ?? 0) < GOODBYE_TIME ? hint("You're a natural, Chef! The kitchen is all yours.") : null;
  }
  const ticket = state.tickets.find((t) => t.id === state.selectedTicket);
  const recipe = RECIPE[state.plate.recipeId ?? ticket?.recipeId];
  const say = (text, target, key) => hint(text, target, key, recipe ? state.plate.parts.length + 1 : 0, recipe ? recipe.parts.length + 2 : 0);
  const urgent = stationFood(state).find((f) => f.item.phase === 'flip' || f.item.phase === 'burnt');
  if (urgent) {
    const key = STATION_KEY[urgent.id];
    const point = SLOT_TARGETS[urgent.id][urgent.slot];
    return urgent.item.phase === 'flip' ? say('FLIP! Press E before it chars', point, 'E') : say(`Burnt! Press ${key} to clear it`, point, key);
  }
  if (state.ink.meter >= 1 && !state.ink.active) return say('Press I for an Ink Burst!', INK_AT, 'I');
  const ready = state.pass.findIndex((p) => ticketForPlate(state, p));
  if (ready >= 0) {
    const plate = state.pass[ready];
    const total = RECIPE[plate.recipeId].parts.length + 2;
    return hint(`Serve ${CUSTOMERS[ticketForPlate(state, plate).customerId].name}: press S`, slotPoint(ready), 'S', total, total);
  }
  if (!recipe) return hint(state.stats.served ? 'Nice! The next diner is swimming in...' : 'Welcome, Chef! Your first diner is swimming in...');
  if (!missingParts(recipe.id, state.plate.parts).length) return say(`Finish the dish: press Space to ${recipe.finish}`, PLATE_AT, 'Space');
  return partHint(state, recipe, say);
}

/** Refreshes `state.coach` every step; after the goodbye the coach retires with a `coachDone` event. */
export function updateCoach(state) {
  state.coach = coachHint(state);
  if (state.coach) return;
  state.coaching = false;
  state.emit({ type: 'coachDone' });
}
