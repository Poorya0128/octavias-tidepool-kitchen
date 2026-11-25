/**
 * The bistro's regulars. Patience is in seconds; each one bends the rules a little and has a
 * few things to say on arriving, while waiting, when served and when walking out.
 */

export const CUSTOMERS = {
  puffy: {
    id: 'puffy', name: 'Puffy', species: 'pufferfish', patience: 50, perfectTipMul: 1,
    trait: 'Puffs up as patience runs out',
    lines: {
      arrive: ['Feed me before I puff!', 'Small fish, big hunger!', 'Table for one, and quick!'],
      wait: ['My spikes are showing!', 'Puff... puff... PUFF!', "I'm about to POP!"],
      happy: ['Puff-ectly delicious!', 'Ahh, deflating nicely.', 'Worth every spike!'],
      angry: ["I'll puff off, then!", 'Pop goes my patience!', 'Spiky review incoming!'],
    },
  },
  shelby: {
    id: 'shelby', name: 'Shelby', species: 'hermit crab', patience: 58, perfectTipMul: 1,
    trait: 'Swaps shells and changes her order once',
    lines: {
      arrive: ['Shell we eat?', 'New shell, who dis?', 'Fresh shell, fresh order!'],
      wait: ["I'm getting crabby...", 'Pinch me, is it ready?', 'Hmm, wrong shell today?'],
      happy: ['Claws down, the best!', 'Snappy service, darling!', "I'd move in here!"],
      angry: ["I'm shell-shocked!", 'Moving out. Again.', 'Crabbiest night ever!'],
    },
  },
  twins: {
    id: 'twins', name: 'Seahorse Twins', species: 'seahorses', patience: 62, perfectTipMul: 1,
    trait: 'Two linked tickets: serve both together for a bonus',
    lines: {
      arrive: ['Hay there! Hay there!', 'Table for two, two!', "We're hungry. Me too!"],
      wait: ['Are we there yet? Yet?', "Can't hold our horses!", 'Our tails are in knots!'],
      happy: ['Double yum! Yum yum!', 'Twice as nice! Twice!', 'Best. Meal. Best. Meal.'],
      angry: ['Off we trot. Trot!', 'Two stars. One each.', "We're leaving. Leaving!"],
    },
  },
  tortuga: {
    id: 'tortuga', name: 'Old Tortuga', species: 'sea turtle', patience: 88, perfectTipMul: 2,
    trait: 'Endlessly patient, tips double for perfect cooking',
    lines: {
      arrive: ['No rush, young squid.', 'Slow and steady, dear.', 'Ahh... the usual, slowly.'],
      wait: ['Back in my day... zzz', "I'm aging. Even more.", 'Is it next century yet?'],
      happy: ['Worth a century of wait.', 'Perfect, like in 1802.', 'Splendid. Truly splendid.'],
      angry: ['Even I have limits.', 'Patience... exhausted.', 'See you in fifty years.'],
    },
  },
  mantis: {
    id: 'mantis', name: 'Madame Mantis', species: 'mantis shrimp', patience: 76, perfectTipMul: 2, vip: true,
    trait: 'The food critic: her star rating is shown live',
    lines: {
      arrive: ['Impress me, octopus.', 'The critic has arrived.', 'My pen is sharp tonight.'],
      wait: ['Tick-tock, little chef.', "I'm docking a star...", 'My claws are twitching.'],
      happy: ['A knockout dish!', 'Exquisite. Noted.', 'It packs a punch! Bravo!'],
      angry: ['One star. Generous.', 'This review will sting.', 'Unforgivable. Adieu!'],
    },
  },
};
