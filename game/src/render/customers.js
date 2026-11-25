/**
 * The bistro's regulars, drawn in code: shaded portraits for the tickets and menus, and the
 * diners who peek into the Current Window from behind their plates and speak up in bubbles.
 * Puffy inflates as her patience runs out, so the portrait itself is her patience meter.
 */

import { PALETTE, TUNING } from '../config.js';
import { patienceShare, slotPoint, ticketForPlate } from '../orders.js';
import { blob, font, ring, roundRect, starRow, TAU, text } from './draw.js';

const INK = PALETTE.ink;

/** Light, base and dark tones of each regular's colours. */
const TONES = {
  puffy: ['#fff2b0', '#ffd166', '#e0952a'],
  crab: ['#ff9d8f', '#ef5b4c', '#b3372e'],
  lilac: ['#f1eaff', '#c9b8ff', '#8f78d6'],
  mint: ['#d4f7ea', '#7fd1b9', '#3f9c86'],
  pink: ['#ffd3da', '#ff9aa8', '#d96679'],
  turtle: ['#d6f0bd', '#9ccf7f', '#5f9147'],
  shell: ['#9fcf7c', '#5b8c4a', '#35602b'],
  mantis: ['#ffd0a8', '#ff7a59', '#c2452f'],
};

/** A gradient lit from the top left over a shape of radius r around (x, y). */
function lit(ctx, x, y, r, [light, base, dark]) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x, y, r * 1.1);
  g.addColorStop(0, light);
  g.addColorStop(0.55, base);
  g.addColorStop(1, dark);
  return g;
}

/** An outlined ellipse shaded from the top left, with a soft gloss. */
function ball(ctx, x, y, rx, ry, tones, line = 2.5) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = lit(ctx, x, y, Math.max(rx, ry), tones);
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.36, y - ry * 0.5, rx * 0.3, ry * 0.15, -0.5, 0, TAU);
  ctx.fill();
}

/**
 * One glossy eye; `look` and `lookY` shift the pupil, `side` (-1 left, 1 right) slants the
 * brow. As `mood` (patience) falls the lid droops in `skin` and the brow knits; `sleepy` keeps
 * the lid half shut.
 */
function eye(ctx, ex, y, r, side, mood, { look = 0.2, lookY = 0.1, skin = '#ffffff', sleepy = false } = {}) {
  const lid = sleepy ? 0.48 : mood < 0.28 ? 0.34 : mood < 0.55 ? 0.18 : 0;
  const px = ex + look * r * 0.45;
  const py = y + lookY * r * 0.45;
  blob(ctx, ex, y, r, '#ffffff', null);
  blob(ctx, px, py, r * 0.56, INK, null);
  blob(ctx, px - r * 0.2, py - r * 0.22, r * 0.2, '#ffffff', null);
  blob(ctx, px + r * 0.18, py + r * 0.2, r * 0.09, '#ffffff', null);
  ctx.lineWidth = Math.max(1.5, r * 0.2);
  ctx.strokeStyle = INK;
  if (lid > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, y, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = skin;
    ctx.fillRect(ex - r, y - r, r * 2, r * 2 * lid);
    ctx.beginPath();
    ctx.moveTo(ex - r, y - r + r * 2 * lid);
    ctx.lineTo(ex + r, y - r + r * 2 * lid);
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(ex, y, r, 0, TAU);
  ctx.stroke();
  if (mood < 0.28 && !sleepy) {
    ctx.lineWidth = Math.max(2, r * 0.36);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex + side * r, y - r * 1.3);
    ctx.lineTo(ex - side * r * 0.7, y - r * 0.9);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

/** A pair of eyes `gap` either side of x. */
function eyes(ctx, x, y, r, gap, mood, opts) {
  for (const side of [-1, 1]) eye(ctx, x + side * gap, y, r, side, mood, opts);
}

/** A mouth: an open grin when delighted, then a smile, a flat line and a frown as `mood` falls. */
function mouth(ctx, x, y, w, mood) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, w * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  if (mood > 0.8) {
    ctx.quadraticCurveTo(x, y + w * 0.95, x + w / 2, y);
    ctx.closePath();
    ctx.fillStyle = '#8a2c46';
    ctx.fill();
  } else {
    ctx.quadraticCurveTo(x, y + (mood - 0.45) * w * 0.9, x + w / 2, y);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Soft pink cheeks. */
function cheeks(ctx, x, y, gap, r) {
  for (const side of [-1, 1]) blob(ctx, x + side * gap, y, r, 'rgba(255,105,130,0.35)', null);
}

const PORTRAITS = {
  puffy(ctx, x, y, r, mood, t) {
    const puff = 1 + (1 - mood) * 0.32;
    const rr = r * 0.62 * puff;
    if (mood < 0.75) {
      const n = 14;
      const len = rr * (0.2 + (1 - mood) * 0.35);
      ctx.fillStyle = '#d98b1e';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + t * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a - 0.13) * rr, y + Math.sin(a - 0.13) * rr);
        ctx.lineTo(x + Math.cos(a) * (rr + len), y + Math.sin(a) * (rr + len));
        ctx.lineTo(x + Math.cos(a + 0.13) * rr, y + Math.sin(a + 0.13) * rr);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x - rr * 0.9, y);
    ctx.quadraticCurveTo(x - rr * 1.2, y - rr * 0.5, x - rr * 1.42, y - rr * 0.42);
    ctx.quadraticCurveTo(x - rr * 1.25, y, x - rr * 1.42, y + rr * 0.42);
    ctx.quadraticCurveTo(x - rr * 1.2, y + rr * 0.5, x - rr * 0.9, y);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ball(ctx, x, y, rr, rr, TONES.puffy);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rr - 1.5, 0, TAU);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,246,214,0.85)';
    ctx.beginPath();
    ctx.ellipse(x + rr * 0.1, y + rr * 0.72, rr * 0.85, rr * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    for (const [dx, dy] of [[-0.42, -0.5], [0.08, -0.66], [0.5, -0.38], [-0.62, -0.08]]) blob(ctx, x + dx * rr, y + dy * rr, rr * 0.09, 'rgba(196,118,24,0.7)', null);
    eyes(ctx, x + rr * 0.14, y - rr * 0.14, rr * 0.25, rr * 0.36, mood, { look: 0.35, skin: '#ffd166' });
    cheeks(ctx, x + rr * 0.14, y + rr * 0.22, rr * 0.5, rr * 0.13);
    if (mood < 0.28) blob(ctx, x + rr * 0.16, y + rr * 0.45, rr * 0.11, '#8a2c46', INK, 1.8);
    else mouth(ctx, x + rr * 0.16, y + rr * 0.4, rr * 0.34, mood);
  },
  shelby(ctx, x, y, r, mood, t, changed) {
    const sx = x + r * 0.2;
    const sy = y - r * 0.08;
    const sr = r * 0.56;
    ball(ctx, sx, sy, sr, sr, changed ? TONES.mint : TONES.lilac);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) {
      const rr = (sr * 0.86 * a) / (TAU * 2.2);
      ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    }
    ctx.stroke();
    const snap = mood < 0.28 ? Math.abs(Math.sin(t * 9)) * 0.35 : 0.12;
    const cx = x - r * 0.62;
    const cy = y + r * 0.12;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s * snap - 0.5);
      ball(ctx, 0, s * r * 0.08, r * 0.2, r * 0.1, TONES.crab, 2);
      ctx.restore();
    }
    ball(ctx, x - r * 0.25, y + r * 0.24, r * 0.38, r * 0.32, TONES.crab);
    for (const side of [-1, 1]) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.25 + side * r * 0.1, y + r * 0.02);
      ctx.lineTo(x - r * 0.25 + side * r * 0.2, y - r * 0.24);
      ctx.stroke();
    }
    eyes(ctx, x - r * 0.25, y - r * 0.32, r * 0.14, r * 0.2, mood, { skin: '#ef5b4c' });
    cheeks(ctx, x - r * 0.25, y + r * 0.22, r * 0.22, r * 0.07);
    mouth(ctx, x - r * 0.25, y + r * 0.28, r * 0.24, mood);
  },
  twins(ctx, x, y, r, mood, t) {
    for (const [dx, tones, dir] of [[-0.3, TONES.pink, -1], [0.3, TONES.mint, 1]]) {
      const bob = Math.sin(t * 2 + dx * 6) * r * 0.04;
      ctx.save();
      ctx.translate(x + dx * r, y + bob);
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.55);
      ctx.quadraticCurveTo(r * 0.32, -r * 0.6, r * 0.28, -r * 0.3);
      ctx.lineTo(r * 0.44, -r * 0.24);
      ctx.lineTo(r * 0.26, -r * 0.13);
      ctx.quadraticCurveTo(r * 0.24, r * 0.1, r * 0.05, r * 0.2);
      ctx.quadraticCurveTo(r * 0.2, r * 0.5, -r * 0.05, r * 0.62);
      ctx.quadraticCurveTo(-r * 0.2, r * 0.45, -r * 0.06, r * 0.35);
      ctx.quadraticCurveTo(-r * 0.25, r * 0.05, -r * 0.05, -r * 0.55);
      ctx.closePath();
      ctx.fillStyle = lit(ctx, r * 0.05, -r * 0.1, r * 0.6, tones);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(59,42,77,0.35)';
      ctx.lineWidth = 1.5;
      for (const k of [0, 0.12, 0.24]) {
        ctx.beginPath();
        ctx.arc(r * 0.02, r * (0.02 + k), r * 0.12, -0.4, 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = tones[2];
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.55);
      ctx.lineTo(-r * 0.2, -r * 0.62);
      ctx.lineTo(-r * 0.12, -r * 0.48);
      ctx.lineTo(-r * 0.24, -r * 0.42);
      ctx.lineTo(-r * 0.1, -r * 0.36);
      ctx.fill();
      eye(ctx, r * 0.11, -r * 0.36, r * 0.1, 1, mood, { look: 0.4, skin: tones[1] });
      blob(ctx, r * 0.14, -r * 0.2, r * 0.05, 'rgba(255,105,130,0.45)', null);
      ctx.restore();
    }
    mouth(ctx, x, y + r * 0.66, r * 0.2, mood);
  },
  tortuga(ctx, x, y, r, mood) {
    ball(ctx, x + r * 0.2, y + r * 0.36, r * 0.64, r * 0.38, TONES.shell);
    ctx.strokeStyle = 'rgba(30,60,30,0.55)';
    ctx.lineWidth = 2;
    for (const dx of [-0.2, 0.2, 0.58]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + r * 0.4, r * 0.15, 0, TAU);
      ctx.stroke();
    }
    ball(ctx, x - r * 0.22, y - r * 0.08, r * 0.43, r * 0.38, TONES.turtle);
    ctx.strokeStyle = 'rgba(40,80,40,0.5)';
    ctx.lineWidth = 1.5;
    for (const k of [0, 1]) {
      ctx.beginPath();
      ctx.arc(x - r * 0.22, y - r * (0.1 - k * 0.06), r * 0.2, Math.PI * 1.3, Math.PI * 1.7);
      ctx.stroke();
    }
    eyes(ctx, x - r * 0.24, y - r * 0.14, r * 0.11, r * 0.18, mood, { sleepy: true, skin: '#9ccf7f' });
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x - r * 0.24 + side * r * 0.18, y - r * 0.14, r * 0.15, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x - r * 0.24 + side * r * 0.2, y - r * 0.34, r * 0.1, r * 0.05, -side * 0.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    mouth(ctx, x - r * 0.24, y + r * 0.2, r * 0.2, Math.min(0.75, Math.max(0.5, mood)));
  },
  mantis(ctx, x, y, r, mood, t) {
    const g = ctx.createLinearGradient(x - r * 0.5, y - r * 0.2, x + r * 0.5, y + r * 0.6);
    g.addColorStop(0, '#ff8a66');
    g.addColorStop(0.5, '#5fd38d');
    g.addColorStop(1, '#4a8fd6');
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.48, r * 0.42, 0, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y + r * 0.02, r * 0.16, r * 0.07, -0.5, 0, TAU);
    ctx.fill();
    for (const side of [-1, 1]) {
      const ex = x + side * r * 0.28;
      const ey = y - r * 0.48 + Math.sin(t * 3 + side) * r * 0.03;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + side * r * 0.12, y - r * 0.05);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ball(ctx, ex, ey, r * 0.17, r * 0.13, ['#8d6bb8', '#5a4470', '#2a1d38'], 2);
      ctx.fillStyle = '#7ff0ff';
      ctx.fillRect(ex - r * 0.15, ey - r * 0.02, r * 0.3, r * 0.045);
      if (mood < 0.28) {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ex + side * r * 0.14, ey - r * 0.22);
        ctx.lineTo(ex - side * r * 0.12, ey - r * 0.12);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + r * 0.28, y - r * 0.48, r * 0.21, 0, TAU);
    ctx.moveTo(x + r * 0.49, y - r * 0.48);
    ctx.quadraticCurveTo(x + r * 0.56, y - r * 0.2, x + r * 0.4, y);
    ctx.stroke();
    ctx.fillStyle = '#3b2a4d';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.05, y - r * 0.12, r * 0.34, r * 0.1, -0.15, 0, TAU);
    ctx.fill();
    blob(ctx, x - r * 0.05, y - r * 0.2, r * 0.06, '#3b2a4d', null);
    mouth(ctx, x, y + r * 0.28, r * 0.3, Math.min(0.7, mood));
    ctx.fillStyle = '#7a3fbf';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.5);
      ctx.lineTo(x + side * r * 0.17, y + r * 0.42);
      ctx.lineTo(x + side * r * 0.17, y + r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    blob(ctx, x, y + r * 0.51, r * 0.05, PALETTE.gold, INK, 1.2);
  },
};

/** Paints a portrait in its round sea-glass frame; Puffy's spikes may poke out of it. */
function framedPortrait(ctx, customerId, x, y, r, mood, changed) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#2b8f99');
  g.addColorStop(1, '#0b3a42');
  ctx.fillStyle = g;
  ctx.fill();
  if (customerId !== 'puffy') ctx.clip();
  PORTRAITS[customerId](ctx, x, y, r, mood, 0, changed);
  ctx.restore();
}

/** Framed portraits rendered once per customer, size, shell and patience step, at 2x for sharpness. */
const portraitCache = new Map();

/** Draws a customer's portrait in a round frame of radius r; `mood` is the patience share 0..1. */
export function drawCustomer(ctx, customerId, x, y, r, mood = 1, changed = false) {
  const step = Math.round(mood * 20) / 20;
  const key = `${customerId}:${r}:${changed}:${step}`;
  let art = portraitCache.get(key);
  if (!art) {
    if (typeof document === 'undefined') return framedPortrait(ctx, customerId, x, y, r, step, changed);
    const half = Math.ceil(r * (customerId === 'puffy' ? 1.32 : 1) + 2);
    const canvas = document.createElement('canvas');
    canvas.width = half * 4;
    canvas.height = half * 4;
    const c = canvas.getContext('2d');
    c.scale(2, 2);
    framedPortrait(c, customerId, half, half, r, step, changed);
    art = { canvas, half };
    portraitCache.set(key, art);
  }
  ctx.drawImage(art.canvas, x - art.half, y - art.half, art.half * 2, art.half * 2);
}

/** How far each diner's mouth sits below the portrait centre, in portrait radii, so it can rest just above the plate rim. */
const MOUTH = { puffy: 0.26, shelby: 0.28, twins: 0.12, tortuga: 0.2, mantis: 0.28 };

/** The newest voice line of a ticket, optionally of one kind. */
function lastLine(state, ticketId, kind = null) {
  const said = state.speech ?? [];
  for (let i = said.length - 1; i >= 0; i--) {
    if (said[i].ticketId === ticketId && (!kind || said[i].kind === kind)) return said[i];
  }
  return null;
}

/** A speech bubble of text with its right edge at `right` and top at y, at most `maxW` wide (wrapping if needed), its tail pointing at (tx, ty). */
function bubble(ctx, str, right, y, maxW, tx, ty) {
  font(ctx, 13, 800);
  if (ctx.measureText(str).width > maxW - 16) font(ctx, 12, 800);
  const lines = [];
  for (const word of str.split(' ')) {
    const next = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && ctx.measureText(next).width <= maxW - 16) lines[lines.length - 1] = next;
    else lines.push(word);
  }
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16);
  const h = lines.length * 15 + 7;
  const x = right - w;
  const ax = Math.max(x + 12, Math.min(x + w - 12, tx));
  ctx.beginPath();
  ctx.moveTo(ax - 6, y + h / 2);
  ctx.lineTo(tx, ty);
  ctx.lineTo(ax + 6, y + h / 2);
  ctx.closePath();
  ctx.fillStyle = PALETTE.pearl;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 16 + i * 15));
}

/** Madame Mantis's scorecard, raised over her plate with her live star rating. */
function scorecard(ctx, x, y, stars) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  roundRect(ctx, -26, -14, 52, 28, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  font(ctx, 8, 900);
  ctx.fillStyle = '#7a3fbf';
  ctx.textAlign = 'center';
  ctx.fillText('CRITIC', 0, -4);
  starRow(ctx, 0, 6, 4, stars);
  ctx.restore();
}

/** A small pink heart of size s rising from a delighted diner. */
function heart(ctx, x, y, s, alpha) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fillStyle = '#ff7a9a';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A diner facing the kitchen with portrait radius r at (x, y). */
function diner(ctx, ticket, x, y, r, mood, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  PORTRAITS[ticket.customerId](ctx, 0, 0, r, mood, t, ticket.changed);
  ctx.restore();
}

/**
 * The diners at the Current Window, drawn inside `rect` ({x, y, w, h}) before its shelves and
 * plates: each plate's customer looks over it, mouth just above the rim, the front one larger
 * and beaming. With the window empty, the longest-waiting customer peeks in from the top;
 * under two plates, the next customer in line waits at a reef table.
 */
export function drawWindowDiners(ctx, state, t, rect) {
  const waiting = state.tickets[0];
  if (!state.pass.length && waiting) diner(ctx, waiting, rect.x + rect.w * 0.6, rect.y + 32 + Math.sin(t * 1.6) * 3, 40, patienceShare(waiting), t);
  state.pass.forEach((plate, i) => {
    const ticket = ticketForPlate(state, plate);
    if (!ticket) return;
    const at = slotPoint(i);
    const front = i === 0;
    const r = front ? 52 : 36;
    const bob = front ? -Math.abs(Math.sin(t * 3)) * 3 : Math.sin(t * 2 + i) * 1.2;
    const share = patienceShare(ticket);
    const aside = (front ? 28 : 30) + (plate.recipeId === 'pudding' ? 14 : 0);
    const x = at.x + aside;
    const y = at.y - 30 - r * (MOUTH[ticket.customerId] ?? 0.25) + bob;
    diner(ctx, ticket, x, y, r, front ? Math.max(0.86, share) : share, t);
    if (front) {
      const p = (t * 0.55) % 1;
      heart(ctx, x + r * 0.62, y - r * 0.2 - p * 22, 5.5, Math.sin(p * Math.PI));
    }
    if (ticket.critic) scorecard(ctx, rect.x + 30, at.y - 40, state.critic?.live ?? 0);
  });
  const slots = state.upgrades?.biggerPlate ? TUNING.biggerPassSlots : TUNING.passSlots;
  if (state.pass.length && slots < 3) nextInLine(ctx, state, t, rect);
}

/** The next customer in line (oldest ticket without a plate at the window) waiting small at a reef table below the shelves, with their patience ring. */
function nextInLine(ctx, state, t, rect) {
  const plated = new Set(state.pass.map((plate) => ticketForPlate(state, plate)));
  const ticket = state.tickets.find((tk) => !plated.has(tk));
  if (!ticket) return;
  const x = rect.x + rect.w * 0.42;
  const top = rect.y + rect.h - 46;
  const share = patienceShare(ticket);
  diner(ctx, ticket, x, top - 24 + Math.sin(t * 1.4) * 2, 28, share, t);
  roundRect(ctx, x - 7, top, 14, 34, 5);
  ctx.fillStyle = '#8a4f6e';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, top, 46, 9, 0, 0, TAU);
  const coral = ctx.createLinearGradient(0, top - 9, 0, top + 9);
  coral.addColorStop(0, '#ffb3a0');
  coral.addColorStop(1, '#c4566a');
  ctx.fillStyle = coral;
  ctx.fill();
  ctx.stroke();
  blob(ctx, x + 22, top - 6, 6, '#7fe0ff', INK, 2);
  const rx = rect.x + rect.w - 22;
  blob(ctx, rx, top - 34, 12, 'rgba(5,25,29,0.85)', null);
  ring(ctx, rx, top - 34, 8.5, share, share > 0.5 ? PALETTE.green : share > 0.25 ? PALETTE.gold : PALETTE.red, 3.5);
  text(ctx, 'next in line', x + 8, top + 30, { size: 12, color: PALETTE.pearl, align: 'center', line: 3 });
}

/**
 * The newest voice line at the window in a bubble on the wall beside the hatch, its tail
 * reaching in: the front diner's for a few seconds, or the waiting customer's while it is empty.
 */
export function drawWindowSpeech(ctx, state, rect) {
  const plate = state.pass[0];
  const ticket = plate ? ticketForPlate(state, plate) : null;
  const waiting = !state.pass.length ? state.tickets[0] : null;
  let said = null;
  if (ticket) said = lastLine(state, ticket.id);
  else if (waiting) said = lastLine(state, waiting.id, 'wait');
  if (!said || (ticket && state.time - said.at >= 4)) return;
  bubble(ctx, said.text, rect.x + 4, rect.y + 4, 166, rect.x + 24, rect.y + 32);
}
