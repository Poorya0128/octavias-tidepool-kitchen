/**
 * Portraits of the bistro's regulars, drawn in code. Puffy inflates as her patience runs out,
 * so the portrait itself is her patience meter.
 */

import { PALETTE } from '../config.js';
import { blob, oval, TAU } from './draw.js';

const INK = PALETTE.ink;

/** Two cartoon eyes looking slightly toward the kitchen. */
function eyes(ctx, x, y, r, gap, look = 0.2, sleepy = false) {
  for (const side of [-1, 1]) {
    const ex = x + side * gap;
    blob(ctx, ex, y, r, '#ffffff', INK, 2);
    if (sleepy) {
      ctx.fillStyle = 'rgba(120,150,110,0.95)';
      ctx.beginPath();
      ctx.arc(ex, y, r, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - r, y);
      ctx.lineTo(ex + r, y);
      ctx.stroke();
    }
    blob(ctx, ex + look * r, y + (sleepy ? r * 0.35 : 0.1 * r), r * 0.48, INK, null);
    blob(ctx, ex + look * r - r * 0.18, y - r * 0.2 + (sleepy ? r * 0.3 : 0), r * 0.16, '#ffffff', null);
  }
}

/** A small curved mouth; `mood` 1 is a smile, 0 a frown. */
function mouth(ctx, x, y, w, mood) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const curve = (mood - 0.45) * w * 0.9;
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x, y + curve, x + w / 2, y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

const PORTRAITS = {
  puffy(ctx, x, y, r, mood, t) {
    const puff = 1 + (1 - mood) * 0.32;
    const rr = r * 0.62 * puff;
    if (mood < 0.75) {
      ctx.fillStyle = '#d98b1e';
      const n = 14;
      const len = rr * (0.2 + (1 - mood) * 0.35);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + t * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a - 0.12) * rr, y + Math.sin(a - 0.12) * rr);
        ctx.lineTo(x + Math.cos(a) * (rr + len), y + Math.sin(a) * (rr + len));
        ctx.lineTo(x + Math.cos(a + 0.12) * rr, y + Math.sin(a + 0.12) * rr);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x - rr * 0.9, y);
    ctx.lineTo(x - rr * 1.35, y - rr * 0.35);
    ctx.lineTo(x - rr * 1.35, y + rr * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    blob(ctx, x, y, rr, '#ffd166', INK, 2.5);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.ellipse(x, y + rr * 0.35, rr * 0.7, rr * 0.45, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(217,139,30,0.6)';
    for (const [dx, dy] of [[-0.4, -0.45], [0.1, -0.6], [0.45, -0.3]]) blob(ctx, x + dx * rr, y + dy * rr, rr * 0.1, 'rgba(217,139,30,0.6)', null);
    eyes(ctx, x + rr * 0.12, y - rr * 0.12, rr * 0.24, rr * 0.36, 0.3);
    mouth(ctx, x + rr * 0.15, y + rr * 0.42, rr * 0.34, mood);
  },
  shelby(ctx, x, y, r, mood, t, changed) {
    const shell = changed ? '#7fd1b9' : '#c9b8ff';
    ctx.save();
    ctx.translate(x + r * 0.2, y - r * 0.05);
    blob(ctx, 0, 0, r * 0.55, shell, INK, 2.5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) {
      const rr = (r * 0.48 * a) / (TAU * 2.2);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.restore();
    blob(ctx, x - r * 0.25, y + r * 0.2, r * 0.36, '#ef5b4c', INK, 2.5);
    for (const side of [-1, 1]) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.25 + side * r * 0.12, y);
      ctx.lineTo(x - r * 0.25 + side * r * 0.2, y - r * 0.28);
      ctx.stroke();
    }
    eyes(ctx, x - r * 0.25, y - r * 0.32, r * 0.13, r * 0.2, 0.2);
    oval(ctx, x - r * 0.68, y + r * 0.34, r * 0.2, r * 0.14, '#ef5b4c', INK, 2);
    mouth(ctx, x - r * 0.25, y + r * 0.3, r * 0.24, mood);
  },
  twins(ctx, x, y, r, mood, t) {
    for (const [dx, col, dir] of [[-0.3, '#ff9aa8', -1], [0.3, '#7fd1b9', 1]]) {
      const cx = x + dx * r;
      const bob = Math.sin(t * 2 + dx * 6) * r * 0.04;
      ctx.save();
      ctx.translate(cx, y + bob);
      ctx.scale(dir, 1);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.55);
      ctx.quadraticCurveTo(r * 0.32, -r * 0.6, r * 0.28, -r * 0.3);
      ctx.lineTo(r * 0.42, -r * 0.24);
      ctx.lineTo(r * 0.26, -r * 0.14);
      ctx.quadraticCurveTo(r * 0.24, r * 0.1, r * 0.05, r * 0.2);
      ctx.quadraticCurveTo(r * 0.2, r * 0.5, -r * 0.05, r * 0.62);
      ctx.quadraticCurveTo(-r * 0.2, r * 0.45, -r * 0.06, r * 0.35);
      ctx.quadraticCurveTo(-r * 0.25, r * 0.05, -r * 0.05, -r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      blob(ctx, r * 0.1, -r * 0.36, r * 0.08, '#ffffff', INK, 1.5);
      blob(ctx, r * 0.12, -r * 0.36, r * 0.04, INK, null);
      ctx.restore();
    }
    mouth(ctx, x, y + r * 0.62, r * 0.2, mood);
  },
  tortuga(ctx, x, y, r, mood) {
    oval(ctx, x + r * 0.2, y + r * 0.35, r * 0.62, r * 0.36, '#5b8c4a', INK, 2.5);
    ctx.strokeStyle = 'rgba(30,60,30,0.6)';
    ctx.lineWidth = 2;
    for (const dx of [-0.2, 0.2, 0.55]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + r * 0.35, r * 0.16, 0, TAU);
      ctx.stroke();
    }
    oval(ctx, x - r * 0.22, y - r * 0.08, r * 0.42, r * 0.38, '#9ccf7f', INK, 2.5);
    ctx.strokeStyle = 'rgba(40,80,40,0.5)';
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y + r * 0.18, r * 0.2, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    eyes(ctx, x - r * 0.24, y - r * 0.18, r * 0.12, r * 0.18, 0.2, true);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x - r * 0.24 + side * r * 0.18, y - r * 0.18, r * 0.15, 0, TAU);
      ctx.stroke();
    }
    mouth(ctx, x - r * 0.24, y + r * 0.08, r * 0.26, Math.max(0.5, mood));
  },
  mantis(ctx, x, y, r, mood, t) {
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#ff7a59');
    g.addColorStop(0.5, '#5fd38d');
    g.addColorStop(1, '#5aa9e6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.48, r * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    for (const side of [-1, 1]) {
      const ex = x + side * r * 0.28;
      const ey = y - r * 0.48 + Math.sin(t * 3 + side) * r * 0.03;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + side * r * 0.12, y - r * 0.05);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      oval(ctx, ex, ey, r * 0.16, r * 0.12, '#3b2a4d', INK, 2);
      ctx.fillStyle = '#7ff0ff';
      ctx.fillRect(ex - r * 0.16, ey - r * 0.02, r * 0.32, r * 0.04);
    }
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + r * 0.28, y - r * 0.48, r * 0.2, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#3b2a4d';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.05, y - r * 0.12, r * 0.34, r * 0.1, -0.15, 0, TAU);
    ctx.fill();
    blob(ctx, x - r * 0.05, y - r * 0.2, r * 0.06, '#3b2a4d', null);
    mouth(ctx, x, y + r * 0.28, r * 0.3, mood);
  },
};

/** Draws a customer's portrait in a round frame of radius r; `mood` is the patience share 0..1. */
export function drawCustomer(ctx, customerId, x, y, r, mood = 1, t = 0, changed = false) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#1d6f7a');
  g.addColorStop(1, '#0b3a42');
  ctx.fillStyle = g;
  ctx.fill();
  if (customerId !== 'puffy') ctx.clip();
  PORTRAITS[customerId](ctx, x, y, r, mood, t, changed);
  ctx.restore();
}

/**
 * The diners at the Current Window, drawn inside `rect` ({x, y, w, h}) behind the plates:
 * the customer the front plate is for, large, and the next one peeking in.
 */
export function drawWindowDiners(ctx, state, t, rect) {
  // Filled in by the v2 character pass.
}
