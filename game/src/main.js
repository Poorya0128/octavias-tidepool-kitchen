/**
 * Boot: fits the 1280x800 canvas to the window, loads the campaign, wires input and runs a
 * fixed-step loop. A ?scene= query opens a deterministic screenshot scene instead.
 */

import { createApp, drawApp, handleKey, handlePointer, updateApp } from './app.js';
import { STEP, VIEW_H, VIEW_W } from './config.js';
import { loadCampaign } from './campaign.js';
import { createAudio } from './audio.js';
import { bindInput } from './input.js';
import { createAutoChef } from './autochef.js';
import { applyScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/** Sizes the canvas backing store for the window and device pixel ratio, keeping 16:10. */
function fit() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  canvas.width = Math.round(VIEW_W * scale * dpr);
  canvas.height = Math.round(VIEW_H * scale * dpr);
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
}

const params = new URLSearchParams(location.search);
const app = createApp({ campaign: loadCampaign(), audio: createAudio() });
const scene = params.get('scene');
if (scene) applyScene(app, scene, Number(params.get('seed') ?? 7));
if (params.has('autoplay')) app.autoChef = createAutoChef();
const speed = Math.max(1, Math.min(20, Number(params.get('speed') ?? 1)));

bindInput(canvas, {
  onKey: (key) => (app.frozen ? false : handleKey(app, key)),
  onPointer: (kind, x, y) => { if (!app.frozen) handlePointer(app, kind, x, y); },
});
window.addEventListener('resize', fit);
fit();

let last = performance.now();
let acc = 0;
function frame(now) {
  acc = Math.min(acc + ((now - last) / 1000) * speed, 0.25 * speed);
  last = now;
  while (acc >= STEP) {
    updateApp(app, STEP);
    acc -= STEP;
  }
  ctx.save();
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
  drawApp(ctx, app);
  ctx.restore();
  if (document.body.dataset.screen !== app.screen) document.body.dataset.screen = app.screen;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.body.dataset.ready = scene ? 'scene' : 'game';
