/**
 * The service HUD: the Current Board of shell tickets, the tide-clock timer, coins and Ink
 * Streak, the eight arm slots, the plate checklist, the Spring Tide gauge, key hints, toasts
 * and banners.
 */

import { ARM_COUNT, LAYOUT, PALETTE } from '../config.js';
import { CUSTOMERS } from '../data/customers.js';
import { INGREDIENT, PREPS } from '../data/ingredients.js';
import { RECIPE } from '../data/recipes.js';
import { missingParts, patienceShare } from '../orders.js';
import { nextStreakTier, streakMultiplier } from '../scoring.js';
import { check, clock, keycap, label, panel, ring, roundRect, star, starRow, TAU, text } from './draw.js';
import { drawCustomer } from './customers.js';
import { drawFinishedDish, drawIngredient } from './food.js';

const INK = PALETTE.ink;

/** Colour of a patience share: green, gold, then red. */
export function patienceColor(share) {
  return share > 0.55 ? PALETTE.green : share > 0.28 ? PALETTE.gold : PALETTE.red;
}

/** The rail of shell-shaped tickets across the top. */
export function drawOrderBoard(ctx, state, t) {
  const b = LAYOUT.board;
  panel(ctx, 12, b.y, 120, b.h, { fill: '#5a3c26', stroke: INK, r: 14, line: 3 });
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

/** One shell ticket: portrait with patience ring, dish, steps and ticket number. */
function drawTicket(ctx, state, ticket, x, y, t) {
  const tk = LAYOUT.ticket;
  const selected = ticket.id === state.selectedTicket;
  const share = patienceShare(ticket);
  const recipe = RECIPE[ticket.recipeId];
  const lift = selected ? -4 : 0;
  const shake = share < 0.2 ? Math.sin(t * 30) * 1.5 : 0;
  const tx = x + shake;
  const ty = y + lift;
  if (selected) {
    ctx.save();
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 16;
    panel(ctx, tx - 3, ty - 3, tk.w + 6, tk.h + 6, { fill: PALETTE.gold, stroke: PALETTE.gold, r: 16, line: 2, shadow: false });
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(tx, ty + 14);
  for (let k = 0; k <= 6; k++) {
    const sx = tx + (k * tk.w) / 6;
    ctx.quadraticCurveTo(sx - tk.w / 12, ty - 2, sx, ty + 14);
  }
  ctx.lineTo(tx + tk.w, ty + tk.h - 12);
  ctx.quadraticCurveTo(tx + tk.w, ty + tk.h, tx + tk.w - 12, ty + tk.h);
  ctx.lineTo(tx + 12, ty + tk.h);
  ctx.quadraticCurveTo(tx, ty + tk.h, tx, ty + tk.h - 12);
  ctx.closePath();
  ctx.fillStyle = ticket.critic ? '#efe4ff' : '#fff6e6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = ticket.critic ? '#5a4470' : PALETTE.coral;
  roundRect(ctx, tx + tk.w / 2 - 14, ty - 6, 28, 14, 5);
  ctx.fill();
  ctx.stroke();
  const pr = 22;
  const px = tx + 28;
  const py = ty + 40;
  drawCustomer(ctx, ticket.customerId, px, py, pr, share, t, ticket.changed);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, TAU);
  ctx.stroke();
  ring(ctx, px, py, pr + 5, share, patienceColor(share), 5, 'rgba(59,42,77,0.25)');
  label(ctx, `#${ticket.id}`, tx + tk.w - 8, ty + 26, 14, INK, 'right', 900);
  drawFinishedDish(ctx, ticket.recipeId, tx + tk.w - 42, ty + 54, 66);
  label(ctx, CUSTOMERS[ticket.customerId].name, tx + 8, ty + 78, 12, '#5a4470', 'left', 800);
  label(ctx, recipe.name, tx + 8, ty + 92, 13, INK, 'left', 900);
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
  const left = Math.max(0, state.cfg.duration - state.time);
  const frac = left / state.cfg.duration;
  const cx = h.x + 62;
  const cy = h.y + h.h / 2;
  const r = 50;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = '#0a2a30';
  ctx.fill();
  ctx.clip();
  const level = cy + r - frac * r * 2;
  ctx.fillStyle = frac < 0.2 ? '#ef5b4c' : '#2f9fb3';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy + r);
  for (let x = -r; x <= r; x += 6) ctx.lineTo(cx + x, level + Math.sin(x * 0.12 + t * 3) * 3);
  ctx.lineTo(cx + r, cy + r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#f4d8a6';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7));
    ctx.lineTo(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1));
    ctx.stroke();
  }
  const hand = -Math.PI / 2 + (1 - frac) * TAU;
  ctx.strokeStyle = PALETTE.coral;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hand) * (r - 12), cy + Math.sin(hand) * (r - 12));
  ctx.stroke();
  ctx.lineCap = 'butt';
  text(ctx, clock(left), cx, cy + 10, { size: 28, color: PALETTE.pearl, align: 'center', line: 5 });
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
  text(ctx, `INK x${mult}`, sx + 6, sy + 9, { size: 17, color: splat ? PALETTE.gold : PALETTE.pearl, line: 3 });
  label(ctx, next ? `${state.streak}/${next}` : 'MAX', sx + 104, sy + 8, 12, PALETTE.pearl, 'right', 800);
  drawStatusStrip(ctx, state);
}

/** Under the timer: Madame Mantis's live rating on critic nights, else the coins to the next star. */
function drawStatusStrip(ctx, state) {
  const s = LAYOUT.status;
  const critic = state.cfg.critic.length > 0;
  panel(ctx, s.x, s.y, s.w, s.h, { fill: critic ? '#3b2a4d' : '#12474f', stroke: critic ? PALETTE.gold : INK, r: 10, line: 2.5, shadow: false });
  if (critic) {
    const reviews = state.critic.reviews;
    const shown = state.critic.live ?? (reviews.length ? reviews[reviews.length - 1] : 0);
    label(ctx, state.critic.live !== null ? 'CRITIC LIVE' : 'CRITIC', s.x + 10, s.y + 23, 13, PALETTE.gold, 'left', 900);
    starRow(ctx, s.x + 168, s.y + 17, 9, shown);
    return;
  }
  const next = state.cfg.stars.find((target) => state.coins < target);
  const earned = state.cfg.stars.filter((target) => state.coins >= target).length;
  for (let i = 0; i < 3; i++) star(ctx, s.x + 18 + i * 22, s.y + 17, 9, i < earned ? PALETTE.gold : 'rgba(20,30,40,0.5)', INK, 1.5);
  label(ctx, next ? `next star at ${next} c` : 'three stars!', s.x + 86, s.y + 22, 13, PALETTE.pearl, 'left', 800);
}

/** Short tags for what a held item is: still raw, cut on the board, or cooked. */
const HELD_TAGS = { none: 'raw', raw: 'raw', chop: 'cut', simmer: 'ok', sear: 'ok', steam: 'ok' };

/** The eight arm slots: free, holding an item, chopping or stirring. */
export function drawArmSlots(ctx, state, t) {
  const a = LAYOUT.arms;
  panel(ctx, a.x, a.y, a.w, a.h, { fill: 'rgba(8,42,48,0.88)', stroke: INK, r: 14, line: 3 });
  const free = state.arms.filter((arm) => arm.state === 'idle').length;
  text(ctx, 'ARMS', a.x + a.w / 2, a.y + 22, { size: 16, color: PALETTE.gold, align: 'center', line: 3 });
  label(ctx, `${free}/${ARM_COUNT} free`, a.x + a.w / 2, a.y + 40, 13, free ? PALETTE.foam : PALETTE.red, 'center', 800);
  state.arms.forEach((arm, i) => {
    const y = a.y + 52 + i * 39;
    const busy = arm.state !== 'idle';
    ctx.fillStyle = busy ? '#ffb3a3' : 'rgba(255,246,230,0.1)';
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
  panel(ctx, c.x, c.y, c.w, c.h, { fill: PALETTE.pearl, stroke: INK, r: 14, line: 3 });
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
  const rows = [['1-0', 'grab'], ['QWER', 'stations'], ['Space', 'plate'], ['S', 'serve'], ['Bksp', 'bin'], ['P H M', 'pause help mute']];
  rows.forEach(([key, what], i) => {
    const y = k.y + 16 + i * 20;
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

/** Big banners: the Spring Tide warning and start, and the night's opening card. */
export function drawBanners(ctx, state, t) {
  const r = state.rush;
  if (r.warnAt !== null && !r.active) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    banner(ctx, 'SPRING TIDE INCOMING', `tickets will rush in ${clock(state.cfg.rushes[r.index] - state.time)}`, 0.85 + pulse * 0.15);
  } else if (r.active && state.time - (r.endsAt - 24) < 2.2) {
    banner(ctx, 'SPRING TIDE!', 'orders flood in: keep every arm busy', 1);
  }
  if (state.time < 3.2) {
    const alpha = Math.min(1, (3.2 - state.time) * 1.5);
    ctx.globalAlpha = alpha;
    banner(ctx, `NIGHT ${state.nightIndex + 1}: ${state.cfg.name.toUpperCase()}`, state.cfg.tip, 1);
    ctx.globalAlpha = 1;
  }
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
  panel(ctx, x, y, w, h, { fill: 'rgba(29,111,138,0.95)', stroke: PALETTE.gold, r: 22, line: 4 });
  text(ctx, title, 640, y + 36, { size: 28, color: PALETTE.gold, align: 'center', line: 6 });
  text(ctx, sub, 640, y + 62, { size: 15, color: PALETTE.pearl, align: 'center', line: 4, maxWidth: w - 30 });
  ctx.restore();
}
