/**
 * Octavia herself: a softly lit mantle with rim light and freckles, a pleated chef's toque, a
 * polka-dot neckerchief, glossy eyes whose lids, brows and mouth react to the service, and
 * eight tapered tentacles with suckers reaching from her body to the stations.
 */

import { LAYOUT, PALETTE } from '../config.js';
import { ARM_REST, ARM_ROOTS } from '../arms.js';
import { patienceShare } from '../orders.js';
import { blob, sparkle, TAU } from './draw.js';
import { drawFinishedDish, drawIngredient } from './food.js';

const INK = PALETTE.ink;
const SKIN = '#ff8a7a';
const SKIN_DARK = '#d9534f';
const UNDERSIDE = '#ea6a5f';
const SUCKER = '#ffe1d6';

/** Darker spots on the mantle, relative to the head centre: [dx, dy, r]. */
const SPOTS = [[-46, -14, 6], [-26, -32, 4], [42, -24, 5.5], [58, 2, 4], [-60, 12, 3.5], [24, -38, 3], [62, 22, 3]];

/** The toque's puffy top: [dx, dy, r] from the head centre. */
const PUFFS = [[-34, -80, 17], [-14, -92, 20], [12, -94, 20], [34, -82, 17], [0, -80, 20]];

/** Per mood: upper lid (0 open, 1 shut) and its tilt, brow lift and angle, mouth and blush. */
const FACES = {
  calm: { lid: 0.12, tilt: 0, lift: 0, angle: 0.05, mouth: 'smile', blush: 0.5 },
  joy: { lid: 0, tilt: 0, lift: -6, angle: -0.15, mouth: 'open', blush: 0.85, squint: true },
  worried: { lid: 0.2, tilt: -0.6, lift: -4, angle: -0.75, mouth: 'wobble', blush: 0.3 },
  determined: { lid: 0.16, tilt: 0.2, lift: 1, angle: 0.4, mouth: 'focus', blush: 0.55 },
  dazzled: { lid: 0, tilt: 0, lift: -8, angle: -0.05, mouth: 'oh', blush: 0.85, stars: true },
  bow: { lid: 0, tilt: 0, lift: -5, angle: -0.1, mouth: 'open', blush: 0.85, closed: true },
};

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

/** The point a share `k` of the way from a to b. */
const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

/** Traces a polyline through points[from..to] into the current path. */
function trace(ctx, pts, from = 0, to = pts.length - 1) {
  ctx.moveTo(pts[from].x, pts[from].y);
  for (let k = from + 1; k <= to; k++) ctx.lineTo(pts[k].x, pts[k].y);
}

/** One tentacle from its root to its tip: tapering, darker underneath, with a row of suckers. */
function drawTentacle(ctx, root, tip, i, t) {
  const side = i < 4 ? -1 : 1;
  const c1 = { x: root.x + side * 12, y: root.y + 60 };
  const c2 = { x: tip.x - (tip.x - root.x) * 0.2, y: tip.y - 46 + Math.sin(t * 2 + i) * 6 };
  const n = 22;
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push(bez(root, c1, c2, tip, k / n));
  const left = [];
  const right = [];
  let lean = 0;
  for (let k = 0; k <= n; k++) {
    const a = pts[Math.max(0, k - 1)];
    const b = pts[Math.min(n, k + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = 15 - (k / n) * 10.5;
    const nx = (-(b.y - a.y) / len) * w;
    const ny = ((b.x - a.x) / len) * w;
    left.push({ x: pts[k].x + nx, y: pts[k].y + ny });
    right.push({ x: pts[k].x - nx, y: pts[k].y - ny });
    lean += ny;
  }
  const under = lean > 0 ? left : right;
  const over = lean > 0 ? right : left;
  const body = new Path2D();
  body.moveTo(left[0].x, left[0].y);
  for (const p of left) body.lineTo(p.x, p.y);
  body.arc(tip.x, tip.y, 4.5, 0, TAU);
  for (let k = n; k >= 0; k--) body.lineTo(right[k].x, right[k].y);
  body.closePath();
  ctx.fillStyle = SKIN;
  ctx.fill(body);
  ctx.beginPath();
  trace(ctx, pts.map((p, k) => mix(p, under[k], 0.12)));
  for (let k = n; k >= 0; k--) ctx.lineTo(under[k].x, under[k].y);
  ctx.closePath();
  ctx.fillStyle = UNDERSIDE;
  ctx.fill();
  ctx.beginPath();
  trace(ctx, pts.map((p, k) => mix(p, over[k], 0.5)), 1, n - 5);
  ctx.strokeStyle = 'rgba(255,224,212,0.85)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke(body);
  for (let k = 3; k < n; k += 2) {
    const p = mix(pts[k], under[k], 0.55);
    const r = (15 - (k / n) * 10.5) * 0.3;
    blob(ctx, p.x, p.y, r, SUCKER, 'rgba(59,42,77,0.5)', 1.2);
    blob(ctx, p.x, p.y, r * 0.45, '#f3a493', null);
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
  ctx.strokeStyle = INK;
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
  blob(ctx, x + 7, y + 24, 6, '#c8a26b', INK, 2);
}

/** Octavia's mood: dazzled in an Ink Burst, joyful after a perfect cook or a serve, worried by
 * burning food or a customer about to leave, determined in a Spring Tide, else calm. */
function moodOf(state) {
  if (state.ink?.active) return 'dazzled';
  const since = (type) => state.time - (state.moments?.[type] ?? -99);
  if (since('cookPerfect') < 1.5 || since('serve') < 1.5) return 'joy';
  const scorching = Object.values(state.stations).some((st) => st.slots.some((s) => s?.phase === 'burnt' || s?.phase === 'over'));
  if (scorching || state.tickets.some((tk) => patienceShare(tk) < 0.2)) return 'worried';
  return state.rush?.active ? 'determined' : 'calm';
}

/**
 * One glossy eye: white, iris, pupil and glints, an upper lid and, when happy, a raised cheek.
 * Shut (a blink) it is a lashed curve; in a bow, a happy arch.
 */
function drawEye(ctx, ex, ey, side, dx, dy, face, shut, skin) {
  if (face.closed || shut) {
    const arch = face.closed ? -12 : 10;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - 13, ey + 4);
    ctx.quadraticCurveTo(ex, ey + 4 + arch, ex + 13, ey + 4);
    if (!face.closed) {
      ctx.moveTo(ex + side * 12, ey + 5);
      ctx.lineTo(ex + side * 17, ey + 1);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    return;
  }
  const rx = 16;
  const ry = 19;
  const eye = new Path2D();
  eye.ellipse(ex, ey, rx, ry, 0, 0, TAU);
  const white = ctx.createRadialGradient(ex - 5, ey - 8, 2, ex, ey, ry + 2);
  white.addColorStop(0, '#ffffff');
  white.addColorStop(1, '#dce5f0');
  ctx.fillStyle = white;
  ctx.fill(eye);
  ctx.save();
  ctx.clip(eye);
  const ix = ex + dx * 5;
  const iy = ey + dy * 6 + 2;
  const iris = ctx.createRadialGradient(ix - 2, iy - 3, 1, ix, iy, 11);
  iris.addColorStop(0, face.stars ? '#e3d0ff' : '#9a78c4');
  iris.addColorStop(1, face.stars ? '#6a3fb5' : INK);
  blob(ctx, ix, iy, 11, iris, null);
  blob(ctx, ix, iy, 5.5, '#1d1230', null);
  if (face.stars) sparkle(ctx, ix - 3, iy - 3, 7);
  else blob(ctx, ix - 4, iy - 4.5, 3.8, '#ffffff', null);
  blob(ctx, ix + 4, iy + 4, 1.8, '#ffffff', null);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  const lid = face.lid;
  if (lid > 0) {
    const base = ey - ry + 2 * ry * lid;
    const k = face.tilt * ry * 0.5;
    const inner = ex - side * (rx + 2);
    const outer = ex + side * (rx + 2);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(outer, ey - ry - 4);
    ctx.lineTo(outer, base - k);
    ctx.quadraticCurveTo(ex, base + 3, inner, base + k);
    ctx.lineTo(inner, ey - ry - 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(outer, base - k);
    ctx.quadraticCurveTo(ex, base + 3, inner, base + k);
    ctx.stroke();
  }
  if (face.squint) {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(ex, ey + ry * 1.32, ry * 0.95, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke(eye);
}

/** Her mouth for the mood, centred under the eyes at (x, y). */
function drawMouth(ctx, x, y, mouth, t) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (mouth === 'open') {
    const open = new Path2D();
    open.moveTo(x - 18, y + 22);
    open.bezierCurveTo(x - 15, y + 50, x + 15, y + 50, x + 18, y + 22);
    open.quadraticCurveTo(x, y + 28, x - 18, y + 22);
    ctx.fillStyle = '#7d2440';
    ctx.fill(open);
    ctx.save();
    ctx.clip(open);
    blob(ctx, x + 2, y + 45, 11, '#ff7d95', null);
    ctx.restore();
    ctx.stroke(open);
    ctx.lineCap = 'butt';
    return;
  } else if (mouth === 'focus') {
    ctx.ellipse(x + 11, y + 31, 6, 7, -0.5, 0, Math.PI);
    ctx.fillStyle = '#ff7d95';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 28);
    ctx.quadraticCurveTo(x - 2, y + 36, x + 15, y + 25);
    ctx.lineWidth = 3.5;
  } else if (mouth === 'wobble') {
    ctx.moveTo(x - 13, y + 33);
    for (let k = 1; k <= 4; k++) ctx.quadraticCurveTo(x - 13 + k * 6.5 - 3.25, y + 33 + (k % 2 ? -4 : 4), x - 13 + k * 6.5, y + 33);
  } else if (mouth === 'oh') {
    ctx.ellipse(x, y + 33, 7, 9 + Math.sin(t * 6), 0, 0, TAU);
    ctx.fillStyle = '#7d2440';
    ctx.fill();
  } else {
    ctx.arc(x, y + 24 + Math.sin(t * 1.5), 13, 0.25, Math.PI - 0.25);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** The chef's toque over the head centred on (x, y): pleated crown, puffy top and a striped band. */
function drawToque(ctx, x, y) {
  const cloth = ctx.createLinearGradient(x - 52, y - 110, x + 52, y - 40);
  cloth.addColorStop(0, '#ffffff');
  cloth.addColorStop(0.55, '#f2f4f9');
  cloth.addColorStop(1, '#c6cede');
  const crown = new Path2D();
  crown.moveTo(x - 40, y - 56);
  crown.lineTo(x - 47, y - 80);
  crown.lineTo(x + 47, y - 80);
  crown.lineTo(x + 40, y - 56);
  crown.closePath();
  const puffs = new Path2D();
  for (const [dx, dy, r] of PUFFS) {
    puffs.moveTo(x + dx + r, y + dy);
    puffs.arc(x + dx, y + dy, r, 0, TAU);
  }
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke(crown);
  ctx.stroke(puffs);
  ctx.fillStyle = cloth;
  ctx.fill(crown);
  ctx.fill(puffs);
  ctx.strokeStyle = 'rgba(110,118,150,0.45)';
  ctx.lineWidth = 2;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 15, y - 56);
    ctx.quadraticCurveTo(x + k * 17, y - 72, x + k * 19, y - 86);
    ctx.stroke();
  }
  blob(ctx, x - 22, y - 98, 6, 'rgba(255,255,255,0.95)', null);
  ctx.beginPath();
  ctx.moveTo(x - 42, y - 60);
  ctx.quadraticCurveTo(x, y - 54, x + 42, y - 60);
  ctx.lineTo(x + 40, y - 38);
  ctx.quadraticCurveTo(x, y - 30, x - 40, y - 38);
  ctx.closePath();
  ctx.fillStyle = cloth;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 41, y - 51);
  ctx.quadraticCurveTo(x, y - 44, x + 41, y - 51);
  ctx.lineTo(x + 41, y - 45);
  ctx.quadraticCurveTo(x, y - 38, x - 41, y - 45);
  ctx.closePath();
  ctx.fillStyle = PALETTE.coral;
  ctx.fill();
  blob(ctx, x, y - 42, 4, PALETTE.gold, INK, 1.5);
}

/** A teal polka-dot neckerchief knotted where the tentacles meet the mantle (head centre x, y). */
function drawKerchief(ctx, x, y) {
  const cloth = ctx.createLinearGradient(x - 50, y + 50, x + 40, y + 100);
  cloth.addColorStop(0, '#45c7cf');
  cloth.addColorStop(1, '#13707d');
  const scarf = new Path2D();
  scarf.moveTo(x - 50, y + 52);
  scarf.quadraticCurveTo(x, y + 72, x + 50, y + 52);
  scarf.lineTo(x + 46, y + 64);
  scarf.quadraticCurveTo(x + 26, y + 76, x + 14, y + 78);
  scarf.lineTo(x + 3, y + 104);
  scarf.lineTo(x - 15, y + 77);
  scarf.quadraticCurveTo(x - 30, y + 76, x - 46, y + 64);
  scarf.closePath();
  ctx.fillStyle = cloth;
  ctx.fill(scarf);
  ctx.save();
  ctx.clip(scarf);
  for (const [dx, dy] of [[-36, 62], [-16, 70], [8, 72], [30, 66], [-4, 86], [4, 96], [-10, 80]]) blob(ctx, x + dx, y + dy, 2.6, 'rgba(255,246,230,0.9)', null);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke(scarf);
  blob(ctx, x - 1, y + 72, 7.5, '#2aa3ae', INK, 2.5);
}

/** Mantle, face and toque, looking toward `look`, with the expression of `mood`. */
function drawBody(ctx, look, t, mood) {
  const face = FACES[mood];
  const { x } = LAYOUT.octavia;
  const y = LAYOUT.octavia.y - 26;
  const head = new Path2D();
  head.moveTo(x - 72, y + 30);
  head.bezierCurveTo(x - 92, y - 70, x + 92, y - 70, x + 72, y + 30);
  head.bezierCurveTo(x + 66, y + 70, x - 66, y + 70, x - 72, y + 30);
  head.closePath();
  ctx.save();
  ctx.translate(7, 9);
  ctx.fillStyle = 'rgba(4,22,26,0.3)';
  ctx.fill(head);
  ctx.restore();
  const skin = ctx.createRadialGradient(x - 30, y - 30, 6, x + 6, y + 6, 106);
  skin.addColorStop(0, '#ffcab9');
  skin.addColorStop(0.45, SKIN);
  skin.addColorStop(1, SKIN_DARK);
  ctx.save();
  ctx.clip(head);
  ctx.fillStyle = '#ffd3c4';
  ctx.fill(head);
  ctx.translate(-4, -5);
  ctx.fillStyle = skin;
  ctx.fill(head);
  ctx.restore();
  for (const [dx, dy, r] of SPOTS) blob(ctx, x + dx, y + dy, r, 'rgba(196,62,70,0.26)', null);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - 38, y - 22, 17, 8, -0.65, 0, TAU);
  ctx.fill();
  blob(ctx, x - 57, y - 4, 3.2, 'rgba(255,255,255,0.5)', null);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke(head);
  for (const side of [-1, 1]) {
    const cx = x + side * 48;
    const cy = y + 26;
    const blush = ctx.createRadialGradient(cx, cy, 2, cx, cy, 17);
    blush.addColorStop(0, `rgba(255,78,118,${face.blush})`);
    blush.addColorStop(1, 'rgba(255,78,118,0)');
    ctx.fillStyle = blush;
    ctx.fillRect(cx - 17, cy - 17, 34, 34);
    for (const [fx, fy] of [[-6, -2], [0, 3], [6, -1]]) blob(ctx, cx + fx * side, cy + fy, 1.5, 'rgba(176,58,70,0.6)', null);
  }
  const dx = Math.max(-1, Math.min(1, (look.x - x) / 300));
  const dy = Math.max(-1, Math.min(1, (look.y - y) / 300));
  const shut = (t + 0.7) % 3.9 < 0.13;
  for (const side of [-1, 1]) {
    const ex = x + side * 27;
    const ey = y + 2;
    drawEye(ctx, ex, ey, side, dx, dy, face, shut, skin);
    const by = ey - 28 + face.lift;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex + side * 12, by - face.angle * 7);
    ctx.quadraticCurveTo(ex, by - 5, ex - side * 11, by + face.angle * 7);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  drawMouth(ctx, x, y, face.mouth, t);
  drawToque(ctx, x, y);
}

/** The violet glow behind Octavia while an Ink Burst flows. */
function drawInkAura(ctx, x, y, t) {
  const pulse = 0.8 + 0.2 * Math.sin(t * 7);
  const g = ctx.createRadialGradient(x, y + 30, 20, x, y + 30, 210);
  g.addColorStop(0, `rgba(178,132,255,${0.55 * pulse})`);
  g.addColorStop(1, 'rgba(178,132,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 210, y - 180, 420, 420);
}

/** Mood touches over the figure: joy sparkles, a sweat drop, orbiting ink glints. */
function drawFlourish(ctx, state, x, y, t, mood) {
  if (mood === 'joy') {
    const age = Math.min(state.time - (state.moments?.cookPerfect ?? -99), state.time - (state.moments?.serve ?? -99));
    const s = Math.sin(Math.min(1, age / 1.5) * Math.PI);
    for (const [dx, dy, r] of [[-92, -58, 11], [88, -74, 9], [104, -18, 7]]) sparkle(ctx, x + dx, y + dy, r * s, '#ffe08a');
  } else if (mood === 'worried') {
    const sx = x + 64;
    const sy = y - 18 + ((t * 16) % 18);
    ctx.beginPath();
    ctx.moveTo(sx, sy - 10);
    ctx.quadraticCurveTo(sx + 8, sy + 2, sx, sy + 7);
    ctx.quadraticCurveTo(sx - 8, sy + 2, sx, sy - 10);
    ctx.fillStyle = '#a8e6ff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    blob(ctx, sx - 2, sy + 1, 1.8, '#ffffff', null);
  } else if (mood === 'dazzled') {
    for (let i = 0; i < 6; i++) {
      const a = t * 1.8 + (i * TAU) / 6;
      sparkle(ctx, x + Math.cos(a) * 120, y + 14 + Math.sin(a) * 72, 6 + 2 * Math.sin(t * 8 + i), '#efe2ff');
    }
  }
}

/**
 * Octavia for the menus, centred on (x, y): 'hero' waves a ladle and a finished pudding, 'bow'
 * tips her head with her eyes shut, 'wave' just waves all eight arms.
 */
export function drawOctaviaPortrait(ctx, x, y, scale, t, pose = 'wave') {
  const o = LAYOUT.octavia;
  const hy = o.y - 26;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-o.x, -o.y);
  const tips = ARM_ROOTS.map((root, i) => {
    const side = i < 4 ? -1 : 1;
    const k = i < 4 ? 3 - i : i - 4;
    const wave = Math.sin(t * 1.6 + i * 0.9);
    if (pose === 'bow') return { x: root.x + side * (56 + k * 46), y: root.y + 66 + k * 8 + wave * 5 };
    return { x: root.x + side * (70 + k * 44), y: root.y + 40 + k * 26 - (k === 3 ? 120 + wave * 30 : wave * 18) };
  });
  ctx.save();
  if (pose === 'bow') {
    ctx.translate(o.x, hy + 60);
    ctx.rotate(-0.14 + Math.sin(t * 2) * 0.03);
    ctx.translate(-o.x, -(hy + 60));
  }
  drawBody(ctx, { x: o.x, y: o.y + 60 }, t, pose === 'bow' ? 'bow' : 'joy');
  ctx.restore();
  ARM_ROOTS.forEach((root, i) => drawTentacle(ctx, root, tips[i], i, t));
  drawKerchief(ctx, o.x, hy);
  if (pose === 'hero') {
    ctx.save();
    ctx.translate(tips[7].x, tips[7].y - 30);
    ctx.scale(2.2, 2.2);
    ctx.rotate(0.5);
    ladle(ctx, 0, 0);
    ctx.restore();
    drawFinishedDish(ctx, 'pudding', tips[0].x + 10, tips[0].y - 52, 128);
    sparkle(ctx, tips[0].x + 52, tips[0].y - 112, 12, '#ffe08a');
  }
  ctx.restore();
}

/**
 * Draws Octavia with every arm: tentacles behind the counter edge reach to their tips, holding
 * arms show their item, chopping and stirring arms carry a knife or a ladle. Her face follows
 * the service (see moodOf).
 */
export function drawOctavia(ctx, state, view, t) {
  const busy = state.arms.filter((a) => a.state !== 'idle' || a.reach > 0);
  const look = busy.length ? busy.reduce((p, a) => (a.heldAt > p.heldAt ? a : p), busy[0]).target : { x: 640, y: 520 };
  const mood = moodOf(state);
  const { x } = LAYOUT.octavia;
  const y = LAYOUT.octavia.y - 26;
  if (mood === 'dazzled') drawInkAura(ctx, x, y, t);
  drawBody(ctx, look, t, mood);
  const order = state.arms.map((a, i) => i).sort((a, b) => view[a].y - view[b].y);
  for (const i of order) drawTentacle(ctx, ARM_ROOTS[i], view[i], i, t);
  drawKerchief(ctx, x, y);
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
  drawFlourish(ctx, state, x, y, t, mood);
}
