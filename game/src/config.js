/**
 * Shared constants for Octavia's Tidepool Kitchen: the logical canvas, palette, fonts,
 * cooking and service tuning, and the screen layout the renderer and the input layer agree on.
 */

/** Logical canvas size; the canvas is scaled to fit the window. */
export const VIEW_W = 1280;
export const VIEW_H = 800;
/** Fixed simulation step in seconds. */
export const STEP = 1 / 60;
/** Octavia's arm count: the main resource of the game. */
export const ARM_COUNT = 8;

export const PALETTE = {
  deep: '#0e3b43',
  deeper: '#082a30',
  abyss: '#05191d',
  foam: '#7fd1b9',
  foamDark: '#3f9c86',
  coral: '#ff7a59',
  coralDark: '#d9533a',
  sand: '#f4d8a6',
  sandDark: '#d9b57a',
  pearl: '#fff6e6',
  ink: '#3b2a4d',
  inkSoft: '#5a4470',
  gold: '#ffd166',
  green: '#5fd38d',
  red: '#ef5b4c',
  blue: '#5aa9e6',
  orange: '#ff9f1c',
};

export const FONT = '"Trebuchet MS", "Segoe UI", "Noto Sans", system-ui, sans-serif';

/** Cooking, arm and service tuning. Times are in seconds. */
export const TUNING = {
  reachTime: 0.28,
  quickReachTime: 0.15,
  chopTime: 1.9,
  quickChopTime: 1.3,
  steam: { cook: 5.5, perfect: 3.2, over: 3.2 },
  simmer: { cook: 5.0, perfect: 2.8, over: 2.6, unstirredRate: 2 },
  sear: { sideA: 2.8, flipWindow: 2.0, sideB: 2.0, perfect: 2.4, over: 1.8 },
  passSlots: 2,
  biggerPassSlots: 3,
  plateWarmth: 24,
  biggerPlateWarmth: 48,
  calmingDrain: 0.8,
  rushSpawnFactor: 0.42,
  rushDuration: 24,
  rushWarning: 5,
  perfectPartTip: 3,
  allPerfectTip: 5,
  speedTipShare: 0.5,
  twinsBonus: 15,
  twinsWindow: 12,
  shelbyChangeAt: 0.55,
  shelbyPatienceGift: 10,
};

/** Ink Streak multipliers, indexed by how many on-time perfect serves in a row. */
export const STREAK_TIERS = [
  { at: 0, mult: 1 },
  { at: 3, mult: 1.5 },
  { at: 6, mult: 2 },
  { at: 10, mult: 2.5 },
  { at: 15, mult: 3 },
];

/** A serve counts toward the streak when at least this share of patience remains. */
export const ON_TIME_SHARE = 0.3;

/** Screen layout in logical pixels: rectangles are top-left based, points are centres. */
export const LAYOUT = {
  board: { x: 140, y: 10, w: 880, h: 136 },
  ticket: { x: 150, y: 34, w: 140, h: 112, gap: 7, max: 6 },
  hud: { x: 1030, y: 10, w: 238, h: 136 },
  arms: { x: 12, y: 158, w: 104, h: 372 },
  porthole: { x: 214, y: 262, r: 66 },
  wallBottom: 470,
  counterTop: 470,
  counterBottom: 652,
  octavia: { x: 640, y: 292 },
  stations: {
    board: { x: 128, y: 470, w: 200, h: 92, target: { x: 228, y: 506 } },
    pot0: { x: 342, y: 392, w: 128, h: 128, target: { x: 406, y: 430 } },
    pot1: { x: 476, y: 392, w: 128, h: 128, target: { x: 540, y: 430 } },
    grill: { x: 716, y: 440, w: 190, h: 104, target: { x: 811, y: 470 } },
    steamer: { x: 920, y: 286, w: 148, h: 236, target: { x: 994, y: 400 } },
  },
  plate: { x: 640, y: 600, w: 250, h: 92 },
  checklist: { x: 120, y: 572, w: 370, h: 76 },
  trash: { x: 790, y: 566, w: 70, h: 80 },
  tide: { x: 872, y: 566, w: 196, h: 80 },
  pass: { x: 1080, y: 194, w: 188, h: 454 },
  status: { x: 1030, y: 154, w: 238, h: 34 },
  bins: { x: 12, y: 658, w: 102, h: 134, gap: 6 },
  keys: { x: 1094, y: 658, w: 174, h: 134 },
  ink: { x: 12, y: 538, w: 104, h: 110 },
};

/** Where Octavia's arm tip goes for each station slot (grill and steamer have two slots). */
export const SLOT_TARGETS = {
  board: [{ x: 228, y: 508 }],
  pot0: [{ x: 406, y: 440 }],
  pot1: [{ x: 540, y: 440 }],
  grill: [{ x: 768, y: 482 }, { x: 856, y: 482 }],
  steamer: [{ x: 994, y: 352 }, { x: 994, y: 448 }],
};

/** Storage key for the campaign save. */
export const SAVE_KEY = 'octavias-tidepool-kitchen/v1';
