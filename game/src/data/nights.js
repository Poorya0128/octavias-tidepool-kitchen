/**
 * The five tide nights of the campaign: menu, regulars, ticket pace, Spring Tide rush times,
 * critic visits and the coin targets for one, two and three stars.
 */

export const NIGHTS = [
  {
    name: 'Slack Tide', duration: 180, spawnEvery: 16, firstSpawn: 1.5, maxTickets: 4,
    recipes: ['kelpRoll', 'toast', 'pearlBowl'],
    customers: { puffy: 3, tortuga: 2 },
    rushes: [118], critic: [], stars: [150, 320, 520],
    tip: 'Start the slow cooks first: rice in the steamer while you chop.',
  },
  {
    name: 'Rising Tide', duration: 180, spawnEvery: 14, firstSpawn: 1.5, maxTickets: 5,
    recipes: ['kelpRoll', 'toast', 'pearlBowl', 'broth', 'salad'],
    customers: { puffy: 3, tortuga: 2, shelby: 2 },
    rushes: [70, 135], critic: [], stars: [170, 360, 580],
    tip: 'Shelby may change her mind. Watch her ticket.',
  },
  {
    name: 'Moon Tide', duration: 180, spawnEvery: 13, firstSpawn: 1.5, maxTickets: 5,
    recipes: ['kelpRoll', 'toast', 'pearlBowl', 'broth', 'salad', 'pudding'],
    customers: { puffy: 3, tortuga: 2, shelby: 2, twins: 1.5 },
    rushes: [60, 128], critic: [], stars: [180, 380, 600],
    tip: 'Serve the Seahorse Twins close together for a bonus.',
  },
  {
    name: 'Storm Tide', duration: 180, spawnEvery: 12, firstSpawn: 1.5, maxTickets: 6,
    recipes: ['kelpRoll', 'toast', 'pearlBowl', 'broth', 'salad', 'pudding', 'skewer'],
    customers: { puffy: 3, tortuga: 2, shelby: 2, twins: 1.5 },
    rushes: [48, 98, 148], critic: [], stars: [200, 420, 660],
    tip: 'The grill needs flips. Keep a free arm near it.',
  },
  {
    name: 'King Tide', duration: 180, spawnEvery: 11.5, firstSpawn: 1.5, maxTickets: 6,
    recipes: ['kelpRoll', 'toast', 'pearlBowl', 'broth', 'salad', 'pudding', 'skewer'],
    customers: { puffy: 3, tortuga: 2, shelby: 2, twins: 1.5 },
    rushes: [44, 96, 146], critic: [28, 112], stars: [210, 440, 680],
    tip: 'Madame Mantis is reviewing tonight. Three stars need her approval.',
  },
];
