/**
 * Deterministic screenshot scenes, opened with ?scene=<name>&seed=<n>. Each one reaches its
 * moment by playing the real game with the scripted chef (campaign nights included) for a
 * fixed number of steps, then freezes the frame.
 */

import { STEP } from './config.js';
import { createNight, nightSummary, stepNight } from './state.js';
import { createAutoChef, chefThink, playCampaign, simulateNight } from './autochef.js';
import { drainEvents, updateApp } from './app.js';
import { createArmView } from './render/octopus.js';
import { createEffects } from './render/effects.js';

/** Upgrades the campaign buys after each night on the way to a scene. */
const BUYS = { 0: ['secondPot'], 1: ['calmingCoral'], 2: ['quickArms'] };

/**
 * Service scenes: the night, the chef's style and the step where play freezes. The steps come
 * from a search for a frame with food on every station, at least four of Octavia's arms at work,
 * a dish half built, plates at the window, food just turned PERFECT and no toast in the way.
 */
const PLAYS = {
  cover: { night: 3, frames: 6640, chef: { cadence: 0.55, serveAfter: 16, focus: 4, takeWithin: 0.4 } },
  moon: { night: 2, frames: 8312, chef: { cadence: 0.47, serveAfter: 8, focus: 3, takeWithin: 0.4 } },
  critic: { night: 4, frames: 7489, chef: { cadence: 0.5, serveAfter: 18, focus: 5, takeWithin: 0.4 } },
};

/**
 * Plays the campaign up to a scene's night, then that night with the chef for exactly `frames`
 * fixed steps. The final 2.5 seconds run through the app so the effects, popups and arm motion
 * on screen are the ones play produced.
 */
function playToFrame(app, seed, { night: nightIndex, frames, chef: chefOpts }) {
  app.campaign = playCampaign(nightIndex, seed, BUYS);
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
  /** Storm Tide in a Spring Tide rush: every station cooking, five arms busy, a pearl bowl half built, Puffy's skewer and Shelby's kelp roll at the window. */
  cover: (app, seed) => playToFrame(app, seed, PLAYS.cover),
  /** Moon Tide in a rush: the Seahorse Twins' pudding waits at the window while a kelp roll comes together and every station cooks. */
  moon: (app, seed) => playToFrame(app, seed, PLAYS.moon),
  /** The title header over the reef map, three nights into the campaign. */
  map(app, seed) {
    app.campaign = playCampaign(3, seed, BUYS);
    app.screen = 'map';
    app.mapSel = 3;
    app.t = 4;
  },
  /** King Tide: Madame Mantis rates live while her Grand Reef Platter takes shape on the Clam Plate and every station cooks. */
  critic: (app, seed) => playToFrame(app, seed, PLAYS.critic),
  /** Results of Storm Tide with stars, stats and the Tide Shop. */
  results(app, seed) {
    app.campaign = playCampaign(4, seed, BUYS);
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
