/**
 * The kitchen inside the giant clam: coral-tile wall with caustic light, the porthole, the
 * menu slate, the counter, every cooking station with its food and timing ring, the Clam
 * Plate, the Current Window and the ingredient bins.
 */

import { LAYOUT, PALETTE, SLOT_TARGETS, TUNING } from '../config.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { RECIPE } from '../data/recipes.js';
import { CUSTOMERS } from '../data/customers.js';
import { cookProgress, isStirred, windowLeft } from '../stations.js';
import { patienceShare, slotPoint, ticketForPlate } from '../orders.js';
import { blob, font, keycap, label, oval, panel, ring, roundRect, TAU, text } from './draw.js';
import { drawDish, drawFinishedDish, drawIngredient } from './food.js';

const INK = PALETTE.ink;

/** Wall tiles, caustic ripples, the porthole with passing fish, a shelf and the menu slate. */
export function drawWall(ctx, state, t, calm) {
  const top = ctx.createLinearGradient(0, 0, 0, 150);
  top.addColorStop(0, '#061c21');
  top.addColorStop(1, '#0b2b31');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, 1280, 150);
  ctx.fillStyle = 'rgba(127,209,185,0.05)';
  for (let x = 0; x < 1280; x += 80) ctx.fillRect(x, 0, 2, 150);
  const g = ctx.createLinearGradient(0, 140, 0, LAYOUT.wallBottom);
  g.addColorStop(0, '#0b3239');
  g.addColorStop(1, '#14525b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 140, 1280, LAYOUT.wallBottom - 140);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 30; col++) {
      const x = col * 46 + (row % 2 ? 23 : 0) - 20;
      const y = 150 + row * 38;
      ctx.fillStyle = (row + col) % 3 === 0 ? 'rgba(127,209,185,0.10)' : (row * col) % 5 === 1 ? 'rgba(255,122,89,0.09)' : 'rgba(255,246,230,0.05)';
      roundRect(ctx, x, y, 42, 34, 9);
      ctx.fill();
    }
  }
  if (!calm) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(127,209,185,0.07)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      for (let x = 0; x <= 1280; x += 32) {
        const y = 170 + k * 34 + Math.sin(x * 0.012 + t * 0.9 + k) * 9 + Math.sin(x * 0.031 - t * 1.3) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  drawPorthole(ctx, t);
  drawShelf(ctx, t);
  drawMenuSlate(ctx, state);
}

/** A brass porthole with fish swimming past outside. */
function drawPorthole(ctx, t) {
  const { x, y, r } = LAYOUT.porthole;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const sea = ctx.createLinearGradient(0, y - r, 0, y + r);
  sea.addColorStop(0, '#2a8fb0');
  sea.addColorStop(1, '#0b3d5c');
  ctx.fillStyle = sea;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - r + i * 40, y - r);
    ctx.lineTo(x - r + i * 40 + 30, y - r);
    ctx.lineTo(x - r + i * 40 - 10, y + r);
    ctx.lineTo(x - r + i * 40 - 30, y + r);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const fx = x - r - 30 + (((t * (18 + i * 7) + i * 60) % (r * 2 + 60)));
    const fy = y - 30 + i * 20 + Math.sin(t * 2 + i) * 5;
    const col = ['#ffd166', '#ff7a59', '#c9b8ff', '#7fd1b9'][i];
    oval(ctx, fx, fy, 12 - i, 6, col, INK, 1.5);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(fx - 10 + i, fy);
    ctx.lineTo(fx - 20 + i, fy - 6);
    ctx.lineTo(fx - 20 + i, fy + 6);
    ctx.closePath();
    ctx.fill();
    blob(ctx, fx + 6 - i, fy - 1, 1.6, INK, null);
  }
  ctx.strokeStyle = '#2e7d4f';
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 40 + i * 34, y + r);
    ctx.quadraticCurveTo(x - 30 + i * 34 + Math.sin(t + i) * 10, y + 30, x - 36 + i * 34, y + 10);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#c99a4b';
  ctx.beginPath();
  ctx.arc(x, y, r + 5, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r + 11, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    blob(ctx, x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5), 3, '#f4d8a6', INK, 1.5);
  }
}

/** A driftwood shelf of jars and a kelp garland. */
function drawShelf(ctx, t) {
  ctx.fillStyle = '#8a5a34';
  roundRect(ctx, 318, 300, 250, 14, 5);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const jars = [[346, '#7ff0ff', 'pearl'], [396, '#ff9aa8', 'salt'], [446, '#6fd3a8', 'grape'], [500, '#c9b8ff', 'jelly'], [546, '#ffd166', 'urchin']];
  for (const [x, col, ing] of jars) {
    ctx.fillStyle = 'rgba(214,240,245,0.35)';
    roundRect(ctx, x - 18, 254, 36, 46, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.4;
    roundRect(ctx, x - 14, 272, 28, 24, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawIngredient(ctx, ing, x, 282, 20);
    ctx.fillStyle = '#c99a4b';
    roundRect(ctx, x - 14, 248, 28, 9, 3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = '#3e9a5c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = 300; x <= 590; x += 10) ctx.lineTo(x, 176 + Math.sin(x * 0.05) * 6 + (Math.abs(x - 445) / 145) * -12 + Math.sin(t + x) * 0.5);
  ctx.stroke();
  for (let x = 310; x <= 580; x += 34) blob(ctx, x, 184 + Math.sin(x * 0.05) * 6, 5, x % 68 ? '#ff7a59' : '#ffd166', INK, 1.5);
}

/** The menu slate on the wall: tonight's dishes. */
function drawMenuSlate(ctx, state) {
  const x = 726;
  const y = 160;
  const w = 190;
  const recipes = state.cfg.recipes;
  const vip = state.cfg.critic.length > 0;
  const h = 40 + (recipes.length + (vip ? 1 : 0)) * 26;
  panel(ctx, x, y, w, h, { fill: '#1f3a3f', stroke: '#c99a4b', r: 10, line: 4 });
  text(ctx, `TONIGHT: ${state.cfg.name.toUpperCase()}`, x + w / 2, y + 24, { size: 14, color: PALETTE.gold, align: 'center', line: 3 });
  recipes.forEach((id, i) => {
    const ry = y + 46 + i * 26;
    drawFinishedDish(ctx, id, x + 24, ry, 34);
    label(ctx, RECIPE[id].name, x + 48, ry + 5, 14, PALETTE.pearl, 'left', 700);
  });
  if (vip) {
    const ry = y + 46 + recipes.length * 26;
    drawFinishedDish(ctx, 'platter', x + 24, ry, 36);
    label(ctx, 'Grand Reef Platter', x + 48, ry + 5, 14, PALETTE.gold, 'left', 800);
  }
}

/** The sand-stone counter the stations stand on. */
export function drawCounter(ctx) {
  const top = LAYOUT.counterTop;
  const g = ctx.createLinearGradient(0, top, 0, LAYOUT.counterBottom);
  g.addColorStop(0, '#f4d8a6');
  g.addColorStop(1, '#d9b57a');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, 1280, LAYOUT.counterBottom - top);
  ctx.fillStyle = 'rgba(255,246,230,0.6)';
  ctx.fillRect(0, top, 1280, 5);
  ctx.fillStyle = 'rgba(59,42,77,0.08)';
  for (let i = 0; i < 40; i++) blob(ctx, (i * 197) % 1280, top + 20 + ((i * 61) % 150), 2 + (i % 3), 'rgba(59,42,77,0.08)', null);
  ctx.fillStyle = '#6e4a2f';
  ctx.fillRect(0, LAYOUT.counterBottom, 1280, 800 - LAYOUT.counterBottom);
  ctx.fillStyle = '#5a3c26';
  for (let x = 0; x < 1280; x += 64) ctx.fillRect(x, LAYOUT.counterBottom, 3, 800 - LAYOUT.counterBottom);
  ctx.fillStyle = INK;
  ctx.fillRect(0, LAYOUT.counterBottom - 3, 1280, 4);
}

/** The ring over a cooking slot: blue while cooking, glowing green when perfect, orange, then smoke. */
function cookRing(ctx, item, x, y, t, r = 24) {
  if (!item) return;
  const p = cookProgress(item);
  if (item.phase === 'cook' || item.phase === 'chop') {
    ring(ctx, x, y, r, p, p > 0.85 ? PALETTE.gold : PALETTE.blue, 7, 'rgba(5,25,29,0.45)');
  } else if (item.phase === 'perfect') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 10);
    ctx.save();
    ctx.shadowColor = PALETTE.green;
    ctx.shadowBlur = 14 + pulse * 10;
    ring(ctx, x, y, r, 1, PALETTE.green, 8, 'rgba(5,25,29,0.45)');
    ctx.restore();
    text(ctx, 'PERFECT', x, y - r - 10, { size: 15, color: '#c9ffd9', align: 'center', line: 4 });
  } else if (item.phase === 'over') {
    ring(ctx, x, y, r, 1, PALETTE.orange, 8, 'rgba(5,25,29,0.45)');
    text(ctx, 'HURRY', x, y - r - 10, { size: 14, color: PALETTE.orange, align: 'center', line: 4 });
  } else if (item.phase === 'flip') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 14);
    ring(ctx, x, y, r, windowLeft(item) / TUNING.sear.flipWindow, PALETTE.gold, 8, 'rgba(5,25,29,0.45)');
    text(ctx, 'FLIP!', x, y - r - 10, { size: 18 + pulse * 3, color: PALETTE.gold, align: 'center', line: 5 });
  } else if (item.phase === 'burnt') {
    ring(ctx, x, y, r, 1, '#2b2b33', 8, 'rgba(5,25,29,0.45)');
    text(ctx, 'BURNT', x, y - r - 10, { size: 14, color: '#bbbbbb', align: 'center', line: 4 });
  }
}

/** Food in a station slot, darkened when burnt. */
function slotFood(ctx, item, x, y, s, t) {
  if (!item) return;
  const prep = item.phase === 'cook' && item.prep !== 'sear' ? null : item.phase === 'cook' && !item.flipped ? null : item.prep;
  ctx.save();
  if (item.phase === 'burnt') ctx.filter = 'brightness(0.35) saturate(0.4)';
  drawIngredient(ctx, item.ing, x, y, s, prep, t);
  ctx.restore();
}

/** A station's name plate with its hotkey. */
function stationLabel(ctx, name, key, x, y) {
  font(ctx, 14);
  const w = ctx.measureText(name).width + 46;
  panel(ctx, x - w / 2, y - 13, w, 26, { fill: PALETTE.deep, stroke: INK, r: 9, line: 2.5, shadow: false });
  label(ctx, name, x - 12, y + 5, 14, PALETTE.pearl, 'center', 800);
  keycap(ctx, key, x + w / 2 - 15, y, { size: 12 });
}

/** The Shell Board: a scallop cutting board; chopping only moves while an arm works it. */
function drawBoard(ctx, state, t) {
  const st = LAYOUT.stations.board;
  const cx = st.x + st.w / 2;
  const cy = st.y + 64;
  ctx.beginPath();
  ctx.moveTo(cx - 92, cy);
  ctx.bezierCurveTo(cx - 96, cy - 66, cx + 96, cy - 66, cx + 92, cy);
  ctx.quadraticCurveTo(cx, cy + 22, cx - 92, cy);
  ctx.fillStyle = '#fff1d6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,122,89,0.45)';
  ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx + i * 28, cy - 44 + Math.abs(i) * 6);
    ctx.stroke();
  }
  const item = state.stations.board.slots[0];
  const at = SLOT_TARGETS.board[0];
  slotFood(ctx, item, at.x, at.y - 6, 44, t);
  if (item) cookRing(ctx, item, at.x + 62, at.y - 22, t, 16);
  const worker = state.arms.find((a) => a.state === 'chop');
  if (item && !worker) text(ctx, 'needs an arm', at.x, at.y + 28, { size: 13, color: PALETTE.gold, align: 'center', line: 3 });
  stationLabel(ctx, 'SHELL BOARD', 'Q', cx, st.y + 84);
}

/** A Bubble Pot on its vent stove; it burns twice as fast with no arm stirring. */
function drawPot(ctx, state, id, t) {
  const st = LAYOUT.stations[id];
  const cx = st.x + st.w / 2;
  const station = state.stations[id];
  if (station.locked) {
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,246,230,0.45)';
    roundRect(ctx, st.x + 10, st.y + 30, st.w - 20, st.h - 40, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'SECOND POT', cx, st.y + 76, { size: 13, color: 'rgba(255,246,230,0.75)', align: 'center', line: 3 });
    text(ctx, 'upgrade', cx, st.y + 96, { size: 13, color: 'rgba(255,209,102,0.85)', align: 'center', line: 3 });
    return;
  }
  const item = station.slots[0];
  const vent = ctx.createRadialGradient(cx, st.y + st.h - 6, 4, cx, st.y + st.h - 6, 56);
  vent.addColorStop(0, item ? 'rgba(127,240,255,0.85)' : 'rgba(127,209,185,0.35)');
  vent.addColorStop(1, 'rgba(127,240,255,0)');
  ctx.fillStyle = vent;
  ctx.fillRect(st.x - 10, st.y + st.h - 50, st.w + 20, 60);
  ctx.fillStyle = '#2c3440';
  roundRect(ctx, st.x + 14, st.y + st.h - 22, st.w - 28, 22, 6);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const body = ctx.createLinearGradient(st.x, 0, st.x + st.w, 0);
  body.addColorStop(0, '#2f8f9d');
  body.addColorStop(0.5, '#4fb7b0');
  body.addColorStop(1, '#1d6b66');
  ctx.beginPath();
  ctx.moveTo(st.x + 12, st.y + 46);
  ctx.lineTo(st.x + 18, st.y + st.h - 22);
  ctx.quadraticCurveTo(cx, st.y + st.h - 8, st.x + st.w - 18, st.y + st.h - 22);
  ctx.lineTo(st.x + st.w - 12, st.y + 46);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  oval(ctx, cx, st.y + 46, st.w / 2 - 10, 14, '#174f4b', INK, 3);
  if (item) {
    oval(ctx, cx, st.y + 47, st.w / 2 - 18, 9, item.phase === 'burnt' ? '#3a2f2f' : '#fbf3e4', null);
    slotFood(ctx, item, cx, st.y + 40, 38, t);
    const stirred = isStirred(state, id);
    if (item.phase !== 'cook' && !stirred && item.phase !== 'burnt') {
      text(ctx, 'STIR ME!', cx, st.y + st.h + 34, { size: 13, color: PALETTE.orange, align: 'center', line: 3 });
    }
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#1d6b66';
    roundRect(ctx, cx + side * (st.w / 2 - 6) - 8, st.y + 56, 16, 10, 4);
    ctx.fill();
    ctx.stroke();
  }
  if (item) cookRing(ctx, item, st.x + 4, st.y + 24, t, 17);
  stationLabel(ctx, id === 'pot0' ? 'BUBBLE POT' : 'POT 2', 'W', cx, st.y + st.h + 14);
}

/** The Vent Grill: a basalt slab over glowing lava cracks, two slots that each need a flip. */
function drawGrill(ctx, state, t) {
  const st = LAYOUT.stations.grill;
  ctx.fillStyle = '#3a2f3f';
  roundRect(ctx, st.x, st.y + 24, st.w, st.h - 30, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const glow = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.strokeStyle = `rgba(255,122,61,${0.55 + glow * 0.35})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(st.x + 14, st.y + 70);
  ctx.lineTo(st.x + 48, st.y + 60);
  ctx.lineTo(st.x + 70, st.y + 78);
  ctx.lineTo(st.x + 110, st.y + 64);
  ctx.lineTo(st.x + 140, st.y + 80);
  ctx.lineTo(st.x + 176, st.y + 66);
  ctx.stroke();
  ctx.fillStyle = '#4a4050';
  roundRect(ctx, st.x + 8, st.y + 14, st.w - 16, 40, 10);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,10,10,0.7)';
  ctx.lineWidth = 3;
  for (let x = st.x + 20; x < st.x + st.w - 14; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, st.y + 20);
    ctx.lineTo(x, st.y + 48);
    ctx.stroke();
  }
  state.stations.grill.slots.forEach((item, i) => {
    const at = SLOT_TARGETS.grill[i];
    slotFood(ctx, item, at.x, at.y - 20, 42, t);
    if (item) cookRing(ctx, item, at.x, at.y - 46, t, 15);
  });
  stationLabel(ctx, 'VENT GRILL', 'E', st.x + st.w / 2, st.y + st.h + 2);
}

/** The Kelp Steamer: two woven baskets stacked under a lid, steaming. */
function drawSteamer(ctx, state, t) {
  const st = LAYOUT.stations.steamer;
  const cx = st.x + st.w / 2;
  ctx.fillStyle = '#b78a4e';
  ctx.beginPath();
  ctx.moveTo(st.x + 10, st.y + 30);
  ctx.quadraticCurveTo(cx, st.y - 10, st.x + st.w - 10, st.y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  blob(ctx, cx, st.y + 8, 8, '#8a5a34', INK, 2.5);
  state.stations.steamer.slots.forEach((item, i) => {
    const y = st.y + 32 + i * 96;
    ctx.fillStyle = '#c8a26b';
    roundRect(ctx, st.x + 6, y, st.w - 12, 86, 14);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(110,74,47,0.55)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(st.x + 10, y + k * 21);
      ctx.lineTo(st.x + st.w - 10, y + k * 21);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,25,20,0.55)';
    roundRect(ctx, st.x + 22, y + 14, st.w - 44, 58, 12);
    ctx.fill();
    const at = SLOT_TARGETS.steamer[i];
    slotFood(ctx, item, at.x - 14, at.y - 3, 42, t);
    if (item) cookRing(ctx, item, at.x + 44, at.y - 22, t, 15);
  });
  stationLabel(ctx, 'KELP STEAMER', 'R', cx, st.y + st.h + 12);
}

/** Every station, back to front. */
export function drawStations(ctx, state, t) {
  drawBoard(ctx, state, t);
  drawPot(ctx, state, 'pot0', t);
  drawPot(ctx, state, 'pot1', t);
  drawGrill(ctx, state, t);
  drawSteamer(ctx, state, t);
}

/** The Clam Plate: an open giant clam holding the dish being assembled. */
export function drawClamPlate(ctx, state, t) {
  const { x, y, w } = LAYOUT.plate;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 6);
  ctx.bezierCurveTo(x - w / 2, y - 92, x + w / 2, y - 92, x + w / 2, y - 6);
  ctx.closePath();
  const inner = ctx.createRadialGradient(x, y - 30, 10, x, y - 20, w / 2);
  inner.addColorStop(0, '#fff6e6');
  inner.addColorStop(1, '#c9b8ff');
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(59,42,77,0.25)';
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + i * 26, y - 64 + Math.abs(i) * 7);
    ctx.stroke();
  }
  oval(ctx, x, y + 6, w / 2 + 6, 30, '#9ad9c6', INK, 3);
  const plate = state.plate;
  if (plate.recipeId) {
    drawDish(ctx, plate.recipeId, x, y - 4, 214, plate.parts, false);
  } else {
    label(ctx, 'Hold food, then press Space', x, y + 10, 13, 'rgba(59,42,77,0.7)', 'center', 800);
  }
  const lw = 196;
  panel(ctx, x - lw / 2, y + 26, lw, 26, { fill: PALETTE.deep, stroke: INK, r: 9, line: 2.5, shadow: false });
  label(ctx, 'CLAM PLATE', x - 20, y + 44, 14, PALETTE.pearl, 'center', 800);
  keycap(ctx, 'Space', x + 58, y + 39, { size: 12 });
  if (plate.recipeId) {
    const glow = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.strokeStyle = `rgba(255,209,102,${0.25 + glow * 0.3})`;
    ctx.lineWidth = 3;
    oval(ctx, x, y + 6, w / 2 + 12, 34, null, `rgba(255,209,102,${0.25 + glow * 0.3})`, 3);
  }
}

/** The Current Window: the pass where finished plates glow until they are served. */
export function drawPass(ctx, state, t) {
  const p = LAYOUT.pass;
  panel(ctx, p.x, p.y, p.w, p.h, { fill: '#123f46', stroke: '#c99a4b', r: 24, line: 5 });
  ctx.save();
  roundRect(ctx, p.x + 8, p.y + 40, p.w - 16, p.h - 50, 18);
  ctx.clip();
  const water = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  water.addColorStop(0, '#1c7488');
  water.addColorStop(1, '#0b3d4c');
  ctx.fillStyle = water;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = 'rgba(127,240,255,0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const yy = p.y + 60 + i * 38;
    const off = (t * 60 + i * 47) % 260;
    ctx.beginPath();
    ctx.moveTo(p.x - 40 + off, yy);
    ctx.quadraticCurveTo(p.x + off, yy - 8, p.x + 40 + off, yy);
    ctx.stroke();
  }
  ctx.restore();
  text(ctx, 'CURRENT WINDOW', p.x + p.w / 2, p.y + 28, { size: 15, color: PALETTE.gold, align: 'center', line: 4 });
  const slots = state.upgrades.biggerPlate ? TUNING.biggerPassSlots : TUNING.passSlots;
  for (let i = 0; i < slots; i++) {
    const cy = slotPoint(i).y - 10;
    const plate = state.pass[i];
    oval(ctx, p.x + p.w / 2, cy + 26, 74, 18, 'rgba(255,246,230,0.12)', 'rgba(255,246,230,0.35)', 2);
    if (!plate) {
      label(ctx, 'empty', p.x + p.w / 2, cy + 30, 13, 'rgba(255,246,230,0.45)', 'center', 700);
      continue;
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 5 + i);
    ctx.save();
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 18 + pulse * 14;
    blob(ctx, p.x + p.w / 2, cy + 6, 62, `rgba(255,209,102,${0.16 + pulse * 0.12})`, null);
    ctx.restore();
    drawFinishedDish(ctx, plate.recipeId, p.x + p.w / 2, cy + 10, 150);
    const warm = plate.warmth / plate.maxWarmth;
    ctx.fillStyle = 'rgba(5,25,29,0.6)';
    roundRect(ctx, p.x + 24, cy + 48, p.w - 48, 8, 4);
    ctx.fill();
    ctx.fillStyle = warm > 0.35 ? PALETTE.coral : '#9fc7d6';
    roundRect(ctx, p.x + 24, cy + 48, (p.w - 48) * warm, 8, 4);
    ctx.fill();
    const ticket = ticketForPlate(state, plate);
    const dest = ticket ? `${CUSTOMERS[ticket.customerId].name} #${ticket.id}` : 'nobody ordered';
    text(ctx, RECIPE[plate.recipeId].name, p.x + p.w / 2, cy - 44, { size: 14, color: PALETTE.pearl, align: 'center', line: 3, maxWidth: p.w - 20 });
    if (i === 0 && ticket) {
      keycap(ctx, 'S', p.x + 22, cy + 76, { size: 13, fill: PALETTE.gold });
      text(ctx, `serve to ${dest}`, p.x + 36, cy + 81, { size: 13, color: PALETTE.pearl, line: 3, maxWidth: p.w - 40 });
    } else {
      text(ctx, ticket ? `for ${dest}` : dest, p.x + p.w / 2, cy + 81, { size: 13, color: ticket ? PALETTE.pearl : PALETTE.orange, align: 'center', line: 3, maxWidth: p.w - 16 });
    }
    if (ticket) {
      const share = patienceShare(ticket);
      ring(ctx, p.x + p.w - 22, cy - 22, 10, share, share > 0.5 ? PALETTE.green : share > 0.25 ? PALETTE.gold : PALETTE.red, 4);
    }
  }
}

/** The ten ingredient bins along the counter front, each with its name and hotkey. */
export function drawBins(ctx, t, hover = null) {
  const b = LAYOUT.bins;
  INGREDIENTS.forEach((ing, i) => {
    const x = b.x + i * (b.w + b.gap);
    const lifted = hover === i ? -4 : 0;
    panel(ctx, x, b.y + lifted, b.w, b.h, { fill: '#8a5a34', stroke: INK, r: 12, line: 3 });
    ctx.fillStyle = '#5a3c26';
    roundRect(ctx, x + 7, b.y + 8 + lifted, b.w - 14, 64, 10);
    ctx.fill();
    ctx.fillStyle = ing.color;
    ctx.globalAlpha = 0.28;
    roundRect(ctx, x + 7, b.y + 8 + lifted, b.w - 14, 64, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    const cx = x + b.w / 2;
    drawIngredient(ctx, ing.id, cx - 18, b.y + 50 + lifted, 34, null, t);
    drawIngredient(ctx, ing.id, cx + 18, b.y + 48 + lifted, 34, null, t);
    drawIngredient(ctx, ing.id, cx, b.y + 36 + lifted, 40, null, t);
    keycap(ctx, ing.key, x + 18, b.y + 18 + lifted, { size: 14, fill: PALETTE.gold });
    const words = ing.name.split(/[ -]/);
    const lines = ing.name.length > 11 ? [words.slice(0, -1).join(ing.name.includes('-') ? '-' : ' '), words[words.length - 1]] : [ing.name];
    lines.forEach((line, k) => {
      text(ctx, line, cx, b.y + 96 + k * 18 + (lines.length === 1 ? 8 : 0) + lifted, { size: 15, color: PALETTE.pearl, align: 'center', line: 3, maxWidth: b.w - 8 });
    });
  });
}

/** The ink jar that takes burnt food, mistakes and unwanted plates. */
export function drawTrash(ctx) {
  const tr = LAYOUT.trash;
  const cx = tr.x + tr.w / 2;
  ctx.fillStyle = '#5a4470';
  roundRect(ctx, tr.x + 8, tr.y + 14, tr.w - 16, 54, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  oval(ctx, cx, tr.y + 16, tr.w / 2 - 6, 9, '#2a1d38', INK, 3);
  blob(ctx, cx - 10, tr.y + 42, 7, 'rgba(255,255,255,0.18)', null);
  label(ctx, 'BIN', cx, tr.y + 50, 14, PALETTE.pearl, 'center', 900);
  keycap(ctx, 'Bksp', cx, tr.y + 78, { size: 11 });
}
