/**
 * The bistro's regulars. Patience is in seconds; each one bends the rules a little.
 */

export const CUSTOMERS = {
  puffy: {
    id: 'puffy', name: 'Puffy', species: 'pufferfish', patience: 50, perfectTipMul: 1,
    trait: 'Puffs up as patience runs out',
  },
  shelby: {
    id: 'shelby', name: 'Shelby', species: 'hermit crab', patience: 58, perfectTipMul: 1,
    trait: 'Swaps shells and changes her order once',
  },
  twins: {
    id: 'twins', name: 'Seahorse Twins', species: 'seahorses', patience: 62, perfectTipMul: 1,
    trait: 'Two linked tickets: serve both together for a bonus',
  },
  tortuga: {
    id: 'tortuga', name: 'Old Tortuga', species: 'sea turtle', patience: 88, perfectTipMul: 2,
    trait: 'Endlessly patient, tips double for perfect cooking',
  },
  mantis: {
    id: 'mantis', name: 'Madame Mantis', species: 'mantis shrimp', patience: 76, perfectTipMul: 2, vip: true,
    trait: 'The food critic: her star rating is shown live',
  },
};
