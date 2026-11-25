/**
 * Deterministic screenshot scenes, opened with ?scene=<name>&seed=<n>. Each one reaches its
 * moment by playing the real game with the scripted chef (campaign nights included) for a
 * fixed number of steps, then freezes the frame.
 */

import { STEP } from './config.js';
import { createNight, nightSummary, stepNight } from './state.js';
import { createAutoChef, chefThink, simulateNight } from './autochef.js';
import { buyUpgrade, newCampaign, recordNight } from './campaign.js';
import { drainEvents, updateApp } from './app.js';
import { createArmView } from './render/octopus.js';
import { createEffects } from './render/effects.js';

/** Plays campaign nights with the chef, banks them and buys upgrades along the way. */
function playCampaign(nights, seed, buys) {
  const campaign = newCampaign();
  campaign.seenHelp = true;
  for (let i = 0; i < nights; i++) {
    const night = createNight({ nightIndex: i, upgrades: campaign.upgrades, seed: seed + i });
    simulateNight(night, createAutoChef({ cadence: [0.45, 0.8, 0.55, 0.5, 0.5][i], focus: 2 }));
    recordNight(campaign, nightSummary(night));
    for (const id of buys[i] ?? []) buyUpgrade(campaign, id);
  }
  return campaign;
}

/**
 * Plays a night with the chef for exactly `frames` fixed steps. The final 2.5 seconds run
 * through the app so the effects, popups and arm motion on screen are the ones play produced.
 */
function playToFrame(app, nightIndex, seed, frames, chefOpts) {
  const night = createNight({ nightIndex, upgrades: app.campaign.upgrades, seed });
  const chef = createAutoChef(chefOpts);
  app.night = night;
  app.screen = 'night';
  app.overlay = null;
  app.armView = createArmView();
  app.fx = createEffects();
  for (let f = 0; f < frames && !night.over; f++) {
    chefThink(night, chef, STEP);
    if (f < frames - 150) {
      stepNight(night, STEP);
      night.events.length = 0;
    } else {
      drainEvents(app);
      updateApp(app, STEP);
    }
  }
}

const SCENES = {
  /**
   * Storm Tide, third Spring Tide, 2:41 in: six tickets, a pudding half built on the Clam Plate,
   * a plate glowing at the Current Window and a pot seconds from perfect (frame found by search).
   */
  cover(app, seed) {
    app.campaign = playCampaign(3, seed, { 0: ['secondPot'], 1: ['calmingCoral'] });
    playToFrame(app, 3, seed, 9670, { serveAfter: 3.5, cadence: 0.55 });
  },
  /** The title header over the reef map, three nights into the campaign. */
  map(app, seed) {
    app.campaign = playCampaign(3, seed, { 0: ['secondPot'], 1: ['calmingCoral'] });
    app.screen = 'map';
    app.mapSel = 3;
    app.t = 4;
  },
  /** King Tide in a Spring Tide: the Grand Reef Platter on the plate for Madame Mantis, an x3 serve popping. */
  critic(app, seed) {
    app.campaign = playCampaign(4, seed, { 0: ['secondPot'], 1: ['calmingCoral'], 2: ['quickArms'] });
    playToFrame(app, 4, seed, 9681, { serveAfter: 2, cadence: 0.45 });
  },
  /** Results of Storm Tide with stars, stats and the Tide Shop. */
  results(app, seed) {
    app.campaign = playCampaign(4, seed, { 0: ['secondPot'], 1: ['calmingCoral'] });
    const night = createNight({ nightIndex: 3, upgrades: app.campaign.upgrades, seed: seed + 3 });
    simulateNight(night, createAutoChef({ cadence: 0.5, focus: 2 }));
    app.summary = nightSummary(night);
    app.screen = 'results';
    app.t = 3;
  },
};

/** Builds a named scene and freezes it; returns false for an unknown name. */
export function applyScene(app, name, seed) {
  const scene = SCENES[name];
  if (!scene) return false;
  scene(app, seed);
  app.frozen = true;
  return true;
}
