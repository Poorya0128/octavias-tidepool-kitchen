/**
 * The screen flow: title, reef map, a night of service, results with the Tide Shop, and the
 * help, pause, settings and shop overlays. It owns the campaign, the running night, the
 * effects and the audio, and turns keys and clicks into commands.
 */

import { createNight, dispatch, inRush, nightSummary, stepNight } from './state.js';
import { NIGHTS } from './data/nights.js';
import { buyUpgrade, recordNight, saveCampaign } from './campaign.js';
import { playEvent, setMuted, unlockAudio, updateMusic } from './audio.js';
import { actionForArea, actionForKey, hitTest, nightHitAreas } from './input.js';
import { createArmView, drawOctavia, updateArmView } from './render/octopus.js';
import { drawAtmosphere, drawBins, drawClamPlate, drawCounter, drawPass, drawStations, drawTrash, drawWall } from './render/scene.js';
import { drawArmSlots, drawBanners, drawChecklist, drawHud, drawKeyHints, drawOrderBoard, drawTideGauge, drawToasts } from './render/ui.js';
import { ambient, createEffects, drawEffects, spawnFromEvents, updateEffects } from './render/effects.js';
import { drawHelp, drawMap, drawPause, drawResults, drawSettings, drawShop, drawTitle } from './render/screens.js';
import { panel, text } from './render/draw.js';
import { chefThink } from './autochef.js';

/** A new app on the title screen. */
export function createApp({ campaign, audio }) {
  const app = {
    screen: 'title', overlay: null, campaign, audio, night: null, summary: null,
    mapSel: Math.min(campaign.unlocked, NIGHTS.length) - 1, fx: createEffects(), armView: null,
    buttons: [], t: 0, hoverBin: null, drag: null, frozen: false, seed: 1, returnTo: null,
  };
  setMuted(audio, !campaign.settings.sound);
  return app;
}

/** Opens a night of service. */
export function startNight(app, nightIndex, seed = (Date.now() % 100000) + 1) {
  app.night = createNight({ nightIndex, upgrades: app.campaign.upgrades, seed });
  app.armView = createArmView();
  app.fx = createEffects();
  app.screen = 'night';
  app.overlay = app.campaign.seenHelp ? null : 'help';
  app.returnTo = null;
  app.campaign.seenHelp = true;
  app.mapSel = nightIndex;
  app.seed = seed;
}

/** Ends the night: bank the coins, save, and show the results with the shop. */
function finishNight(app) {
  app.summary = nightSummary(app.night);
  recordNight(app.campaign, app.summary);
  saveCampaign(app.campaign);
  app.screen = 'results';
  app.t = 0;
}

/** Sends the night's new events to the effects and the audio, then clears them. */
export function drainEvents(app) {
  const night = app.night;
  const calm = app.campaign.settings.reducedMotion;
  spawnFromEvents(app.fx, night.events, calm);
  for (const e of night.events) playEvent(app.audio, e.type);
  night.events.length = 0;
}

/** Advances the app by one fixed step. */
export function updateApp(app, dt) {
  app.t += dt;
  if (app.frozen) return;
  const calm = app.campaign.settings.reducedMotion;
  if (app.screen === 'night' && app.night) {
    if (!app.overlay) {
      if (app.autoChef) chefThink(app.night, app.autoChef, dt);
      stepNight(app.night, dt);
      ambient(app.fx, app.night, dt, calm);
      drainEvents(app);
      if (app.night.over) {
        finishNight(app);
        return;
      }
    }
    updateArmView(app.armView, app.night, dt, app.night.time, calm);
  }
  updateEffects(app.fx, dt);
  updateMusic(app.audio, app.screen === 'night' && !app.overlay, app.night ? inRush(app.night) : false);
}

/** Draws a night of service: kitchen, Octavia, stations, HUD and effects. */
function drawNight(ctx, app) {
  const night = app.night;
  const t = night.time;
  const calm = app.campaign.settings.reducedMotion;
  ctx.save();
  if (app.fx.shake > 0) ctx.translate(Math.sin(app.t * 70) * app.fx.shake, Math.cos(app.t * 60) * app.fx.shake);
  drawWall(ctx, night, t, calm);
  drawCounter(ctx);
  drawStations(ctx, night, t);
  drawOctavia(ctx, night, app.armView, t);
  drawClamPlate(ctx, night, t);
  drawPass(ctx, night, t);
  drawTrash(ctx);
  drawBins(ctx, t, app.hoverBin);
  drawAtmosphere(ctx, night, t, calm);
  drawOrderBoard(ctx, night, t);
  drawHud(ctx, night, t);
  drawArmSlots(ctx, night, t);
  drawChecklist(ctx, night);
  drawTideGauge(ctx, night, t);
  drawKeyHints(ctx);
  drawBanners(ctx, night, t);
  drawToasts(ctx, night);
  drawEffects(ctx, app.fx);
  ctx.restore();
  if (app.fx.flash > 0) {
    ctx.fillStyle = `rgba(239,91,76,${app.fx.flash * 0.35})`;
    ctx.fillRect(0, 0, 1280, 800);
  }
}

/** Draws the current screen and overlay; records the buttons laid out for clicks. */
export function drawApp(ctx, app) {
  const calm = app.campaign.settings.reducedMotion;
  let buttons = [];
  if (app.screen === 'title') buttons = drawTitle(ctx, app.campaign, app.t, calm);
  else if (app.screen === 'map') buttons = drawMap(ctx, app.campaign, app.mapSel, app.t, calm);
  else if (app.screen === 'night') drawNight(ctx, app);
  else if (app.screen === 'results') buttons = drawResults(ctx, app.campaign, app.summary, app.t, calm);
  if (app.overlay === 'help') buttons = drawHelp(ctx, app.t);
  else if (app.overlay === 'pause') buttons = drawPause(ctx);
  else if (app.overlay === 'settings') buttons = drawSettings(ctx, app.campaign.settings);
  else if (app.overlay === 'shop') {
    ctx.fillStyle = 'rgba(5,25,29,0.7)';
    ctx.fillRect(0, 0, 1280, 800);
    buttons = drawShop(ctx, app.campaign, 395, 150, 490);
    panel(ctx, 540, 640, 200, 50, { fill: '#fff6e6', r: 14 });
    text(ctx, 'Close (Esc)', 640, 672, { size: 18, color: '#3b2a4d', align: 'center', outline: null });
    buttons.push({ id: 'closeShop', x: 540, y: 640, w: 200, h: 50 });
  }
  app.buttons = buttons;
}

/** Opens a help or settings card; closing it returns to the pause menu if that is where it came from. */
function openOverlay(app, name) {
  app.returnTo = app.overlay === 'pause' ? 'pause' : null;
  app.overlay = name;
}

function closeOverlay(app) {
  app.overlay = app.returnTo;
  app.returnTo = null;
}

/** Runs a screen command from a button or a key. */
export function command(app, id) {
  playEvent(app.audio, 'click');
  if (id.startsWith('buy:')) {
    const res = buyUpgrade(app.campaign, id.slice(4));
    if (res.ok) saveCampaign(app.campaign);
    return;
  }
  if (id.startsWith('night')) {
    app.mapSel = Number(id.slice(5));
    return;
  }
  const actions = {
    play: () => { app.screen = 'map'; },
    help: () => openOverlay(app, 'help'),
    closeHelp: () => closeOverlay(app),
    settings: () => openOverlay(app, 'settings'),
    closeSettings: () => { closeOverlay(app); saveCampaign(app.campaign); },
    toggleSound: () => {
      app.campaign.settings.sound = !app.campaign.settings.sound;
      setMuted(app.audio, !app.campaign.settings.sound);
    },
    toggleMotion: () => { app.campaign.settings.reducedMotion = !app.campaign.settings.reducedMotion; },
    start: () => { if (app.mapSel < app.campaign.unlocked) startNight(app, app.mapSel); },
    shop: () => { app.overlay = 'shop'; },
    closeShop: () => { app.overlay = null; },
    title: () => { app.screen = 'title'; },
    resume: () => { app.overlay = null; },
    quit: () => { app.overlay = null; app.screen = 'map'; },
    next: () => { if (app.summary.nightIndex + 1 < app.campaign.unlocked) startNight(app, app.summary.nightIndex + 1); },
    retry: () => startNight(app, app.summary.nightIndex),
    map: () => { app.screen = 'map'; app.mapSel = Math.min(app.campaign.unlocked, NIGHTS.length) - 1; },
  };
  actions[id]?.();
}

/** Keyboard handling for every screen; returns true when the key was used. */
export function handleKey(app, key) {
  unlockAudio(app.audio);
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === 'm' && app.screen !== 'results') {
    command(app, 'toggleSound');
    saveCampaign(app.campaign);
    return true;
  }
  if (app.overlay) {
    const map = { help: { h: 'closeHelp', Escape: 'closeHelp', Enter: 'closeHelp', ' ': 'closeHelp' }, pause: { p: 'resume', Escape: 'resume', h: 'help', o: 'settings', q: 'quit' }, settings: { Escape: 'closeSettings', o: 'closeSettings' }, shop: { Escape: 'closeShop', u: 'closeShop' } };
    const id = map[app.overlay][k];
    if (id) command(app, id);
    return true;
  }
  if (app.screen === 'title') {
    const id = { Enter: 'play', ' ': 'play', h: 'help', o: 'settings' }[k];
    if (id) command(app, id);
    return !!id;
  }
  if (app.screen === 'map') {
    if (k === 'ArrowLeft' || k === 'ArrowUp') app.mapSel = Math.max(0, app.mapSel - 1);
    else if (k === 'ArrowRight' || k === 'ArrowDown') app.mapSel = Math.min(NIGHTS.length - 1, app.mapSel + 1);
    else if (k === 'Enter' || k === ' ') command(app, 'start');
    else if (k === 'u') command(app, 'shop');
    else if (k === 'Escape') command(app, 'title');
    else return false;
    return true;
  }
  if (app.screen === 'results') {
    const id = { Enter: 'next', r: 'retry', m: 'map', Escape: 'map' }[k];
    if (id) command(app, id);
    return !!id;
  }
  if (app.screen === 'night') {
    if (k === 'p' || k === 'Escape') { app.overlay = 'pause'; return true; }
    if (k === 'h') { openOverlay(app, 'help'); return true; }
    const action = actionForKey(app.night, key);
    if (!action) return false;
    dispatch(app.night, action);
    return true;
  }
  return false;
}

/** Pointer handling: buttons on every screen; during service, clicks and drags in the kitchen. */
export function handlePointer(app, kind, x, y) {
  if (kind === 'down') unlockAudio(app.audio);
  if (app.screen === 'night' && !app.overlay) {
    const areas = nightHitAreas(app.night);
    const hit = hitTest(areas, x, y);
    if (kind === 'move') {
      app.hoverBin = hit?.kind === 'bin' ? hit.index : null;
      return;
    }
    if (kind === 'down' && hit) {
      const action = actionForArea(hit);
      const res = dispatch(app.night, action);
      app.drag = hit.kind === 'bin' && res.ok ? { from: hit } : null;
      return;
    }
    if (kind === 'up' && app.drag && hit && hit.kind !== 'bin') {
      if (hit.kind === 'station' || hit.kind === 'plate') dispatch(app.night, actionForArea(hit));
    }
    if (kind === 'up') app.drag = null;
    return;
  }
  if (kind !== 'down') return;
  const btn = app.buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h && !b.disabled);
  if (btn) command(app, btn.id);
}
