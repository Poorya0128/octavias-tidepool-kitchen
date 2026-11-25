/**
 * The campaign across five tide nights: unlocks, best stars, the coin purse, the upgrade shop
 * and settings, saved to localStorage.
 */

import { SAVE_KEY } from './config.js';
import { NIGHTS } from './data/nights.js';

export const UPGRADES = [
  { id: 'secondPot', name: 'Second Bubble Pot', cost: 260, text: 'A second pot to simmer two dishes at once.' },
  { id: 'quickArms', name: 'Quicker Arms', cost: 220, text: 'Arms reach faster and chop a third quicker.' },
  { id: 'calmingCoral', name: 'Calming Coral', cost: 180, text: 'Customers lose patience 20% slower.' },
  { id: 'autoStir', name: 'Auto-Stir Anemone', cost: 240, text: 'Pots stir themselves: no arm needed.' },
  { id: 'biggerPlate', name: 'Bigger Clam Plate', cost: 160, text: 'Room for 3 plates at the window, warm twice as long.' },
];

/** A new campaign: only the first night open, the help card and the first-shift coach still to come. */
export function newCampaign() {
  return {
    unlocked: 1, stars: NIGHTS.map(() => 0), best: NIGHTS.map(() => 0),
    purse: 0, upgrades: {}, settings: { sound: true, reducedMotion: false }, seenHelp: false, coachDone: false,
  };
}

/** Loads the saved campaign, or a new one when storage is empty, blocked or unreadable. */
export function loadCampaign(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return newCampaign();
    const data = JSON.parse(raw);
    const base = newCampaign();
    return { ...base, ...data, settings: { ...base.settings, ...data.settings }, upgrades: { ...data.upgrades } };
  } catch {
    return newCampaign();
  }
}

/** Saves the campaign; a blocked storage only means progress is not kept. */
export function saveCampaign(campaign, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(campaign));
  } catch {
    /* storage unavailable (private mode or file://): play continues unsaved */
  }
}

/** Banks a night's coins, keeps the best stars and opens the next night after at least one star. */
export function recordNight(campaign, summary) {
  const i = summary.nightIndex;
  campaign.purse += summary.coins;
  campaign.stars[i] = Math.max(campaign.stars[i], summary.stars);
  campaign.best[i] = Math.max(campaign.best[i], summary.coins);
  if (summary.stars > 0) campaign.unlocked = Math.max(campaign.unlocked, Math.min(NIGHTS.length, i + 2));
  return campaign;
}

/** Buys an upgrade if it is affordable and not yet owned. */
export function buyUpgrade(campaign, id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up || campaign.upgrades[id]) return { ok: false, reason: 'Already owned' };
  if (campaign.purse < up.cost) return { ok: false, reason: `Need ${up.cost - campaign.purse} more coins` };
  campaign.purse -= up.cost;
  campaign.upgrades[id] = true;
  return { ok: true };
}

/** Total stars earned across the campaign. */
export function totalStars(campaign) {
  return campaign.stars.reduce((a, b) => a + b, 0);
}
