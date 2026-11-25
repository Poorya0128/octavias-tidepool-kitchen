/**
 * Octavia herself: her mantle, chef's toque, eyes that follow the work, and eight tentacles
 * drawn as tapered bezier curves with suckers, reaching from her body to the stations.
 */

import { LAYOUT, PALETTE } from '../config.js';
import { ARM_REST, ARM_ROOTS } from '../arms.js';
import { blob, TAU } from './draw.js';
import { drawIngredient } from './food.js';

const SKIN = '#ff8a7a';
const SKIN_DARK = '#d9534f';
const BELLY = '#ffc9b9';

/** Smoothed tip positions the renderer animates toward each arm's logical target. */
export function createArmView() {
  return ARM_REST.map((p) => ({ x: p.x, y: p.y }));
}

/** Moves each drawn tip toward its arm's target, adding chop, stir and idle motion. */
export function updateArmView(view, state, dt, t, calm = false) {
  state.arms.forEach((arm, i) => {
    let { x, y } = arm.target;
    const sway = calm ? 0 : 1;
    if (arm.state === 'chop') y += Math.abs(Math.sin(t * 14)) * -16;
    else if (arm.state === 'stir') {
      x += Math.cos(t * 6 + i) * 16 * sway;
      y += Math.sin(t * 6 + i) * 6 * sway;
    } else if (arm.state === 'idle' && arm.reach <= 0) {
      x += Math.sin(t * 1.3 + i * 1.7) * 7 * sway;
      y += Math.cos(t * 1.1 + i) * 5 * sway;
    } else if (arm.state === 'hold' && arm.reach <= 0) y += Math.sin(t * 2 + i) * 3 * sway;
    const k = Math.min(1, dt * (arm.reach > 0 ? 16 : 9));
    view[i].x += (x - view[i].x) * k;
    view[i].y += (y - view[i].y) * k;
  });
}

/** Samples a cubic bezier at u. */
function bez(p0, p1, p2, p3, u) {
  const m = 1 - u;
  return {
    x: m * m * m * p0.x + 3 * m * m * u * p1.x + 3 * m * u * u * p2.x + u * u * u * p3.x,
    y: m * m * m * p0.y + 3 * m * m * u * p1.y + 3 * m * u * u * p2.y + u * u * u * p3.y,
  };
}

/** One tentacle from its root to its tip, tapering, with a pale underside and suckers. */
function drawTentacle(ctx, root, tip, i, t) {
  const side = i < 4 ? -1 : 1;
  const c1 = { x: root.x + side * 12, y: root.y + 60 };
  const c2 = { x: tip.x - (tip.x - root.x) * 0.2, y: tip.y - 46 + Math.sin(t * 2 + i) * 6 };
  const n = 22;
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push(bez(root, c1, c2, tip, k / n));
  const left = [];
  const right = [];
  for (let k = 0; k <= n; k++) {
    const a = pts[Math.max(0, k - 1)];
    const b = pts[Math.min(n, k + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const w = 15 - (k / n) * 10.5;
    left.push({ x: pts[k].x - (dy / len) * w, y: pts[k].y + (dx / len) * w });
    right.push({ x: pts[k].x + (dy / len) * w, y: pts[k].y - (dx / len) * w });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  ctx.arc(tip.x, tip.y, 4.5, 0, TAU);
  for (let k = n; k >= 0; k--) ctx.lineTo(right[k].x, right[k].y);
  ctx.closePath();
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  ctx.strokeStyle = BELLY;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let k = 2; k <= n; k++) {
    const p = { x: (pts[k].x * 2 + right[k].x) / 3, y: (pts[k].y * 2 + right[k].y) / 3 };
    if (k === 2) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  for (let k = 4; k < n; k += 3) {
    const p = { x: (pts[k].x + right[k].x * 2) / 3, y: (pts[k].y + right[k].y * 2) / 3 };
    blob(ctx, p.x, p.y, 3.2 - (k / n) * 1.6, '#ffe1d6', 'rgba(59,42,77,0.55)', 1.2);
  }
}

/** A tiny shell knife for the chopping arm. */
function knife(ctx, x, y) {
  ctx.fillStyle = '#e6f4f1';
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 2);
  ctx.lineTo(x + 26, y + 6);
  ctx.lineTo(x - 2, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
}

/** A small ladle for a stirring arm. */
function ladle(ctx, x, y) {
  ctx.strokeStyle = '#8a5a34';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 6, y + 22);
  ctx.stroke();
  blob(ctx, x + 7, y + 24, 6, '#c8a26b', PALETTE.ink, 2);
}

/** Octavia's mantle, toque and face; she looks toward `look`. */
function drawBody(ctx, look, t, blink) {
  const { x } = LAYOUT.octavia;
  const y = LAYOUT.octavia.y - 26;
  const g = ctx.createRadialGradient(x - 22, y - 34, 10, x, y + 10, 96);
  g.addColorStop(0, '#ffb3a3');
  g.addColorStop(0.55, SKIN);
  g.addColorStop(1, SKIN_DARK);
  ctx.beginPath();
  ctx.moveTo(x - 72, y + 30);
  ctx.bezierCurveTo(x - 92, y - 70, x + 92, y - 70, x + 72, y + 30);
  ctx.bezierCurveTo(x + 66, y + 70, x - 66, y + 70, x - 72, y + 30);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  for (const [dx, dy, r] of [[-40, -22, 7], [34, -34, 5], [48, 4, 6], [-52, 10, 4], [14, -48, 4]]) blob(ctx, x + dx, y + dy, r, 'rgba(255,214,200,0.85)', null);
  const tx = x;
  const ty = y - 58;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tx - 26, ty - 14, 20, 0, TAU);
  ctx.arc(tx, ty - 26, 24, 0, TAU);
  ctx.arc(tx + 26, ty - 14, 20, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(tx - 36, ty - 12, 72, 22);
  ctx.strokeRect(tx - 36, ty - 12, 72, 22);
  ctx.fillStyle = PALETTE.coral;
  ctx.fillRect(tx - 36, ty + 2, 72, 6);
  const dx = Math.max(-1, Math.min(1, (look.x - x) / 300));
  const dy = Math.max(-1, Math.min(1, (look.y - y) / 300));
  for (const side of [-1, 1]) {
    const ex = x + side * 27;
    const ey = y + 2;
    blob(ctx, ex, ey, 18, '#ffffff', PALETTE.ink, 3);
    if (blink) {
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(ex, ey, 18, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - 12, ey + 2);
      ctx.quadraticCurveTo(ex, ey + 8, ex + 12, ey + 2);
      ctx.stroke();
    } else {
      blob(ctx, ex + dx * 7, ey + dy * 6, 9, PALETTE.ink, null);
      blob(ctx, ex + dx * 7 - 3, ey + dy * 6 - 4, 3.2, '#ffffff', null);
    }
  }
  blob(ctx, x - 48, y + 26, 9, 'rgba(255,90,110,0.35)', null);
  blob(ctx, x + 48, y + 26, 9, 'rgba(255,90,110,0.35)', null);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + 26 + Math.sin(t * 1.5) * 1, 13, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Octavia waving all eight arms, for the title and results screens; (x, y) is her centre. */
export function drawOctaviaPortrait(ctx, x, y, scale, t) {
  const o = LAYOUT.octavia;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-o.x, -o.y);
  drawBody(ctx, { x: o.x + 120, y: o.y + 60 }, t, Math.sin(t * 0.9) > 0.985);
  ARM_ROOTS.forEach((root, i) => {
    const side = i < 4 ? -1 : 1;
    const k = i < 4 ? 3 - i : i - 4;
    const wave = Math.sin(t * 1.6 + i * 0.9);
    const tip = { x: root.x + side * (70 + k * 44), y: root.y + 40 + k * 26 - (k === 3 ? 120 + wave * 30 : wave * 18) };
    drawTentacle(ctx, root, tip, i, t);
  });
  ctx.restore();
}

/**
 * Draws Octavia with every arm: tentacles behind the counter edge reach to their tips, holding
 * arms show their item, chopping and stirring arms carry a knife or a ladle.
 */
export function drawOctavia(ctx, state, view, t) {
  const busy = state.arms.filter((a) => a.state !== 'idle' || a.reach > 0);
  const look = busy.length ? busy.reduce((p, a) => (a.heldAt > p.heldAt ? a : p), busy[0]).target : { x: 640, y: 520 };
  const blink = Math.sin(t * 0.9) > 0.985;
  drawBody(ctx, look, t, blink);
  const order = state.arms.map((a, i) => i).sort((a, b) => view[a].y - view[b].y);
  for (const i of order) drawTentacle(ctx, ARM_ROOTS[i], view[i], i, t);
  for (const i of order) {
    const arm = state.arms[i];
    const tip = view[i];
    if (arm.state === 'hold' && arm.item) {
      drawIngredient(ctx, arm.item.ing, tip.x, tip.y - 14, 34, arm.item.prep, t);
      ctx.strokeStyle = SKIN_DARK;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y - 8, 10, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (arm.item.quality === 'perfect') {
        ctx.strokeStyle = 'rgba(127,240,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y - 14, 22 + Math.sin(t * 6) * 2, 0, TAU);
        ctx.stroke();
      }
    } else if (arm.state === 'chop') knife(ctx, tip.x, tip.y);
    else if (arm.state === 'stir') ladle(ctx, tip.x, tip.y);
  }
}
