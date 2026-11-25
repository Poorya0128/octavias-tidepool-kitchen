/**
 * The service HUD: the Current Board of shell tickets, the tide-clock timer, coins and Ink
 * Streak, the pause button, the eight arm slots, the plate checklist, the Spring Tide gauge, key
 * hints, toasts, banners and the night-one coach.
 */

import { ARM_COUNT, LAYOUT, PALETTE, TUNING } from '../config.js';
import { CUSTOMERS } from '../data/customers.js';
import { INGREDIENT, PREPS } from '../data/ingredients.js';
import { RECIPE } from '../data/recipes.js';
import { missingParts, patienceShare } from '../orders.js';
import { nextStreakTier, streakMultiplier } from '../scoring.js';
import { blob, check, clock, keycap, label, panel, paragraph, ring, roundRect, sparkle, star, starRow, TAU, text } from './draw.js';
import { drawCustomer } from './customers.js';
import { drawFinishedDish, drawIngredient } from './food.js';
import { drawOctaviaPortrait } from './octopus.js';

const INK = PALETTE.ink;

/** Colour of a patience share: green, gold, then red. */
export function patienceColor(share) {
  return share > 0.55 ? PALETTE.green : share > 0.28 ? PALETTE.gold : PALETTE.red;
}

/** The rail of shell-shaped tickets across the top. */
export function drawOrderBoard(ctx, state, t) {
  const b = LAYOUT.board;
  const wood = ctx.createLinearGradient(12, b.y, 132, b.y + b.h);
  wood.addColorStop(0, '#8a5a34');
  wood.addColorStop(1, '#4a2f1c');
  panel(ctx, 12, b.y, 120, b.h, { fill: wood, stroke: INK, r: 14, line: 3 });
  ctx.strokeStyle = 'rgba(40,22,10,0.35)';
  ctx.lineWidth = 2;
  for (const gy of [44, 70, 96]) {
    ctx.beginPath();
    ctx.moveTo(20, b.y + gy);
    ctx.quadraticCurveTo(72, b.y + gy + 4, 124, b.y + gy - 1);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,209,102,0.55)';
  roundRect(ctx, 17, b.y + 5, 110, b.h - 10, 10);
  ctx.stroke();
  text(ctx, 'CURRENT', 72, b.y + 36, { size: 18, color: PALETTE.gold, align: 'center', line: 4 });
  text(ctx, 'BOARD', 72, b.y + 58, { size: 18, color: PALETTE.gold, align: 'center', line: 4 });
  label(ctx, `${state.tickets.length} waiting`, 72, b.y + 84, 14, PALETTE.pearl, 'center', 800);
  keycap(ctx, 'Tab', 50, b.y + 110, { size: 12 });
  label(ctx, 'next', 86, b.y + 115, 13, PALETTE.pearl, 'center', 800);
  ctx.strokeStyle = '#c8a26b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + 16);
  for (let x = b.x; x <= b.x + b.w; x += 20) ctx.lineTo(x, b.y + 16 + Math.sin(x * 0.05) * 2);
  ctx.stroke();
  const tk = LAYOUT.ticket;
  state.tickets.slice(0, tk.max).forEach((ticket, i) => {
    drawTicket(ctx, state, ticket, tk.x + i * (tk.w + tk.gap), tk.y, t);
  });
  if (state.tickets.length > tk.max) {
    text(ctx, `+${state.tickets.length - tk.max}`, b.x + b.w - 6, b.y + 80, { size: 20, color: PALETTE.gold, align: 'right' });
  }
  for (let i = 0; i < state.tickets.length - 1 && i < tk.max - 1; i++) {
    const a = state.tickets[i];
    const c = state.tickets[i + 1];
    if (a.pairId !== null && a.pairId === c.pairId) {
      const x = tk.x + (i + 1) * (tk.w + tk.gap) - tk.gap / 2;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 4;
      for (const dy of [-8, 8]) {
        ctx.beginPath();
        ctx.ellipse(x, tk.y + 60 + dy, 6, 9, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }
}

/** A faint speckle-and-fibre pattern that makes tickets read as paper (built once, lazily). */
let paperGrain = null;
function paperPattern(ctx) {
  if (!paperGrain && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const g = c.getContext('2d');
    for (let i = 0; i < 140; i++) {
      g.fillStyle = `rgba(120,86,50,${0.04 + Math.random() * 0.08})`;
      g.fillRect(Math.random() * 96, Math.random() * 96, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
    g.strokeStyle = 'rgba(120,86,50,0.07)';
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 96;
      const y = Math.random() * 96;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 6 + Math.random() * 10, y + Math.random() * 3 - 1.5);
      g.stroke();
    }
    paperGrain = ctx.createPattern(c, 'repeat');
  }
  return paperGrain;
}

/** The outline of a ticket: a scalloped shell top over a rounded paper slip. */
function ticketPath(x, y, w, h) {
  const p = new Path2D();
  p.moveTo(x, y + 14);
  for (let k = 0; k <= 6; k++) {
    const sx = x + (k * w) / 6;
    p.quadraticCurveTo(sx - w / 12, y - 2, sx, y + 14);
  }
  p.lineTo(x + w, y + h - 12);
  p.quadraticCurveTo(x + w, y + h, x + w - 12, y + h);
  p.lineTo(x + 12, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - 12);
  p.closePath();
  return p;
}

/**
 * One shell ticket: grained paper (lilac and gold-framed for the critic), a peg, the portrait
 * in its patience ring, the dish, its steps and the ticket number; the selected one lifts and glows.
 */
function drawTicket(ctx, state, ticket, x, y, t) {
  const tk = LAYOUT.ticket;
  const selected = ticket.id === state.selectedTicket;
  const share = patienceShare(ticket);
  const recipe = RECIPE[ticket.recipeId];
  const shake = share < 0.2 ? Math.sin(t * 30) * 1.5 : 0;
  const tx = x + shake;
  const ty = y + (selected ? -4 : 0);
  const shape = ticketPath(tx, ty, tk.w, tk.h);
  ctx.save();
  ctx.translate(3, 5);
  ctx.fillStyle = 'rgba(3,18,22,0.4)';
  ctx.fill(shape);
  ctx.restore();
  ctx.lineJoin = 'round';
  if (selected) {
    ctx.strokeStyle = `rgba(255,209,102,${0.3 + 0.15 * Math.sin(t * 5)})`;
    ctx.lineWidth = 16;
    ctx.stroke(shape);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 9;
    ctx.stroke(shape);
  }
  const paper = ctx.createLinearGradient(0, ty, 0, ty + tk.h);
  paper.addColorStop(0, ticket.critic ? '#f8f1ff' : '#fffaf0');
  paper.addColorStop(1, ticket.critic ? '#e2d3fa' : '#f3e2c4');
  ctx.fillStyle = paper;
  ctx.fill(shape);
  const grain = paperPattern(ctx);
  if (grain) {
    ctx.fillStyle = grain;
    ctx.fill(shape);
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke(shape);
  if (ticket.critic) {
    ctx.save();
    ctx.translate(tx + tk.w / 2, ty + tk.h / 2 + 4);
    ctx.scale((tk.w - 10) / tk.w, (tk.h - 12) / tk.h);
    ctx.translate(-(tx + tk.w / 2), -(ty + tk.h / 2));
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke(shape);
    ctx.restore();
  }
  const peg = ctx.createLinearGradient(0, ty - 7, 0, ty + 8);
  peg.addColorStop(0, selected ? '#fff0b8' : ticket.critic ? '#9a78c4' : '#ffb08f');
  peg.addColorStop(1, selected ? '#e0a92e' : ticket.critic ? '#4a3463' : PALETTE.coralDark);
  ctx.fillStyle = peg;
  roundRect(ctx, tx + tk.w / 2 - 14, ty - 7, 28, 15, 5);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const pr = 22;
  const px = tx + 28;
  const py = ty + 40;
  if (share < 0.2) ring(ctx, px, py, pr + 6, 1, `rgba(239,91,76,${0.25 + 0.25 * Math.sin(t * 10)})`, 11, 'rgba(0,0,0,0)');
  drawCustomer(ctx, ticket.customerId, px, py, pr, share, ticket.changed);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, TAU);
  ctx.stroke();
  ring(ctx, px, py, pr + 5, share, patienceColor(share), 6, 'rgba(59,42,77,0.3)');
  label(ctx, `#${ticket.id}`, tx + tk.w - 8, ty + 26, 14, INK, 'right', 900);
  drawFinishedDish(ctx, ticket.recipeId, tx + tk.w - 42, ty + 54, 66);
  label(ctx, CUSTOMERS[ticket.customerId].name, tx + 8, ty + 78, 12, ticket.critic ? '#7a3fbf' : '#5a4470', 'left', 800);
  text(ctx, recipe.name, tx + 8, ty + 92, { size: 13, color: INK, outline: null, weight: 900, maxWidth: tk.w - 22 });
  const onPlate = state.plate.recipeId === ticket.recipeId ? state.plate.parts : [];
  const missing = missingParts(ticket.recipeId, onPlate);
  const steps = recipe.parts.length + 1;
  const sw = Math.min(22, (tk.w - 12) / steps);
  recipe.parts.forEach(([ing, prep], k) => {
    const sx = tx + 8 + k * sw + sw / 2;
    const sy = ty + tk.h - 10;
    const done = !missing.some(([i2, p2]) => i2 === ing && p2 === prep) && onPlate.length > 0;
    drawIngredient(ctx, ing, sx, sy, 17, prep, t);
    if (done) check(ctx, sx + 6, sy - 6, 5);
  });
  const fx = tx + 8 + recipe.parts.length * sw + sw / 2;
  star(ctx, fx, ty + tk.h - 10, 7, PALETTE.gold, INK, 1.5);
  if (ticket.critic) {
    starRow(ctx, tx + tk.w / 2, ty + 9, 6, state.critic.live ?? 0);
  }
  if (ticket.changed && state.time - ticket.born < 999) {
    label(ctx, 'NEW ORDER', tx + tk.w - 8, ty + 40, 10, PALETTE.coralDark, 'right', 900);
  }
}

/** The tide-clock sand dial, night number, coins and Ink Streak. */
export function drawHud(ctx, state, t) {
  const h = LAYOUT.hud;
  panel(ctx, h.x, h.y, h.w, h.h, { fill: PALETTE.deep, stroke: '#c99a4b', r: 16, line: 4 });
  drawTideClock(ctx, state, h.x + 62, h.y + h.h / 2, 50, t);
  const rx = h.x + 124;
  text(ctx, `NIGHT ${state.nightIndex + 1}/5`, rx, h.y + 26, { size: 15, color: PALETTE.gold, line: 3 });
  text(ctx, state.cfg.name, rx, h.y + 44, { size: 13, color: PALETTE.foam, line: 3, maxWidth: 108 });
  const coinX = rx + 12;
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(coinX, h.y + 70, 11, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  label(ctx, 'c', coinX, h.y + 75, 13, INK, 'center', 900);
  text(ctx, String(state.coins), rx + 30, h.y + 79, { size: 24, color: PALETTE.pearl, line: 4 });
  const mult = streakMultiplier(state.streak);
  const next = nextStreakTier(state.streak);
  const sx = rx;
  const sy = h.y + 104;
  const splat = mult > 1;
  ctx.fillStyle = splat ? '#5a4470' : 'rgba(90,68,112,0.5)';
  roundRect(ctx, sx - 2, sy - 12, 112, 30, 10);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = splat ? PALETTE.gold : INK;
  ctx.stroke();
  text(ctx, `INK x${mult}`, sx + 6, sy + 9, { size: 17, color: splat ? PALETTE.gold : PALETTE.pearl, line: 3, maxWidth: 64 });
  label(ctx, next ? `${state.streak}/${next}` : 'MAX', sx + 104, sy + 8, 11, PALETTE.pearl, 'right', 800);
  drawStatusStrip(ctx, state);
  drawPauseButton(ctx);
}

/** The pause button beside the status strip: two pearl bars on a teal pebble (click it or press P). */
function drawPauseButton(ctx) {
  const b = LAYOUT.pauseBtn;
  panel(ctx, b.x, b.y, b.w, b.h, { fill: '#1d6f7a', stroke: INK, r: 10, line: 2.5, shadow: false });
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, b.x + 4, b.y + 3, b.w - 8, b.h * 0.36, 6);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  for (const dx of [-8, 2]) {
    roundRect(ctx, b.x + b.w / 2 + dx, b.y + 9, 6, b.h - 18, 2);
    ctx.fillStyle = PALETTE.pearl;
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * The night timer as a brass tide clock: the water inside ebbs with the time left, a hand sweeps
 * the dial and big digits count down, glowing and pulsing red in the last 30 seconds.
 */
function drawTideClock(ctx, state, cx, cy, r, t) {
  const left = Math.max(0, state.cfg.duration - state.time);
  const frac = left / state.cfg.duration;
  const urgent = left <= 30 && left > 0;
  const pulse = 0.5 + 0.5 * Math.sin(t * 8);
  if (urgent) {
    const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + 26);
    glow.addColorStop(0, `rgba(255,90,60,${0.35 + 0.35 * pulse})`);
    glow.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r - 26, cy - r - 26, (r + 26) * 2, (r + 26) * 2);
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = '#082a30';
  ctx.fill();
  ctx.clip();
  const level = cy + r - frac * r * 2;
  const sea = ctx.createLinearGradient(0, level - 4, 0, cy + r);
  sea.addColorStop(0, urgent ? '#ff8a6a' : '#5fd0dc');
  sea.addColorStop(1, urgent ? '#b8322a' : '#1b6f86');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r);
  for (let x = -r; x <= r; x += 5) ctx.lineTo(cx + x, level + Math.sin(x * 0.12 + t * 3) * 3);
  ctx.lineTo(cx + r, cy + r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.3, cy - r * 0.45, r * 0.55, r * 0.3, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  const brass = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  brass.addColorStop(0, '#fff0b8');
  brass.addColorStop(0.5, '#d9a84e');
  brass.addColorStop(1, '#8a6424');
  ctx.lineWidth = 9;
  ctx.strokeStyle = brass;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  for (const rr of [r - 2.5, r + 6.5]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,246,230,0.85)';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const inner = i % 3 ? r - 9 : r - 14;
    ctx.lineWidth = i % 3 ? 2 : 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.stroke();
  }
  const hand = -Math.PI / 2 + (1 - frac) * TAU;
  ctx.lineCap = 'round';
  for (const [w, col] of [[7, INK], [3.5, PALETTE.coral]]) {
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(hand) * 10, cy - Math.sin(hand) * 10);
    ctx.lineTo(cx + Math.cos(hand) * (r - 10), cy + Math.sin(hand) * (r - 10));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  blob(ctx, cx, cy, 5, PALETTE.gold, INK, 2);
  const size = urgent ? 31 + pulse * 3 : 31;
  text(ctx, clock(left), cx, cy + 11, { size, color: urgent ? '#ffe3a3' : PALETTE.pearl, align: 'center', line: 7 });
  text(ctx, 'TIDE', cx, cy + 30, { size: 10, color: urgent ? '#ffd0c4' : PALETTE.foam, align: 'center', line: 3 });
}

/** Under the timer: Madame Mantis's live rating on critic nights, else the coins to the next star. */
function drawStatusStrip(ctx, state) {
  const s = { ...LAYOUT.status, w: LAYOUT.pauseBtn.x - LAYOUT.status.x - 6 };
  const critic = state.cfg.critic.length > 0;
  panel(ctx, s.x, s.y, s.w, s.h, { fill: critic ? '#3b2a4d' : '#12474f', stroke: critic ? PALETTE.gold : INK, r: 10, line: 2.5, shadow: false });
  if (critic) {
    const reviews = state.critic.reviews;
    const shown = state.critic.live ?? (reviews.length ? reviews[reviews.length - 1] : 0);
    label(ctx, state.critic.live !== null ? 'CRITIC LIVE' : 'CRITIC', s.x + 10, s.y + 23, 13, PALETTE.gold, 'left', 900);
    starRow(ctx, s.x + s.w - 48, s.y + 17, 8, shown);
    return;
  }
  const next = state.cfg.stars.find((target) => state.coins < target);
  const earned = state.cfg.stars.filter((target) => state.coins >= target).length;
  for (let i = 0; i < 3; i++) star(ctx, s.x + 16 + i * 20, s.y + 17, 8.5, i < earned ? PALETTE.gold : 'rgba(20,30,40,0.5)', INK, 1.5);
  text(ctx, next ? `next star at ${next} c` : 'three stars!', s.x + 78, s.y + 22, { size: 13, outline: null, maxWidth: s.w - 86 });
}

/** Short tags for what a held item is: still raw, cut on the board, or cooked. */
const HELD_TAGS = { none: 'raw', raw: 'raw', chop: 'cut', simmer: 'ok', sear: 'ok', steam: 'ok' };

/**
 * The Ink Burst vial in the counter corner under the arms panel: violet ink rises with perfect
 * cooks, the vial pulses when full (press I), and a ring counts down while the burst flows.
 */
function drawInkMeter(ctx, state, t) {
  const b = LAYOUT.ink;
  const ink = state.ink ?? { meter: 0, active: false, endsAt: 0 };
  const full = ink.meter >= 1;
  const live = full || ink.active;
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  panel(ctx, b.x, b.y, b.w, b.h, { fill: 'rgba(38,22,62,0.92)', stroke: INK, r: 14, line: 3 });
  if (live) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(201,166,255,${0.55 + 0.45 * pulse})`;
    roundRect(ctx, b.x + 4, b.y + 4, b.w - 8, b.h - 8, 11);
    ctx.stroke();
  }
  text(ctx, 'INK BURST', b.x + b.w / 2, b.y + 19, { size: 13, color: '#e2ccff', align: 'center', line: 3 });
  const cx = b.x + 40;
  const cy = b.y + 64;
  const r = 20;
  if (live) {
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 40);
    glow.addColorStop(0, `rgba(190,140,255,${0.4 + 0.3 * pulse})`);
    glow.addColorStop(1, 'rgba(190,140,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 40, cy - 40, 80, 80);
  }
  const vial = new Path2D();
  vial.moveTo(cx - 7, cy - 30);
  vial.lineTo(cx - 7, cy - r + 2);
  vial.arc(cx, cy, r, -Math.PI / 2 - 0.36, Math.PI * 1.5 + 0.36, true);
  vial.lineTo(cx + 7, cy - 30);
  vial.closePath();
  ctx.fillStyle = 'rgba(214,240,245,0.18)';
  ctx.fill(vial);
  const share = ink.active ? 1 : Math.min(1, ink.meter);
  if (share > 0) {
    ctx.save();
    ctx.clip(vial);
    const top = cy + r - share * (r * 2 + 10);
    const liquid = ctx.createLinearGradient(0, top, 0, cy + r);
    liquid.addColorStop(0, '#d7b8ff');
    liquid.addColorStop(1, '#5b2ca0');
    ctx.fillStyle = liquid;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r);
    for (let x = -r; x <= r; x += 4) ctx.lineTo(cx + x, top + Math.sin(x * 0.3 + t * 4) * 1.6);
    ctx.lineTo(cx + r, cy + r);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const by = cy + r - ((t * 14 + i * 13) % Math.max(4, cy + r - top));
      blob(ctx, cx - 8 + i * 8, by, 1.8 + (i % 2), 'rgba(255,255,255,0.55)', null);
    }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - 9, cy - 6, 4, 8, 0.4, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke(vial);
  ctx.fillStyle = '#b07a48';
  roundRect(ctx, cx - 9, cy - 37, 18, 9, 3);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  if (ink.active) {
    const left = Math.max(0, ink.endsAt - state.time);
    ring(ctx, cx, cy, r + 7, left / TUNING.inkDuration, '#e2ccff', 4, 'rgba(0,0,0,0.35)');
    for (let i = 0; i < 3; i++) sparkle(ctx, cx + Math.cos(t * 3 + i * 2.1) * 30, cy + Math.sin(t * 3 + i * 2.1) * 30, 4, '#f3e8ff');
  }
  keycap(ctx, 'I', b.x + 82, b.y + 50, { size: 15, fill: full ? PALETTE.gold : PALETTE.pearl });
  const status = ink.active ? `${Math.ceil(Math.max(0, ink.endsAt - state.time))}s` : full ? 'GO!' : `${Math.floor(share * 100)}%`;
  text(ctx, status, b.x + 82, b.y + 80, { size: full && !ink.active ? 14 + pulse * 2 : 14, color: live ? PALETTE.gold : PALETTE.pearl, align: 'center', line: 3 });
  label(ctx, ink.active ? 'patience held' : full ? 'press I!' : 'perfect cooks', b.x + b.w / 2, b.y + 102, 11, live ? '#f3e8ff' : 'rgba(226,204,255,0.75)', 'center', 800);
}

/** The eight arm slots (free, holding an item, chopping or stirring), with the Ink Burst vial below. */
export function drawArmSlots(ctx, state, t) {
  drawInkMeter(ctx, state, t);
  const a = LAYOUT.arms;
  panel(ctx, a.x, a.y, a.w, a.h, { fill: 'rgba(8,42,48,0.88)', stroke: INK, r: 14, line: 3 });
  const free = state.arms.filter((arm) => arm.state === 'idle').length;
  text(ctx, 'ARMS', a.x + a.w / 2, a.y + 22, { size: 16, color: PALETTE.gold, align: 'center', line: 3 });
  label(ctx, `${free}/${ARM_COUNT} free`, a.x + a.w / 2, a.y + 40, 13, free ? PALETTE.foam : PALETTE.red, 'center', 800);
  state.arms.forEach((arm, i) => {
    const y = a.y + 52 + i * 39;
    const busy = arm.state !== 'idle';
    if (busy) {
      const skin = ctx.createLinearGradient(0, y, 0, y + 34);
      skin.addColorStop(0, '#ffd0c4');
      skin.addColorStop(1, '#ff9a88');
      ctx.fillStyle = skin;
    } else ctx.fillStyle = 'rgba(255,246,230,0.1)';
    roundRect(ctx, a.x + 8, y, a.w - 16, 34, 10);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = busy ? INK : 'rgba(255,246,230,0.25)';
    ctx.stroke();
    label(ctx, String(i + 1), a.x + 18, y + 22, 12, busy ? INK : 'rgba(255,246,230,0.5)', 'center', 900);
    if (arm.state === 'hold' && arm.item) {
      drawIngredient(ctx, arm.item.ing, a.x + 46, y + 18, 26, arm.item.prep, t);
      if (arm.item.quality === 'perfect') star(ctx, a.x + 78, y + 17, 8, PALETTE.gold, INK, 1.5);
      else label(ctx, HELD_TAGS[arm.item.prep ?? 'none'], a.x + 78, y + 22, 11, INK, 'center', 900);
    } else if (arm.state === 'chop') {
      label(ctx, 'chopping', a.x + 58, y + 22, 12, INK, 'center', 900);
    } else if (arm.state === 'stir') {
      label(ctx, 'stirring', a.x + 58, y + 22, 12, INK, 'center', 900);
    } else {
      label(ctx, 'free', a.x + 58, y + 22, 12, 'rgba(255,246,230,0.55)', 'center', 800);
    }
  });
}

/** The plate checklist: which parts are on the Clam Plate and what is left. */
export function drawChecklist(ctx, state) {
  const c = LAYOUT.checklist;
  const paper = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  paper.addColorStop(0, '#fffaf0');
  paper.addColorStop(1, '#f1e2c6');
  panel(ctx, c.x, c.y, c.w, c.h, { fill: paper, stroke: INK, r: 14, line: 3 });
  const grain = paperPattern(ctx);
  if (grain) {
    ctx.fillStyle = grain;
    roundRect(ctx, c.x, c.y, c.w, c.h, 14);
    ctx.fill();
  }
  const plate = state.plate;
  if (!plate.recipeId) {
    text(ctx, 'CLAM PLATE IS EMPTY', c.x + 14, c.y + 28, { size: 15, color: PALETTE.ink, outline: null });
    label(ctx, 'Grab with 1-0, cook with Q W E R, plate with Space', c.x + 14, c.y + 52, 13, '#5a4470', 'left', 700);
    label(ctx, 'S serves the glowing plate at the Current Window', c.x + 14, c.y + 70, 13, '#5a4470', 'left', 700);
    return;
  }
  const recipe = RECIPE[plate.recipeId];
  const steps = recipe.parts.length + 1;
  const done = plate.parts.length;
  text(ctx, `${recipe.name.toUpperCase()}  ${done}/${steps}`, c.x + 14, c.y + 25, { size: 16, color: PALETTE.coralDark, outline: null });
  const left = [...plate.parts];
  const chips = recipe.parts.map(([ing, prep]) => {
    const i = left.findIndex((p) => p.ing === ing && p.prep === prep);
    const has = i >= 0;
    if (has) left.splice(i, 1);
    const word = prep === 'raw' ? INGREDIENT[ing].name : `${INGREDIENT[ing].name.split(' ').pop()} ${PREPS[prep].label}`;
    return { word, has };
  });
  chips.push({ word: recipe.finish, has: false, finish: true });
  let x = c.x + 14;
  let y = c.y + 36;
  ctx.font = `800 12px "Trebuchet MS", "Noto Sans", sans-serif`;
  for (const chip of chips) {
    const w = ctx.measureText(chip.word).width + 30;
    if (x + w > c.x + c.w - 8) {
      x = c.x + 14;
      y += 20;
    }
    ctx.fillStyle = chip.has ? '#d4f5df' : chip.finish ? '#ffe3a3' : '#f0e6d6';
    roundRect(ctx, x, y, w, 18, 9);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    if (chip.has) check(ctx, x + 10, y + 9, 6);
    else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 10, y + 9, 5, 0, TAU);
      ctx.stroke();
    }
    label(ctx, chip.word, x + 19, y + 13, 12, INK, 'left', 800);
    x += w + 6;
  }
}

/** The Spring Tide gauge: time to the next rush, or the rush running now. */
export function drawTideGauge(ctx, state, t) {
  const g = LAYOUT.tide;
  const r = state.rush;
  const next = state.cfg.rushes[r.index];
  const active = r.active;
  panel(ctx, g.x, g.y, g.w, g.h, { fill: active ? '#1d6f8a' : PALETTE.deep, stroke: active ? PALETTE.gold : INK, r: 14, line: 3 });
  ctx.save();
  roundRect(ctx, g.x + 4, g.y + 4, g.w - 8, g.h - 8, 11);
  ctx.clip();
  ctx.fillStyle = active ? 'rgba(127,240,255,0.25)' : 'rgba(127,209,185,0.12)';
  ctx.beginPath();
  ctx.moveTo(g.x, g.y + g.h);
  for (let x = 0; x <= g.w; x += 8) ctx.lineTo(g.x + x, g.y + g.h - 24 + Math.sin(x * 0.08 + t * 4) * 6);
  ctx.lineTo(g.x + g.w, g.y + g.h);
  ctx.fill();
  ctx.restore();
  if (active) {
    text(ctx, 'SPRING TIDE!', g.x + g.w / 2, g.y + 30, { size: 19, color: PALETTE.gold, align: 'center', line: 4 });
    label(ctx, `rush ends in ${clock(r.endsAt - state.time)}`, g.x + g.w / 2, g.y + 54, 13, PALETTE.pearl, 'center', 800);
  } else if (next !== undefined) {
    text(ctx, 'NEXT SPRING TIDE', g.x + g.w / 2, g.y + 28, { size: 14, color: PALETTE.foam, align: 'center', line: 3 });
    text(ctx, clock(next - state.time), g.x + g.w / 2, g.y + 56, { size: 22, color: PALETTE.pearl, align: 'center', line: 4 });
  } else {
    text(ctx, 'CALM WATERS', g.x + g.w / 2, g.y + 34, { size: 15, color: PALETTE.foam, align: 'center', line: 3 });
    label(ctx, 'no rush left tonight', g.x + g.w / 2, g.y + 56, 12, PALETTE.pearl, 'center', 700);
  }
}

/** The key hint card in the corner. */
export function drawKeyHints(ctx) {
  const k = LAYOUT.keys;
  panel(ctx, k.x, k.y, k.w, k.h, { fill: '#1f3a3f', stroke: INK, r: 12, line: 3 });
  const rows = [['1-0', 'grab'], ['QWER', 'stations'], ['Space', 'plate'], ['S', 'serve'], ['I', 'ink burst'], ['Bksp', 'bin'], ['P H M', 'pause help mute']];
  rows.forEach(([key, what], i) => {
    const y = k.y + 15 + i * 17.5;
    keycap(ctx, key, k.x + 10, y, { size: 11, align: 'left' });
    label(ctx, what, k.x + 66, y + 4, 12, PALETTE.pearl, 'left', 700);
  });
}

/** Short-lived messages above the plate. */
export function drawToasts(ctx, state) {
  state.toasts.forEach((toast, i) => {
    const age = state.time - toast.at;
    const alpha = Math.max(0, Math.min(1, 2.6 - age));
    ctx.globalAlpha = alpha;
    text(ctx, toast.text, 640, 530 - i * 22 - age * 8, { size: 17, color: toast.color, align: 'center', line: 5 });
    ctx.globalAlpha = 1;
  });
}

/** Big banners: the Spring Tide warning and start, the night's opening card, then the coach. */
export function drawBanners(ctx, state, t) {
  const r = state.rush;
  let shown = false;
  if (r.warnAt !== null && !r.active) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    banner(ctx, 'SPRING TIDE INCOMING', `tickets will rush in ${clock(state.cfg.rushes[r.index] - state.time)}`, 0.85 + pulse * 0.15);
    shown = true;
  } else if (r.active && state.time - (r.endsAt - 24) < 2.2) {
    banner(ctx, 'SPRING TIDE!', 'orders flood in: keep every arm busy', 1);
    shown = true;
  }
  if (state.time < 3.2) {
    const alpha = Math.min(1, (3.2 - state.time) * 1.5);
    ctx.globalAlpha = alpha;
    banner(ctx, `NIGHT ${state.nightIndex + 1}: ${state.cfg.name.toUpperCase()}`, state.cfg.tip, 1);
    ctx.globalAlpha = 1;
    shown = true;
  }
  if (state.coach?.text) drawCoach(ctx, state.coach, t, shown);
}

/** Where the coach's bubble may sit on the wall, in order of preference: clear of the tickets and the clock. */
const COACH_SPOTS = [{ x: 124, y: 160 }, { x: 716, y: 196 }, { x: 124, y: 284 }, { x: 716, y: 284 }];

/**
 * The night-one coach: a speech bubble from a tiny Octavia with the step's text, the key to
 * press and step dots. It takes the first wall spot away from its target (below any banner),
 * and a bouncing arrow points at the target.
 */
function drawCoach(ctx, coach, t, low) {
  const w = 360;
  const h = 108;
  const target = coach.target ?? null;
  const near = (s) => target && Math.abs(target.x - (s.x + w / 2)) < w / 2 + 60 && Math.abs(target.y - (s.y + h / 2)) < h / 2 + 60;
  const { x, y } = COACH_SPOTS.find((s) => !near(s) && !(low && s.y < 276)) ?? COACH_SPOTS[2];
  const right = x > 640;
  if (target) drawCoachArrow(ctx, target, { x: x + w / 2, y: y + h / 2 }, t);
  const paper = ctx.createLinearGradient(0, y, 0, y + h);
  paper.addColorStop(0, '#fffaf0');
  paper.addColorStop(1, '#f3e2c4');
  const tail = new Path2D();
  const edge = right ? x : x + w;
  const dir = right ? -1 : 1;
  tail.moveTo(edge - dir * 4, y + 34);
  tail.quadraticCurveTo(edge + dir * 22, y + 40, edge + dir * 34, y + 30);
  tail.quadraticCurveTo(edge + dir * 20, y + 58, edge - dir * 4, y + 62);
  tail.closePath();
  ctx.fillStyle = 'rgba(3,18,22,0.35)';
  roundRect(ctx, x + 4, y + 6, w, h, 18);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = paper;
  ctx.fill(tail);
  ctx.stroke(tail);
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fill(tail);
  ctx.strokeStyle = 'rgba(255,209,102,0.9)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 14);
  ctx.stroke();
  const mx = x + 48;
  const my = y + h / 2;
  const sea = ctx.createRadialGradient(mx, my - 10, 4, mx, my, 38);
  sea.addColorStop(0, '#5fd0dc');
  sea.addColorStop(1, '#1b6f86');
  blob(ctx, mx, my, 36, sea, null);
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, 36, 0, TAU);
  ctx.clip();
  drawOctaviaPortrait(ctx, mx, my + 13, 0.3, t, 'wave');
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(mx, my, 36, 0, TAU);
  ctx.stroke();
  const tx = x + 96;
  let kx = tx;
  if (coach.key) {
    label(ctx, 'PRESS', tx, y + 30, 12, PALETTE.coralDark, 'left', 900);
    const kw = keycap(ctx, coach.key, tx + 48, y + 25, { size: 14, fill: PALETTE.gold, align: 'left' });
    kx = tx + 56 + kw;
  } else label(ctx, "OCTAVIA'S TIP", tx, y + 30, 12, PALETTE.coralDark, 'left', 900);
  const total = coach.total ?? 0;
  const step = Math.min(total, Math.max(1, coach.step ?? 1));
  if (total > 0) label(ctx, `${step}/${total}`, x + w - 16, y + 30, 12, '#5a4470', 'right', 900);
  for (let k = 0; k < total; k++) {
    const dx = x + w - 46 - (total - 1 - k) * 12;
    if (dx < kx + 6) continue;
    blob(ctx, dx, y + 26, k === step - 1 ? 5 : 3.6, k < step ? PALETTE.gold : 'rgba(59,42,77,0.18)', INK, 1.5);
  }
  paragraph(ctx, coach.text, tx, y + 54, w - 112, 18, 15, INK, 800);
}

/** A dashed ring round the coach's target and a gold arrow bouncing toward it from the bubble side. */
function drawCoachArrow(ctx, target, from, t) {
  const dx = from.x - target.x;
  const dy = from.y - target.y;
  const len = Math.hypot(dx, dy) || 1;
  const bounce = Math.abs(Math.sin(t * 5)) * 12;
  ctx.setLineDash([7, 6]);
  ctx.lineDashOffset = -t * 18;
  for (const [lw, col] of [[6, 'rgba(59,42,77,0.7)'], [3, PALETTE.gold]]) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 32 + Math.sin(t * 5) * 2, 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.save();
  ctx.translate(target.x + (dx / len) * (38 + bounce), target.y + (dy / len) * (38 + bounce));
  ctx.rotate(Math.atan2(-dy, -dx));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-22, -17);
  ctx.lineTo(-22, -7);
  ctx.lineTo(-48, -7);
  ctx.lineTo(-48, 7);
  ctx.lineTo(-22, 7);
  ctx.lineTo(-22, 17);
  ctx.closePath();
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** A wave-shaped banner across the kitchen wall. */
function banner(ctx, title, sub, scale) {
  const w = 620;
  const h = 76;
  const x = 640 - w / 2;
  const y = 196;
  ctx.save();
  ctx.translate(640, y + h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-640, -(y + h / 2));
  const sea = ctx.createLinearGradient(0, y, 0, y + h);
  sea.addColorStop(0, 'rgba(47,159,179,0.97)');
  sea.addColorStop(1, 'rgba(14,59,67,0.97)');
  panel(ctx, x, y, w, h, { fill: sea, stroke: INK, r: 22, line: 4 });
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.gold;
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 17);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, x + 12, y + 9, w - 24, h * 0.32, 12);
  ctx.fill();
  text(ctx, title, 640, y + 36, { size: 28, color: PALETTE.gold, align: 'center', line: 6 });
  text(ctx, sub, 640, y + 62, { size: 15, color: PALETTE.pearl, align: 'center', line: 4, maxWidth: w - 30 });
  ctx.restore();
}
