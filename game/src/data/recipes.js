/**
 * The eight dishes of the reef bistro. Each part is an ingredient with the preparation it needs;
 * the finishing step (Roll, Ladle, Toss...) is done on the Clam Plate once every part is there.
 */

export const RECIPES = [
  {
    id: 'kelpRoll', name: 'Kelp Roll', price: 16, finish: 'Roll',
    parts: [['rice', 'steam'], ['kelp', 'chop'], ['salt', 'raw']],
  },
  {
    id: 'pearlBowl', name: 'Pearl Rice Bowl', price: 17, finish: 'Garnish',
    parts: [['rice', 'steam'], ['shroom', 'sear'], ['pearl', 'raw']],
  },
  {
    id: 'broth', name: 'Bubble Broth', price: 17, finish: 'Ladle',
    parts: [['milk', 'simmer'], ['kelp', 'chop'], ['shroom', 'chop']],
  },
  {
    id: 'toast', name: 'Coral Toast', price: 12, finish: 'Top',
    parts: [['rice', 'sear'], ['urchin', 'chop']],
  },
  {
    id: 'pudding', name: 'Moon Jelly Pudding', price: 18, finish: 'Set',
    parts: [['jelly', 'steam'], ['milk', 'simmer'], ['pearl', 'raw']],
  },
  {
    id: 'skewer', name: 'Tide Pepper Skewer', price: 18, finish: 'Skewer',
    parts: [['pepper', 'sear'], ['shroom', 'sear'], ['grape', 'raw']],
  },
  {
    id: 'salad', name: 'Lagoon Salad', price: 20, finish: 'Toss',
    parts: [['kelp', 'chop'], ['urchin', 'chop'], ['grape', 'raw'], ['salt', 'raw']],
  },
  {
    id: 'platter', name: 'Grand Reef Platter', price: 34, finish: 'Plate Up', vip: true,
    parts: [['rice', 'steam'], ['pepper', 'sear'], ['urchin', 'chop'], ['jelly', 'steam']],
  },
];

/** Recipe lookup by id. */
export const RECIPE = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Steps shown on a ticket: every part plus the finishing step. */
export function recipeSteps(recipe) {
  return recipe.parts.length + 1;
}
