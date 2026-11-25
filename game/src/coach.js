/**
 * The first-shift coach. On the very first night it reads the kitchen every step and says what
 * to do next for the selected ticket, with the key to press and the spot to point at. Once two
 * dishes are served it says goodbye and retires (the app then saves `coachDone`).
 */

import { LAYOUT, SLOT_TARGETS } from './config.js';
import { CUSTOMERS } from './data/customers.js';
import { INGREDIENT, INGREDIENTS } from './data/ingredients.js';
import { RECIPE } from './data/recipes.js';
import { binPoint, holdingArms } from './arms.js';
import { missingParts, slotPoint, ticketForPlate } from './orders.js';
import { STATION_KINDS } from './stations.js';

/** The lesson lasts this many served dishes; the goodbye stays up this many seconds. */
const LESSON_DISHES = 2;
const GOODBYE_TIME = 3;

/** Each preparation's stations, the key that works them, the coach's verb and where it happens. */
const HOW = {
  chop: { stations: ['board'], key: 'Q', verb: 'Chop', where: 'on the Shell Board' },
  simmer: { stations: ['pot0', 'pot1'], key: 'W', verb: 'Simmer', where: 'in a Bubble Pot' },
  sear: { stations: ['grill'], key: 'E', verb: 'Sear', where: 'on the Vent Grill' },
  steam: { stations: ['steamer'], key: 'R', verb: 'Steam', where: 'in the Kelp Steamer' },
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

/**
 * The best next move over the dish's missing parts: take ready food, lay held food, cook it, grab
 * it, else wait. The bubble shows the key, so texts never say "press"; waits carry no key (a W
 * pressed too early would stop the stirring).
 */
function partHint(state, recipe, say) {
  const held = holdingArms(state).map((a) => a.item);
  const food = stationFood(state).filter((f) => f.item.phase !== 'burnt');
  const claim = (list, test) => { const i = list.findIndex(test); return i < 0 ? null : list.splice(i, 1)[0]; };
  let best = null;
  const offer = (rank, text, target, key) => { if (!best || rank < best.rank) best = { rank, text, target, key }; };
  for (const [ing, prep] of missingParts(recipe.id, state.plate.parts)) {
    const name = INGREDIENT[ing].name;
    if (claim(held, (it) => it.ing === ing && it.prep === prep)) {
      offer(1, `Lay the ${name} on the Clam Plate`, PLATE_AT, 'Space');
      continue;
    }
    const at = claim(food, (f) => f.item.ing === ing && f.item.prep === prep);
    if (at) {
      const key = STATION_KEY[at.id];
      const point = SLOT_TARGETS[at.id][at.slot];
      if (at.item.phase === 'perfect') offer(0, `PERFECT! Take the ${name} now`, point, key);
      else if (at.item.phase === 'over') offer(0, `Take the ${name} before it burns!`, point, key);
      else if (at.item.phase === 'chop') offer(4, `An arm is chopping the ${name}`, point, null);
      else offer(4, `Wait for ${prep === 'sear' && !at.item.flipped ? 'FLIP!' : 'PERFECT'} ${HOW[prep].where}`, point, null);
      continue;
    }
    if (HOW[prep] && claim(held, (it) => it.ing === ing && it.prep === null)) {
      offer(2, `${HOW[prep].verb} the ${name} ${HOW[prep].where}`, stationPoint(state, prep), HOW[prep].key);
      continue;
    }
    const i = INGREDIENTS.findIndex((x) => x.id === ing);
    offer(3, `Grab the ${name} from its crate`, binPoint(i), INGREDIENTS[i].key);
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
    return state.time - (state.moments.serve ?? 0) < GOODBYE_TIME ? hint("You're a natural! The kitchen is all yours.") : null;
  }
  const ticket = state.tickets.find((t) => t.id === state.selectedTicket);
  const recipe = RECIPE[state.plate.recipeId ?? ticket?.recipeId];
  const say = (text, target, key) => hint(text, target, key, recipe ? state.plate.parts.length + 1 : 0, recipe ? recipe.parts.length + 2 : 0);
  const urgent = stationFood(state).find((f) => f.item.phase === 'flip' || f.item.phase === 'burnt');
  if (urgent) {
    const key = STATION_KEY[urgent.id];
    const point = SLOT_TARGETS[urgent.id][urgent.slot];
    return urgent.item.phase === 'flip'
      ? say(`FLIP the ${INGREDIENT[urgent.item.ing].name} before it chars!`, point, 'E')
      : say(`Burnt! Clear the ${STATION_KINDS[urgent.id].name}`, point, key);
  }
  if (state.ink.meter >= 1 && !state.ink.active) return say('Ink is full! Fire an Ink Burst', INK_AT, 'I');
  const ready = state.pass.findIndex((p) => ticketForPlate(state, p));
  if (ready >= 0) {
    const plate = state.pass[ready];
    const total = RECIPE[plate.recipeId].parts.length + 2;
    return hint(`Serve the plate to ${CUSTOMERS[ticketForPlate(state, plate).customerId].name}`, slotPoint(ready), 'S', total, total);
  }
  if (!recipe) return hint(state.stats.served ? 'Nice! The next diner is swimming in...' : 'Welcome, Chef! Your first diner swims in...');
  if (!missingParts(recipe.id, state.plate.parts).length) return say(`All parts in: ${recipe.finish} the dish!`, PLATE_AT, 'Space');
  return partHint(state, recipe, say);
}

/** Refreshes `state.coach` every step; after the goodbye the coach retires with a `coachDone` event. */
export function updateCoach(state) {
  state.coach = coachHint(state);
  if (state.coach) return;
  state.coaching = false;
  state.emit({ type: 'coachDone' });
}
