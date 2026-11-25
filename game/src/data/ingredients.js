/**
 * The ten reef ingredients on Octavia's counter, their hotkeys and the preparations they allow,
 * and the stations that perform each preparation.
 */

/** Preparations: 'raw' goes straight to the plate, the others need a station. */
export const PREPS = {
  raw: { label: 'ready', station: null },
  chop: { label: 'chopped', station: 'board' },
  simmer: { label: 'simmered', station: 'pot' },
  sear: { label: 'seared', station: 'grill' },
  steam: { label: 'steamed', station: 'steamer' },
};

export const INGREDIENTS = [
  { id: 'kelp', name: 'Kelp Ribbon', key: '1', color: '#4caf6a', preps: ['chop'] },
  { id: 'grape', name: 'Sea-Grape', key: '2', color: '#6fd3a8', preps: ['raw'] },
  { id: 'salt', name: 'Coral Salt', key: '3', color: '#ff9aa8', preps: ['raw'] },
  { id: 'jelly', name: 'Moon Jelly', key: '4', color: '#c9b8ff', preps: ['steam'] },
  { id: 'pearl', name: 'Glow Pearls', key: '5', color: '#7ff0ff', preps: ['raw'] },
  { id: 'rice', name: 'Sand Rice', key: '6', color: '#f6ead2', preps: ['steam', 'sear'] },
  { id: 'shroom', name: 'Driftwood Mushroom', key: '7', color: '#b98a5e', preps: ['sear', 'chop'] },
  { id: 'milk', name: 'Bubble Milk', key: '8', color: '#e8f4ff', preps: ['simmer'] },
  { id: 'urchin', name: 'Sun-Urchin Fruit', key: '9', color: '#ff9f1c', preps: ['chop'] },
  { id: 'pepper', name: 'Tide Pepper', key: '0', color: '#e63946', preps: ['sear'] },
];

/** Ingredient lookup by id. */
export const INGREDIENT = Object.fromEntries(INGREDIENTS.map((ing) => [ing.id, ing]));

/** Whether an ingredient can be prepared the way a station prepares food. */
export function allowsPrep(ingId, prep) {
  return INGREDIENT[ingId].preps.includes(prep);
}
