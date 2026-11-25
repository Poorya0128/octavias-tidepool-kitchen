/**
 * Juice: bubbles, soft steam and smoke, glowing sizzle sparks, chopping chips, gold rings for
 * perfect food, the Ink Burst swirl, coin pops and combo words, spawned from the night's events
 * and from the stations' live state.
 */

import { LAYOUT, PALETTE, SLOT_TARGETS } from '../config.js';
import { INGREDIENT } from '../data/ingredients.js';
import { blob, sparkle, TAU, text } from './draw.js';
import { glow, puff } from './light.js';

/** A fresh particle pool. */
export function createEffects() {
  return { list: [], shake: 0, flash: 0 };
}

function add(fx, p) {
  if (fx.list.length < 420) fx.list.push({ vx: 0, vy: 0, g: 0, life: 1, age: 0, size: 4, ...p });
}

function burst(fx, kind, x, y, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const sp = (opts.speed ?? 80) * (0.4 + Math.random() * 0.8);
    add(fx, { kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up ?? 0), life: opts.life ?? 0.7, size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8), color: opts.color, g: opts.g ?? 0 });
  }
}

/** Turns the night's events into particles and floating words. */
export function spawnFromEvents(fx, events, calm) {
  const n = calm ? 0.35 : 1;
  for (const e of events) {
    switch (e.type) {
      case 'grab': burst(fx, 'bubble', e.x, e.y - 20, Math.ceil(5 * n), { speed: 40, up: 50, life: 0.8, size: 4 }); break;
      case 'place': burst(fx, 'bubble', e.x, e.y, Math.ceil(6 * n), { speed: 60, up: 40, size: 4 }); break;
      case 'chop': burst(fx, 'chip', e.x, e.y - 4, Math.ceil(3 * n), { speed: 90, up: 60, g: 260, life: 0.5, size: 3.5, color: INGREDIENT.kelp.color }); break;
      case 'chopDone': add(fx, { kind: 'word', x: e.x, y: e.y - 40, vy: -30, life: 0.9, text: 'Chopped!', color: PALETTE.pearl, size: 18 }); break;
      case 'cookPerfect':
        add(fx, { kind: 'ring', x: e.x, y: e.y - 20, life: 0.7, size: 46, color: PALETTE.gold });
        burst(fx, 'twinkle', e.x, e.y - 20, Math.ceil(9 * n), { speed: 90, life: 0.8, size: 6, color: '#fff3c4' });
        burst(fx, 'spark', e.x, e.y - 20, Math.ceil(10 * n), { speed: 120, life: 0.6, size: 3, color: PALETTE.green }); break;
      case 'flip': burst(fx, 'spark', e.x, e.y - 20, Math.ceil(14 * n), { speed: 150, up: 60, g: 200, life: 0.6, size: 3, color: PALETTE.orange });
        add(fx, { kind: 'word', x: e.x, y: e.y - 70, vy: -40, life: 0.8, text: 'Flip!', color: PALETTE.gold, size: 20 }); break;
      case 'cookBurnt': burst(fx, 'smoke', e.x, e.y - 20, Math.ceil(12 * n), { speed: 36, up: 55, life: 1.6, size: 14 }); fx.shake = calm ? 0 : 4; break;
      case 'inkBurst':
        add(fx, { kind: 'swirl', x: e.x, y: e.y, life: calm ? 0.6 : 1, size: 150, spin: calm ? 0 : 5 });
        for (let i = 0; i < Math.ceil(12 * n); i++) {
          const a = (i / 12) * TAU + Math.random() * 0.4;
          add(fx, { kind: 'ink', x: e.x + Math.cos(a) * 84, y: e.y + Math.sin(a) * 68, vx: Math.cos(a) * 150, vy: Math.sin(a) * 120, life: 0.7, size: 6 });
        }
        break;
      case 'inkReady': {
        const cx = LAYOUT.ink.x + LAYOUT.ink.w / 2;
        const cy = LAYOUT.ink.y + LAYOUT.ink.h / 2;
        add(fx, { kind: 'ring', x: cx, y: cy, life: 0.6, size: 40, color: '#d9b8ff' });
        burst(fx, 'twinkle', cx, cy, Math.ceil(7 * n), { speed: 60, life: 0.7, size: 5, color: '#efe2ff' }); break;
      }
      case 'trash': burst(fx, 'ink', e.x, e.y, Math.ceil(10 * n), { speed: 70, life: 0.8, size: 9 }); break;
      case 'plateAdd': burst(fx, 'spark', e.x, e.y - 10, Math.ceil(6 * n), { speed: 80, life: 0.45, size: 3, color: PALETTE.gold }); break;
      case 'finish':
        add(fx, { kind: 'word', x: e.x, y: e.y - 70, vy: -36, life: 1.1, text: `${e.word}!`, color: PALETTE.gold, size: 30 });
        burst(fx, 'spark', e.x, e.y - 20, Math.ceil(18 * n), { speed: 160, life: 0.7, size: 3.5, color: PALETTE.gold }); break;
      case 'serve':
        add(fx, { kind: 'word', x: e.x - 150, y: e.y + 6, vy: -34, life: 1.3, text: `+${e.coins}`, color: PALETTE.gold, size: 34 });
        if (e.mult > 1) add(fx, { kind: 'word', x: e.x - 150, y: e.y + 40, vy: -30, life: 1.3, text: `INK x${e.mult}`, color: '#d9b8ff', size: 22 });
        if (e.perfect) add(fx, { kind: 'word', x: e.x - 150, y: e.y - 30, vy: -30, life: 1.2, text: 'PERFECT!', color: '#c9ffd9', size: 22 });
        for (let i = 0; i < Math.ceil(8 * n); i++) add(fx, { kind: 'coin', x: e.x + (Math.random() - 0.5) * 60, y: e.y, tx: LAYOUT.hud.x + 136, ty: LAYOUT.hud.y + 70, life: 0.9 + i * 0.05, size: 7 });
        break;
      case 'twinBonus': add(fx, { kind: 'word', x: e.x, y: e.y - 130, vy: -30, life: 1.4, text: `Twin bonus +${e.coins}`, color: PALETTE.foam, size: 20 }); break;
      case 'miss': fx.flash = calm ? 0 : 0.35; break;
      case 'streakBroken': add(fx, { kind: 'word', x: 1150, y: 170, vy: -20, life: 1.2, text: 'Streak lost', color: PALETTE.red, size: 18 }); break;
      case 'criticVerdict': add(fx, { kind: 'word', x: 640, y: 250, vy: -20, life: 2, text: `Madame Mantis: ${e.stars} stars`, color: PALETTE.gold, size: 26 }); break;
      case 'rushStart': fx.shake = calm ? 0 : 6; break;
      default: break;
    }
  }
}

/** Ambient bubbles, steam and sizzle from whatever the stations are doing. */
export function ambient(fx, state, dt, calm) {
  const rate = calm ? 0.3 : 1;
  const chance = (perSecond) => Math.random() < perSecond * dt * rate;
  for (const id of ['pot0', 'pot1']) {
    const item = state.stations[id].slots[0];
    if (item && item.phase !== 'burnt' && chance(item.phase === 'cook' ? 6 : 12)) {
      const at = SLOT_TARGETS[id][0];
      add(fx, { kind: 'bubble', x: at.x + (Math.random() - 0.5) * 70, y: at.y - 10, vy: -40 - Math.random() * 40, life: 0.9, size: 3 + Math.random() * 4 });
    }
  }
  state.stations.steamer.slots.forEach((item, i) => {
    if (item && chance(5)) {
      const at = SLOT_TARGETS.steamer[i];
      add(fx, { kind: 'steam', x: at.x + (Math.random() - 0.5) * 60, y: at.y - 40, vy: -26, vx: (Math.random() - 0.5) * 10, life: 1.2, size: 6 + Math.random() * 5 });
    }
  });
  state.stations.grill.slots.forEach((item, i) => {
    if (item && item.phase !== 'burnt' && chance(item.phase === 'flip' ? 14 : 7)) {
      const at = SLOT_TARGETS.grill[i];
      add(fx, { kind: 'spark', x: at.x + (Math.random() - 0.5) * 40, y: at.y - 18, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 60, g: 220, life: 0.5, size: 2.5, color: Math.random() < 0.5 ? PALETTE.orange : PALETTE.gold });
    }
    if (item?.phase === 'burnt' && chance(5)) {
      const at = SLOT_TARGETS.grill[i];
      add(fx, { kind: 'smoke', x: at.x, y: at.y - 30, vy: -30, life: 1.4, size: 12 });
    }
  });
  if (chance(2.5)) add(fx, { kind: 'bubble', x: Math.random() * 1280, y: 470, vy: -30 - Math.random() * 30, life: 3.5, size: 2 + Math.random() * 3 });
}

/** Moves and ages particles. */
export function updateEffects(fx, dt) {
  for (const p of fx.list) {
    p.age += dt;
    if (p.kind === 'coin') {
      const k = Math.min(1, p.age / p.life);
      p.x += (p.tx - p.x) * Math.min(1, dt * 6 * (0.5 + k));
      p.y += (p.ty - p.y) * Math.min(1, dt * 6 * (0.5 + k));
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'bubble') p.x += Math.sin(p.age * 6 + p.y) * 0.4;
  }
  fx.list = fx.list.filter((p) => p.age < p.life);
  fx.shake = Math.max(0, fx.shake - dt * 18);
  fx.flash = Math.max(0, fx.flash - dt);
}

/** The Ink Burst: translucent violet ink ribbons spiralling out around Octavia, gone within a second. */
function drawSwirl(ctx, p, k) {
  const fade = Math.min(1, k * 6) * (1 - k);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    const a0 = (arm / 4) * TAU + p.age * p.spin;
    const r0 = p.size * (0.55 + 0.6 * k);
    ctx.beginPath();
    for (let j = 0; j <= 16; j++) {
      const a = a0 + j * 0.16;
      const r = r0 + j * 3.5 * (1 + k);
      ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.78);
    }
    ctx.lineWidth = 18 * (1 - k) + 4;
    ctx.strokeStyle = `rgba(104,60,176,${0.42 * fade})`;
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = `rgba(214,182,255,${0.7 * fade})`;
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/** Draws every live particle. */
export function drawEffects(ctx, fx) {
  for (const p of fx.list) {
    const k = p.age / p.life;
    const alpha = 1 - k;
    if (p.kind === 'word') {
      ctx.globalAlpha = Math.min(1, alpha * 1.6);
      const pop = 1 + Math.max(0, 0.25 - p.age) * 2;
      text(ctx, p.text, p.x, p.y, { size: p.size * pop, color: p.color, align: 'center', line: 6 });
    } else if (p.kind === 'bubble') {
      ctx.globalAlpha = alpha * 0.9;
      blob(ctx, p.x, p.y, p.size, 'rgba(214,250,255,0.25)', 'rgba(214,250,255,0.8)', 1.5);
    } else if (p.kind === 'steam' || p.kind === 'smoke') {
      const steamy = p.kind === 'steam';
      puff(ctx, p.x, p.y, p.size * (1.6 + k * 1.4), steamy ? '255,255,255' : '34,30,38', alpha * (steamy ? 0.45 : 0.7));
    } else if (p.kind === 'ink') {
      ctx.globalAlpha = alpha * 0.7;
      blob(ctx, p.x, p.y, p.size * (1 + k * 0.8), '#4a2f6b', null);
    } else if (p.kind === 'coin') {
      ctx.globalAlpha = 1;
      blob(ctx, p.x, p.y, p.size, PALETTE.gold, PALETTE.ink, 2);
      blob(ctx, p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, '#fff6d0', null);
    } else if (p.kind === 'ring') {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4 * alpha + 1;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.25 + 0.75 * Math.sqrt(k)), 0, TAU);
      ctx.stroke();
    } else if (p.kind === 'twinkle') {
      ctx.globalAlpha = alpha;
      sparkle(ctx, p.x, p.y, p.size * (1 - k * 0.5), p.color);
    } else if (p.kind === 'swirl') {
      drawSwirl(ctx, p, k);
    } else {
      if (p.kind === 'spark') glow(ctx, p.x, p.y, p.size * 3.5, p.color === PALETTE.green ? '95,211,141' : '255,170,70', alpha * 0.6);
      ctx.globalAlpha = alpha;
      blob(ctx, p.x, p.y, p.size, p.color ?? PALETTE.gold, null);
    }
  }
  ctx.globalAlpha = 1;
}
