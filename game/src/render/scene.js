/**
 * The kitchen inside the giant clam: tiled wall, porthole, shelf and menu slate, the stone
 * counter, every cooking station with its food and timing dial, the Clam Plate, the Current
 * Window onto the reef, the ingredient crates, and the night's light. Static surfaces are
 * painted once into offscreen layers; only living things redraw.
 */

import { LAYOUT, PALETTE, SLOT_TARGETS, TUNING } from '../config.js';
import { INGREDIENT, INGREDIENTS } from '../data/ingredients.js';
import { RECIPE } from '../data/recipes.js';
import { CUSTOMERS } from '../data/customers.js';
import { cookProgress, isStirred, windowLeft } from '../stations.js';
import { patienceShare, slotPoint, ticketForPlate } from '../orders.js';
import { blob, font, keycap, label, oval, panel, ring, roundRect, sparkle, TAU, text } from './draw.js';
import { drawDish, drawFinishedDish, drawIngredient } from './food.js';
import { drawWindowDiners, drawWindowSpeech } from './customers.js';
import { contactShadow, drawCached, drawCaustics, glow, moodFor, MOODS, puff, verticalGradient } from './light.js';

const INK = PALETTE.ink;

/** Strokes the current path with the ink outline. */
function outline(ctx, width = 3) {
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** This frame's time, motion setting and mood, recorded by drawWall (drawn first) for the layers after it. */
const frame = { t: 0, calm: false, mood: MOODS[0] };

/** Height of the garland rope at x: it sags in the middle. */
const garlandY = (x) => 168 + 18 * (1 - ((x - 445) / 145) ** 2);
/** The garland's glass bulbs. */
const BULBS = Array.from({ length: 9 }, (_, i) => ({ x: 310 + i * 34, y: garlandY(310 + i * 34) + 9, warm: i % 2 === 0 }));
/** The shelf jars: x, glass tint and the ingredient inside. */
const JARS = [[346, '#7ff0ff', 'pearl'], [396, '#ff9aa8', 'salt'], [446, '#6fd3a8', 'grape'], [500, '#c9b8ff', 'jelly'], [546, '#ffd166', 'urchin']];

/** A vertical black fade over a band, for baked ambient occlusion. */
function shadeBand(c, y0, y1, a0, a1, x = 0, w = 1280) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(2,12,16,${a0})`);
  g.addColorStop(1, `rgba(2,12,16,${a1})`);
  c.fillStyle = g;
  c.fillRect(x, y0, w, y1 - y0);
}

/** Paints the static wall once per mood: tiles lit from the top left, porthole frame, shelf and garland. */
function paintWall(c, mood) {
  const bottom = LAYOUT.wallBottom;
  const band = c.createLinearGradient(0, 0, 0, 150);
  band.addColorStop(0, '#03141a');
  band.addColorStop(1, mood.grout);
  c.fillStyle = band;
  c.fillRect(0, 0, 1280, 150);
  c.fillStyle = 'rgba(255,255,255,0.035)';
  for (let x = 0; x < 1280; x += 80) c.fillRect(x, 0, 2, 150);
  c.fillStyle = mood.grout;
  c.fillRect(0, 146, 1280, bottom - 146);
  const base = c.createLinearGradient(0, 150, 0, bottom);
  base.addColorStop(0, mood.wall[0]);
  base.addColorStop(1, mood.wall[1]);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 30; col++) {
      const x = col * 46 + (row % 2 ? 23 : 0) - 20;
      const y = 152 + row * 38;
      roundRect(c, x, y, 42, 34, 9);
      c.fillStyle = base;
      c.fill();
      const pick = (row * 7 + col * 3) % 11;
      if (pick < 3) {
        c.globalAlpha = mood.accent ?? 0.17;
        c.fillStyle = mood.tiles[pick];
        c.fill();
        c.globalAlpha = 1;
      }
      const bevel = c.createLinearGradient(x, y, x + 22, y + 40);
      bevel.addColorStop(0, 'rgba(255,255,255,0.17)');
      bevel.addColorStop(0.45, 'rgba(255,255,255,0)');
      bevel.addColorStop(1, 'rgba(0,0,0,0.24)');
      c.fillStyle = bevel;
      c.fill();
    }
  }
  const key = c.createRadialGradient(330, 180, 30, 330, 180, 1000);
  key.addColorStop(0, 'rgba(255,248,228,0.16)');
  key.addColorStop(0.4, 'rgba(255,248,228,0)');
  key.addColorStop(1, 'rgba(1,8,12,0.4)');
  c.fillStyle = key;
  c.fillRect(0, 146, 1280, bottom - 146);
  shadeBand(c, 146, 200, 0.55, 0);
  shadeBand(c, bottom - 80, bottom, 0, 0.55);
  paintPortholeFrame(c);
  paintShelf(c);
  if (mood.king) paintBunting(c);
  else paintGarland(c);
}

/** King Tide's festive bunting in place of the garland: gold cords swagging above the shelf, hung with pennants. */
function paintBunting(c) {
  const colors = ['#8a4fd6', '#ffd166', '#ff7a59', '#fff6e6'];
  for (const [x0, x1] of [[150, 432], [432, 716]]) {
    const sag = (x) => 160 + 22 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
    for (const [w, col] of [[5, INK], [2.5, '#ffe2a0']]) {
      c.beginPath();
      for (let x = x0; x <= x1; x += 6) c.lineTo(x, sag(x));
      c.lineWidth = w;
      c.strokeStyle = col;
      c.stroke();
    }
    for (let x = x0 + 18, k = 0; x < x1 - 10; x += 27, k++) {
      c.save();
      c.translate(x, sag(x));
      c.rotate(Math.atan(sag(x + 1) - sag(x)));
      c.beginPath();
      c.moveTo(-10, 0);
      c.lineTo(10, 0);
      c.lineTo(0, 24);
      c.closePath();
      c.fillStyle = colors[(k + (x0 > 300 ? 2 : 0)) % 4];
      c.fill();
      outline(c, 2);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.beginPath();
      c.moveTo(-7, 2);
      c.lineTo(-2, 2);
      c.lineTo(-1, 14);
      c.closePath();
      c.fill();
      c.restore();
    }
  }
}

/** The porthole's brass ring and bolts, with its shadow on the wall. */
function paintPortholeFrame(c) {
  const { x, y, r } = LAYOUT.porthole;
  const brass = c.createLinearGradient(x - r, y - r, x + r, y + r);
  brass.addColorStop(0, '#ffe7a8');
  brass.addColorStop(0.45, '#c99a4b');
  brass.addColorStop(1, '#6b4520');
  c.save();
  c.shadowColor = 'rgba(0,10,14,0.6)';
  c.shadowBlur = 18;
  c.shadowOffsetX = 6;
  c.shadowOffsetY = 9;
  c.lineWidth = 16;
  c.strokeStyle = brass;
  c.beginPath();
  c.arc(x, y, r + 7, 0, TAU);
  c.stroke();
  c.restore();
  c.lineWidth = 3;
  c.strokeStyle = INK;
  for (const rr of [r + 15, r - 1]) {
    c.beginPath();
    c.arc(x, y, rr, 0, TAU);
    c.stroke();
  }
  c.lineWidth = 2.5;
  c.strokeStyle = 'rgba(255,250,220,0.75)';
  c.beginPath();
  c.arc(x, y, r + 10, Math.PI * 1.05, Math.PI * 1.6);
  c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const bx = x + Math.cos(a) * (r + 7);
    const by = y + Math.sin(a) * (r + 7);
    blob(c, bx, by, 3.4, '#f4d8a6', INK, 1.5);
    blob(c, bx - 1, by - 1, 1.2, '#fffaf0', null);
  }
}

/** A driftwood shelf of glass jars, casting a soft shadow on the tiles. */
function paintShelf(c) {
  c.save();
  c.shadowColor = 'rgba(0,10,14,0.55)';
  c.shadowBlur = 14;
  c.shadowOffsetX = 5;
  c.shadowOffsetY = 9;
  const wood = c.createLinearGradient(0, 300, 0, 314);
  wood.addColorStop(0, '#b07a48');
  wood.addColorStop(1, '#6e4a2f');
  c.fillStyle = wood;
  roundRect(c, 318, 300, 250, 14, 5);
  c.fill();
  for (const [x, col] of JARS) {
    c.fillStyle = col;
    c.globalAlpha = 0.3;
    roundRect(c, x - 18, 254, 36, 46, 8);
    c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
  roundRect(c, 318, 300, 250, 14, 5);
  outline(c, 2.5);
  c.fillStyle = 'rgba(255,232,196,0.5)';
  c.fillRect(323, 302, 240, 2);
  for (const [x, col, ing] of JARS) {
    c.fillStyle = col;
    c.globalAlpha = 0.45;
    roundRect(c, x - 14, 272, 28, 24, 5);
    c.fill();
    c.globalAlpha = 1;
    drawIngredient(c, ing, x, 282, 20);
    const glass = c.createLinearGradient(x - 18, 0, x + 18, 0);
    glass.addColorStop(0, 'rgba(230,250,255,0.35)');
    glass.addColorStop(0.5, 'rgba(230,250,255,0.08)');
    glass.addColorStop(1, 'rgba(10,30,40,0.25)');
    c.fillStyle = glass;
    roundRect(c, x - 18, 254, 36, 46, 8);
    c.fill();
    outline(c, 2.5);
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.moveTo(x - 11, 262);
    c.lineTo(x - 11, 288);
    c.stroke();
    c.lineCap = 'butt';
    const lid = c.createLinearGradient(0, 248, 0, 257);
    lid.addColorStop(0, '#ffe3a0');
    lid.addColorStop(1, '#a87a35');
    c.fillStyle = lid;
    roundRect(c, x - 14, 248, 28, 9, 3);
    c.fill();
    outline(c, 2.5);
  }
}

/** A kelp garland strung with glass bulbs (their light is added by drawAtmosphere). */
function paintGarland(c) {
  const rope = () => {
    c.beginPath();
    for (let x = 300; x <= 590; x += 10) c.lineTo(x, garlandY(x) + Math.sin(x * 0.08) * 2);
  };
  c.lineCap = 'round';
  rope();
  c.lineWidth = 7;
  c.strokeStyle = '#1f5a36';
  c.stroke();
  rope();
  c.lineWidth = 3;
  c.strokeStyle = '#5cbf7a';
  c.stroke();
  c.lineCap = 'butt';
  for (let x = 318; x < 590; x += 34) {
    c.save();
    c.translate(x, garlandY(x));
    c.rotate(x % 68 ? 0.6 : -0.6);
    oval(c, 0, -6, 4, 8, '#3e9a5c', INK, 1.5);
    c.restore();
  }
  for (const b of BULBS) {
    c.fillStyle = INK;
    c.fillRect(b.x - 3, b.y - 10, 6, 4);
    blob(c, b.x, b.y, 6, b.warm ? '#ffd166' : '#ff9a7a', INK, 1.5);
    blob(c, b.x - 2, b.y - 2, 2, '#fffaf0', null);
  }
}

/** Lightning strength 0..1 in Storm Tide: a double flash every 6.4 seconds. */
function stormFlash(t) {
  const p = t % 6.4;
  if (p < 0.08) return 1;
  if (p < 0.16) return 0.2;
  if (p < 0.26) return 0.8;
  return p < 0.7 ? 0.8 * (1 - (p - 0.26) / 0.44) : 0;
}

/** The porthole glass: the night's sea with fish, kelp, rain and lightning, under the baked brass ring. */
function drawPorthole(ctx, mood, t, calm) {
  const { x, y, r } = LAYOUT.porthole;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = verticalGradient(ctx, y - r, y + r, mood.sea);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (mood.moon) {
    glow(ctx, x + 24, y - 30, 50, '200,210,255', 0.7);
    blob(ctx, x + 24, y - 30, 14, '#f4f2ff', null);
    blob(ctx, x + 19, y - 33, 3, 'rgba(170,170,220,0.6)', null);
    blob(ctx, x + 29, y - 25, 2, 'rgba(170,170,220,0.6)', null);
  }
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
    const fx = x - r - 30 + ((t * (18 + i * 7) + i * 60) % (r * 2 + 60));
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
  if (mood.storm) {
    ctx.strokeStyle = 'rgba(210,235,240,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const rx = x - r + ((i * 37 + t * 140) % (r * 2 + 30));
      const ry = y - r + ((i * 53 + t * 260) % (r * 2));
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 7, ry + 20);
    }
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(225,244,250,0.35)';
    for (let i = 0; i < 7; i++) {
      const dx = x - r + 16 + ((i * 41) % (r * 2 - 32));
      const dy = y - r + ((i * 67 + t * (24 + i * 5)) % (r * 2 + 24)) - 12;
      ctx.beginPath();
      ctx.moveTo(dx + Math.sin(dy * 0.2) * 1.5, dy - 22);
      ctx.lineTo(dx, dy);
      ctx.stroke();
      blob(ctx, dx, dy, 2.8, 'rgba(236,250,255,0.8)', 'rgba(10,30,40,0.35)', 1);
    }
    const f = calm ? 0 : stormFlash(t);
    if (f > 0) {
      ctx.fillStyle = `rgba(220,240,255,${f * 0.6})`;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      let s = Math.floor(t / 6.4) * 9301 + 7;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      ctx.beginPath();
      let bx = x - 20 + rnd() * 40;
      ctx.moveTo(bx, y - r);
      for (let by = y - r + 14; by < y + r; by += 14) ctx.lineTo((bx += (rnd() - 0.5) * 26), by);
      for (const [w, a] of [[7, 0.35], [2.5, 1]]) {
        ctx.lineWidth = w;
        ctx.strokeStyle = `rgba(240,250,255,${a * f})`;
        ctx.stroke();
      }
    }
  }
  const lens = ctx.createRadialGradient(x - 18, y - 22, r * 0.2, x, y, r * 1.05);
  lens.addColorStop(0, 'rgba(0,10,20,0)');
  lens.addColorStop(1, 'rgba(0,10,20,0.5)');
  ctx.fillStyle = lens;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x, y, r - 14, Math.PI * 1.12, Math.PI * 1.42);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

/** Wall, porthole, shelf and menu slate, with the caustic net moving over the tiles. */
export function drawWall(ctx, state, t, calm) {
  const mood = moodFor(state);
  frame.t = t;
  frame.calm = calm;
  frame.mood = mood;
  drawCached(ctx, `wall:${MOODS.indexOf(mood)}`, 0, 0, 1280, LAYOUT.wallBottom, (c) => paintWall(c, mood));
  drawCaustics(ctx, { x: 0, y: 150, w: 1280, h: LAYOUT.wallBottom - 150 }, mood.caustic, mood.caustics, calm ? 0 : t);
  drawPorthole(ctx, mood, t, calm);
  drawMenuSlate(ctx, state);
}

/** Where the menu slate hangs. */
const SLATE = { x: 726, y: 160, w: 190 };

/** Paints the menu slate: tonight's dishes chalked on a board in a wooden frame. */
function paintSlate(c, cfg, h, step) {
  const { x, y, w } = SLATE;
  c.save();
  c.shadowColor = 'rgba(0,10,14,0.55)';
  c.shadowBlur = 14;
  c.shadowOffsetX = 5;
  c.shadowOffsetY = 8;
  roundRect(c, x - 6, y - 6, w + 12, h + 12, 12);
  const wood = c.createLinearGradient(x, y, x + w, y + h);
  wood.addColorStop(0, '#b07c4c');
  wood.addColorStop(1, '#5a3a22');
  c.fillStyle = wood;
  c.fill();
  c.restore();
  outline(c, 3);
  roundRect(c, x + 3, y + 3, w - 6, h - 6, 7);
  c.fillStyle = verticalGradient(c, y, y + h, ['#24403f', '#15292b']);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.035)';
  for (const [dx, dy, r] of [[50, 60, 40], [140, 120, 50], [70, 190, 36]]) {
    c.beginPath();
    c.ellipse(x + dx, y + dy, r, r * 0.4, -0.3, 0, TAU);
    c.fill();
  }
  for (const [cx, cy] of [[x - 1, y - 1], [x + w + 1, y - 1], [x - 1, y + h + 1], [x + w + 1, y + h + 1]]) blob(c, cx, cy, 3, '#f4d8a6', INK, 1.5);
  text(c, `TONIGHT: ${cfg.name.toUpperCase()}`, x + w / 2, y + 24, { size: 14, color: PALETTE.gold, align: 'center', line: 3 });
  cfg.recipes.forEach((id, i) => {
    const ry = y + 46 + i * step;
    drawFinishedDish(c, id, x + 24, ry, 34);
    label(c, RECIPE[id].name, x + 48, ry + 5, 14, PALETTE.pearl, 'left', 700);
  });
  if (cfg.critic.length > 0) {
    const ry = y + 46 + cfg.recipes.length * step;
    drawFinishedDish(c, 'platter', x + 24, ry, 36);
    label(c, 'Grand Reef Platter', x + 48, ry + 5, 14, PALETTE.gold, 'left', 800);
  }
}

/** The menu slate on the wall (painted once per night). */
function drawMenuSlate(ctx, state) {
  const cfg = state.cfg;
  const rows = cfg.recipes.length + (cfg.critic.length > 0 ? 1 : 0);
  const step = rows > 7 ? 24 : 26;
  const h = 40 + rows * step;
  drawCached(ctx, `slate:${cfg.name}`, SLATE.x - 14, SLATE.y - 12, SLATE.w + 32, h + 34, (c) => {
    c.translate(14 - SLATE.x, 12 - SLATE.y);
    paintSlate(c, cfg, h, step);
  });
}

/** Paints the static counter: speckled sand-stone top, rounded lip, plank front and the crate ledge. */
function paintCounter(c) {
  const top = LAYOUT.counterTop;
  const bot = LAYOUT.counterBottom;
  c.translate(0, -top);
  const stone = c.createLinearGradient(0, top, 0, bot);
  stone.addColorStop(0, '#d6b47c');
  stone.addColorStop(0.2, '#eed2a0');
  stone.addColorStop(1, '#f7e2b6');
  c.fillStyle = stone;
  c.fillRect(0, top, 1280, bot - top);
  const key = c.createRadialGradient(360, top + 30, 20, 360, top + 30, 1000);
  key.addColorStop(0, 'rgba(255,252,240,0.4)');
  key.addColorStop(1, 'rgba(110,70,36,0.22)');
  c.fillStyle = key;
  c.fillRect(0, top, 1280, bot - top);
  let s = 5;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 560; i++) {
    const dark = rnd() < 0.72;
    c.fillStyle = dark ? `rgba(110,72,40,${0.07 + rnd() * 0.12})` : `rgba(255,255,255,${0.25 + rnd() * 0.35})`;
    c.beginPath();
    c.arc(rnd() * 1280, top + 10 + rnd() * (bot - top - 28), 0.6 + rnd() * 1.8, 0, TAU);
    c.fill();
  }
  shadeBand(c, top, top + 30, 0.4, 0);
  const lip = c.createLinearGradient(0, bot - 14, 0, bot);
  lip.addColorStop(0, '#f2d7a6');
  lip.addColorStop(1, '#9c7646');
  c.fillStyle = lip;
  c.fillRect(0, bot - 14, 1280, 14);
  c.fillStyle = 'rgba(255,252,240,0.8)';
  c.fillRect(0, bot - 15, 1280, 2);
  const wood = c.createLinearGradient(0, bot, 0, 800);
  wood.addColorStop(0, '#5e3d25');
  wood.addColorStop(1, '#3a2415');
  c.fillStyle = wood;
  c.fillRect(0, bot, 1280, 800 - bot);
  c.lineWidth = 1;
  for (let k = 0; k < 26; k++) {
    c.strokeStyle = `rgba(20,10,4,${0.12 + (k % 3) * 0.05})`;
    c.beginPath();
    const gy = bot + 8 + k * 5.5;
    for (let x = 0; x <= 1280; x += 40) c.lineTo(x, gy + Math.sin(x * 0.013 + k * 1.7) * 2.5);
    c.stroke();
  }
  for (let x = 0; x < 1280; x += 64) {
    c.fillStyle = 'rgba(15,8,3,0.55)';
    c.fillRect(x, bot, 2, 800 - bot);
    c.fillStyle = 'rgba(255,220,170,0.12)';
    c.fillRect(x + 2, bot, 1, 800 - bot);
  }
  shadeBand(c, bot, bot + 26, 0.6, 0);
  c.fillStyle = INK;
  c.fillRect(0, bot - 2, 1280, 3);
  const ledge = c.createLinearGradient(0, 782, 0, 800);
  ledge.addColorStop(0, '#a8743f');
  ledge.addColorStop(1, '#6a452a');
  c.fillStyle = ledge;
  c.fillRect(0, 782, 1280, 18);
  c.fillStyle = 'rgba(255,236,200,0.45)';
  c.fillRect(0, 783, 1280, 2);
  c.fillStyle = INK;
  c.fillRect(0, 780, 1280, 2.5);
  c.save();
  c.translate(323, 516);
  c.rotate(1.15);
  drawIngredient(c, 'kelp', 0, 0, 40);
  c.restore();
  drawIngredient(c, 'grape', 328, 557, 26);
}

/** The sand-stone counter the stations stand on, with caustics rippling across it. */
export function drawCounter(ctx) {
  const top = LAYOUT.counterTop;
  drawCached(ctx, 'counter', 0, top, 1280, 800 - top, paintCounter);
  const { mood, t, calm } = frame;
  if (mood.counter) {
    ctx.fillStyle = `rgba(${mood.counter})`;
    ctx.fillRect(0, top, 1280, LAYOUT.counterBottom - top);
  }
  drawCaustics(ctx, { x: 0, y: top + 4, w: 1280, h: LAYOUT.counterBottom - top - 20 }, mood.caustic, mood.caustics * 0.75, calm ? 0 : t, 0.45);
}

/** Soft steam rising from (x, y): `n` puffs looping, each swelling and fading. */
function steam(ctx, x, y, t, n = 3, spread = 12, height = 56, alpha = 0.32) {
  const speed = frame.calm ? 0.15 : 0.45;
  for (let k = 0; k < n; k++) {
    const p = (t * speed + k / n) % 1;
    puff(ctx, x + Math.sin(p * 4 + k * 1.7) * spread * (0.3 + p), y - p * height, 9 + p * 20, '255,255,255', alpha * Math.sin(p * Math.PI));
  }
}

/** Cartoon steam wisps: wavy white strokes curling up from hot food and fading as they rise. */
function wisps(ctx, x, y, t, n = 2, height = 44) {
  const speed = frame.calm ? 0.12 : 0.5;
  const wave = frame.calm ? 0.6 : 3;
  ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const p = (t * speed + k / n) % 1;
    const a = Math.sin(p * Math.PI);
    const bx = x + (k - (n - 1) / 2) * 14;
    const by = y - p * height * 0.5;
    ctx.beginPath();
    for (let j = 0; j <= 8; j++) ctx.lineTo(bx + Math.sin(j * 0.9 + t * wave + k * 2) * 5, by - j * height * 0.07);
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = `rgba(0,30,40,${0.14 * a})`;
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/** A twinkling highlight that makes plated food look glossy and fresh. */
function glint(ctx, x, y, t) {
  const tw = frame.calm ? 0.6 : 0.5 + 0.5 * Math.sin(t * 3.1 + x);
  ctx.globalAlpha = 0.55 + tw * 0.45;
  sparkle(ctx, x, y, 3.5 + tw * 3.5, '#fffbe6');
  ctx.globalAlpha = 1;
}

/** Hot oil popping off sizzling food: bright droplets arcing up and falling back under a little smoke. */
function sizzle(ctx, x, y, t) {
  steam(ctx, x, y - 8, t, 2, 8, 36, 0.22);
  for (let k = 0; k < 8; k++) {
    const p = (t * 1.7 + k / 8) % 1;
    const dx = (k % 2 ? 1 : -1) * (10 + ((k * 7) % 18)) * p;
    const dy = Math.sin(p * Math.PI) * (16 + (k % 3) * 10);
    glow(ctx, x + dx, y - 10 - dy, 6, '255,170,80', 0.5 * (1 - p));
    blob(ctx, x + dx, y - 10 - dy, 2.2, `rgba(255,240,190,${1 - p * p})`, null);
  }
}

/** Dark smoke curling up from burnt food. */
function smoke(ctx, x, y, t) {
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.5 + k / 4) % 1;
    puff(ctx, x + Math.sin(p * 5 + k * 2) * 12 * p, y - p * 70, 8 + p * 22, '34,30,38', 0.65 * Math.sin(p * Math.PI));
  }
}

/** Twinkles circling perfect food. */
function twinkles(ctx, x, y, s, t) {
  for (let k = 0; k < 3; k++) {
    const a = t * 1.6 + k * 2.1;
    const tw = 0.5 + 0.5 * Math.sin(t * 7 + k * 2);
    ctx.globalAlpha = 0.4 + tw * 0.6;
    sparkle(ctx, x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.36 - s * 0.1, 3 + tw * 4, '#fff3c4');
  }
  ctx.globalAlpha = 1;
}

/** Burnt food: the ingredient painted once into a small canvas and charred with a dark wash. */
function drawCharred(ctx, ing, prep, x, y, s) {
  const size = Math.ceil(s * 1.6);
  drawCached(ctx, `char:${ing}:${prep}:${size}`, x - size / 2, y - size / 2, size, size, (c) => {
    drawIngredient(c, ing, size / 2, size / 2, s, prep);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(30,20,22,0.78)';
    c.fillRect(0, 0, size, size);
  });
}

/** Food in a station slot: a gold aura when perfect, an amber warning when overdone or due a flip, charred and smoking when burnt; `marked` shows sear marks early. */
function slotFood(ctx, item, x, y, s, t, marked = false) {
  if (!item) return;
  const early = marked && cookProgress(item) > 0.3;
  const raw = (item.phase === 'cook' && !early && (item.prep !== 'sear' || !item.flipped)) || (item.phase === 'chop' && cookProgress(item) < 0.45);
  const prep = raw ? null : item.prep;
  const pulse = frame.calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 7);
  if (item.phase === 'perfect') glow(ctx, x, y, s * 1.7, '255,209,102', 0.65 + pulse * 0.35);
  else if (item.phase === 'over' || item.phase === 'flip') glow(ctx, x, y, s * 1.05, '255,96,40', 0.3 + pulse * 0.4);
  if (item.phase === 'burnt') {
    drawCharred(ctx, item.ing, prep, x, y, s);
    smoke(ctx, x, y - s * 0.3, t);
    return;
  }
  drawIngredient(ctx, item.ing, x, y, s, prep, t);
  if (item.phase === 'over') {
    ctx.globalAlpha = 0.25 + pulse * 0.2;
    blob(ctx, x, y, s * 0.42, '#a8401a', null);
    ctx.globalAlpha = 1;
  }
  if (item.phase === 'perfect') twinkles(ctx, x, y, s, t);
}

/** The timing dial over a slot: blue while cooking, glowing green when perfect, orange, then smoke. */
function cookRing(ctx, item, x, y, t, r = 24) {
  if (!item) return;
  const p = cookProgress(item);
  const pulse = frame.calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 10);
  const track = 'rgba(255,246,230,0.16)';
  if (item.phase === 'perfect') glow(ctx, x, y, r * 2.6, '95,211,141', 0.35 + pulse * 0.4);
  blob(ctx, x, y, r + 4.5, 'rgba(5,25,29,0.8)', 'rgba(255,246,230,0.55)', 1.5);
  if (item.phase === 'cook' || item.phase === 'chop') {
    ring(ctx, x, y, r, p, p > 0.85 ? PALETTE.gold : PALETTE.blue, 6, track);
  } else if (item.phase === 'perfect') {
    ring(ctx, x, y, r, 1, PALETTE.green, 7, track);
    text(ctx, 'PERFECT', x, y - r - 10, { size: 15, color: '#c9ffd9', align: 'center', line: 4 });
  } else if (item.phase === 'over') {
    ring(ctx, x, y, r, 1, PALETTE.orange, 7, track);
    text(ctx, 'HURRY', x, y - r - 10, { size: 14, color: PALETTE.orange, align: 'center', line: 4 });
  } else if (item.phase === 'flip') {
    ring(ctx, x, y, r, windowLeft(item) / TUNING.sear.flipWindow, PALETTE.gold, 7, track);
    text(ctx, 'FLIP!', x, y - r - 10, { size: 18 + pulse * 3, color: PALETTE.gold, align: 'center', line: 5 });
  } else if (item.phase === 'burnt') {
    ring(ctx, x, y, r, 1, '#55505e', 7, track);
    text(ctx, 'BURNT', x, y - r - 10, { size: 14, color: '#bbbbbb', align: 'center', line: 4 });
  }
}

/** A station's name plate with its hotkey. */
function stationLabel(ctx, name, key, x, y) {
  font(ctx, 14);
  const w = ctx.measureText(name).width + 46;
  panel(ctx, x - w / 2, y - 13, w, 26, { fill: PALETTE.deep, stroke: INK, r: 9, line: 2.5, shadow: false });
  label(ctx, name, x - 12, y + 5, 14, PALETTE.pearl, 'center', 800);
  keycap(ctx, key, x + w / 2 - 15, y, { size: 12 });
}

/** Paints the scallop cutting board (with a sprig of sea-grapes) around (cx, cy). */
function paintShellBoard(c, cx, cy) {
  const shell = () => {
    c.beginPath();
    c.moveTo(cx - 92, cy);
    c.bezierCurveTo(cx - 96, cy - 66, cx + 96, cy - 66, cx + 92, cy);
    c.quadraticCurveTo(cx, cy + 22, cx - 92, cy);
  };
  roundRect(c, cx - 24, cy + 2, 48, 16, 6);
  c.fillStyle = '#efc49c';
  c.fill();
  outline(c, 2.5);
  shell();
  const g = c.createRadialGradient(cx - 34, cy - 44, 6, cx, cy - 12, 112);
  g.addColorStop(0, '#fffbf2');
  g.addColorStop(0.6, '#fbe2c2');
  g.addColorStop(1, '#eab48e');
  c.fillStyle = g;
  c.fill();
  c.save();
  shell();
  c.clip();
  for (let i = -4; i <= 4; i++) {
    c.beginPath();
    c.moveTo(cx, cy + 12);
    c.lineTo(cx + i * 26 - 7, cy - 62);
    c.lineTo(cx + i * 26 + 7, cy - 62);
    c.closePath();
    c.fillStyle = i % 2 ? 'rgba(255,128,92,0.16)' : 'rgba(255,255,255,0.3)';
    c.fill();
  }
  c.strokeStyle = 'rgba(226,106,76,0.42)';
  c.lineWidth = 2.5;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(cx, cy + 10);
    c.lineTo(cx + i * 28, cy - 44 + Math.abs(i) * 6);
    c.stroke();
  }
  shell();
  c.lineWidth = 12;
  c.strokeStyle = 'rgba(150,70,40,0.18)';
  c.stroke();
  c.restore();
  shell();
  outline(c, 3);
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.beginPath();
  c.moveTo(cx - 78, cy - 14);
  c.quadraticCurveTo(cx - 72, cy - 40, cx - 40, cy - 46);
  c.stroke();
  c.lineCap = 'butt';
  drawIngredient(c, 'grape', cx - 60, cy - 10, 26);
}

/** A cleaver resting on the board while nobody chops. */
function restingKnife(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.moveTo(-30, -7);
  ctx.lineTo(8, -8);
  ctx.lineTo(10, 6);
  ctx.quadraticCurveTo(-18, 9, -32, 2);
  ctx.closePath();
  const steel = ctx.createLinearGradient(0, -8, 0, 8);
  steel.addColorStop(0, '#f4fbff');
  steel.addColorStop(1, '#8aa2b3');
  ctx.fillStyle = steel;
  ctx.fill();
  outline(ctx, 2);
  roundRect(ctx, 9, -4, 26, 9, 4);
  ctx.fillStyle = '#8a5a34';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Chopped bits hopping off the board while an arm chops. */
function choppedBits(ctx, ing, x, y, t) {
  ctx.fillStyle = INGREDIENT[ing].color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    const p = (t * 1.8 + k / 6) % 1;
    const dir = k % 2 ? 1 : -1;
    ctx.save();
    ctx.translate(x + dir * (14 + p * (28 + k * 5)), y - Math.sin(p * Math.PI) * (20 + k * 4) + p * 16);
    ctx.rotate(p * 8 * dir);
    ctx.globalAlpha = 1 - p * p;
    ctx.fillRect(-4, -2.5, 8, 5);
    ctx.strokeRect(-4, -2.5, 8, 5);
    ctx.restore();
  }
}

/** The Shell Board: a scallop cutting board; chopping only moves while an arm works it. */
function drawBoard(ctx, state, t) {
  const st = LAYOUT.stations.board;
  const cx = st.x + st.w / 2;
  const cy = st.y + 64;
  contactShadow(ctx, cx + 8, cy + 12, 106, 20, 0.6);
  drawCached(ctx, 'shellBoard', cx - 100, cy - 64, 200, 90, (c) => paintShellBoard(c, 100, 64));
  const item = state.stations.board.slots[0];
  const at = SLOT_TARGETS.board[0];
  const worker = state.arms.find((a) => a.state === 'chop');
  const chopping = item && worker && !frame.calm;
  if (!chopping) restingKnife(ctx, cx + 56, cy - 4);
  if (item) {
    slotFood(ctx, item, at.x, at.y - 6 - (chopping ? Math.abs(Math.sin(t * 14)) * 3 : 0), 44, t);
    if (chopping) choppedBits(ctx, item.ing, at.x, at.y - 8, t);
  }
}

/** The colour of a pot's broth as its food cooks, darker than the food floating in it; an empty pot holds clear water. */
function brothColor(item) {
  if (!item) return '#5fb7c0';
  if (item.phase === 'burnt') return '#3b2a22';
  if (item.phase === 'over') return '#d98a4a';
  if (item.phase === 'perfect') return '#f2c15e';
  return '#4fae9f';
}

/** The liquid in a pot: its colour, a soft sheen and bubbles rolling to the surface (lazily when empty). */
function drawBroth(ctx, item, cx, y, t) {
  const rx = 46;
  const ry = 9;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = brothColor(item);
  ctx.fill();
  ctx.clip();
  const sheen = ctx.createRadialGradient(cx - 14, y - 4, 2, cx, y, rx);
  sheen.addColorStop(0, 'rgba(255,255,255,0.55)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - rx, y - ry, rx * 2, ry * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, y - 3, rx, ry, 0, Math.PI, 0);
  ctx.stroke();
  if (item && item.phase !== 'burnt') {
    const turn = frame.calm ? 0 : t * 1.8;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(176,120,64,0.45)';
    for (const r of [28, 14]) {
      ctx.beginPath();
      ctx.ellipse(cx, y + 1, r, r * 0.18, 0, turn + r, turn + r + 3.4);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  if (item?.phase !== 'burnt') {
    const speed = (!item ? 0.35 : item.phase === 'cook' ? 0.9 : 1.7) * (frame.calm ? 0.3 : 1);
    for (let k = 0; k < (item ? 7 : 3); k++) {
      const p = (t * speed + k * 0.143) % 1;
      const r = 1.5 + p * 4.5;
      ctx.globalAlpha = p < 0.85 ? 1 : (1 - p) / 0.15;
      blob(ctx, cx - 34 + ((k * 23) % 68), y + ((k * 5) % 7) - 3, r, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.9)', 1.2);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** A basalt stove block with a glowing vent mouth. */
function drawStove(ctx, st, heat) {
  const base = st.y + st.h;
  roundRect(ctx, st.x + 12, base - 24, st.w - 24, 24, 8);
  const rock = ctx.createLinearGradient(0, base - 24, 0, base);
  rock.addColorStop(0, '#565062');
  rock.addColorStop(1, '#1f1a26');
  ctx.fillStyle = rock;
  ctx.fill();
  outline(ctx, 2.5);
  roundRect(ctx, st.x + 26, base - 26, st.w - 52, 5, 2.5);
  ctx.fillStyle = `rgba(150,248,255,${0.35 + heat * 0.6})`;
  ctx.fill();
}

/** The pot's food bobbing half-submerged in its broth, clipped to the pot mouth so it never pokes through the front. */
function floatingFood(ctx, item, st, cx, t) {
  const y = st.y + 42 + (frame.calm ? 0 : Math.sin(t * 2.2 + st.x) * 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(st.x, st.y - 40, st.w, 86);
  ctx.moveTo(cx + st.w / 2 - 12, st.y + 46);
  ctx.ellipse(cx, st.y + 46, st.w / 2 - 12, 12, 0, 0, TAU);
  ctx.clip();
  contactShadow(ctx, cx + 6, st.y + 49, 34, 7, 0.55);
  drawIngredient(ctx, item.ing, cx + 4, y, 50, item.phase === 'cook' ? null : item.prep, t);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(cx, st.y + 49, st.w / 2 - 18, 7, 0, 0, Math.PI);
  ctx.fillStyle = brothColor(item);
  ctx.fill();
  ctx.restore();
}

/** The second pot before it is bought: cold and covered on its unlit stove, with a dim Tide Shop tag. */
function drawLockedPot(ctx, st, cx) {
  const base = st.y + st.h;
  drawStove(ctx, st, 0);
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(st.x + 14, st.y + 50);
  ctx.lineTo(st.x + 20, base - 22);
  ctx.quadraticCurveTo(cx, base - 8, st.x + st.w - 20, base - 22);
  ctx.lineTo(st.x + st.w - 14, st.y + 50);
  ctx.closePath();
  const body = ctx.createLinearGradient(st.x + 14, 0, st.x + st.w - 14, 0);
  body.addColorStop(0, '#103234');
  body.addColorStop(0.25, '#3f7b78');
  body.addColorStop(0.7, '#1f4f4f');
  body.addColorStop(1, '#0a2424');
  ctx.fillStyle = body;
  ctx.fill();
  outline(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(st.x + 8, st.y + 54);
  ctx.quadraticCurveTo(cx, st.y + 2, st.x + st.w - 8, st.y + 54);
  ctx.closePath();
  ctx.fillStyle = verticalGradient(ctx, st.y + 20, st.y + 54, ['#5f9690', '#2a5a58', '#163a3a']);
  ctx.fill();
  outline(ctx, 3);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(220,255,250,0.35)';
  ctx.beginPath();
  ctx.moveTo(st.x + 24, st.y + 46);
  ctx.quadraticCurveTo(st.x + 34, st.y + 32, cx - 10, st.y + 27);
  ctx.stroke();
  ctx.lineCap = 'butt';
  blob(ctx, cx, st.y + 24, 7, '#8a6a3a', INK, 2.5);
  ctx.restore();
  font(ctx, 12);
  const w = ctx.measureText('Tide Shop').width + 20;
  panel(ctx, cx - w / 2, st.y + 82, w, 20, { fill: 'rgba(10,30,36,0.85)', stroke: 'rgba(255,209,102,0.5)', r: 7, line: 1.5, shadow: false });
  label(ctx, 'Tide Shop', cx, st.y + 96, 12, 'rgba(255,209,102,0.7)', 'center', 800);
}

/** A Bubble Pot on its vent stove; it burns twice as fast with no arm stirring. */
function drawPot(ctx, state, id, t) {
  const st = LAYOUT.stations[id];
  const cx = st.x + st.w / 2;
  const base = st.y + st.h;
  const station = state.stations[id];
  contactShadow(ctx, cx + 6, base, 74, 13, 0.65);
  if (station.locked) {
    drawLockedPot(ctx, st, cx);
    return;
  }
  const item = station.slots[0];
  const pulse = frame.calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 4 + st.x);
  const heat = !item ? 0.15 : item.phase === 'burnt' ? 0.1 : 0.75 + pulse * 0.25;
  drawStove(ctx, st, heat);
  glow(ctx, cx, base - 22, 70, '127,240,255', 0.12 + heat * 0.4, 20);
  ctx.beginPath();
  ctx.moveTo(st.x + 12, st.y + 46);
  ctx.lineTo(st.x + 18, base - 22);
  ctx.quadraticCurveTo(cx, base - 8, st.x + st.w - 18, base - 22);
  ctx.lineTo(st.x + st.w - 12, st.y + 46);
  ctx.closePath();
  const body = ctx.createLinearGradient(st.x + 12, 0, st.x + st.w - 12, 0);
  body.addColorStop(0, '#15565a');
  body.addColorStop(0.22, '#63c7bc');
  body.addColorStop(0.4, '#3a9c98');
  body.addColorStop(0.78, '#1d6b66');
  body.addColorStop(1, '#0c3838');
  ctx.fillStyle = body;
  ctx.fill();
  const depth = ctx.createLinearGradient(0, st.y + 60, 0, base - 10);
  depth.addColorStop(0, 'rgba(0,12,14,0)');
  depth.addColorStop(1, 'rgba(0,12,14,0.4)');
  ctx.fillStyle = depth;
  ctx.fill();
  outline(ctx, 3);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#c99a4b';
  ctx.beginPath();
  ctx.moveTo(st.x + 14, st.y + 64);
  ctx.quadraticCurveTo(cx, st.y + 74, st.x + st.w - 14, st.y + 64);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.moveTo(st.x + 28, st.y + 76);
  ctx.lineTo(st.x + 31, base - 36);
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (const side of [-1, 1]) {
    roundRect(ctx, cx + side * (st.w / 2 - 6) - 8, st.y + 54, 16, 10, 4);
    ctx.fillStyle = '#c99a4b';
    ctx.fill();
    outline(ctx, 2.5);
  }
  oval(ctx, cx, st.y + 46, st.w / 2 - 10, 14, '#0e3a39', INK, 3);
  drawBroth(ctx, item, cx, st.y + 48, t);
  if (item && item.phase !== 'burnt') floatingFood(ctx, item, st, cx, t);
  if (item) {
    if (item.phase === 'perfect') glow(ctx, cx, st.y + 44, 76, '255,209,102', 0.35 + pulse * 0.35, 30);
    else if (item.phase === 'over') glow(ctx, cx, st.y + 44, 72, '255,110,40', 0.25 + pulse * 0.3, 28);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(200,255,245,0.6)';
  ctx.beginPath();
  ctx.ellipse(cx, st.y + 46, st.w / 2 - 13, 11.5, 0, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  if (item) {
    if (item.phase === 'burnt') smoke(ctx, cx, st.y + 36, t);
    else {
      steam(ctx, cx - 14, st.y + 40, t, 3, 10, 58, 0.34);
      steam(ctx, cx + 16, st.y + 38, t + 0.7, 2, 10, 50, 0.28);
      wisps(ctx, cx + 4, st.y + 34, t, 2, 46);
    }
    if (item.phase === 'perfect') twinkles(ctx, cx, st.y + 40, 70, t);
  }
}

/** Magma cracks in the Vent Grill rock, as offsets from the station's corner. */
const CRACKS = [
  [[14, 74], [44, 62], [66, 80], [104, 66], [136, 84], [176, 70]],
  [[26, 94], [52, 86], [78, 97]],
  [[116, 95], [146, 89], [168, 97]],
];

/** The Vent Grill: a hydrothermal vent of basalt with magma cracks, two slots that each need a flip. */
function drawGrill(ctx, state, t) {
  const st = LAYOUT.stations.grill;
  const cx = st.x + st.w / 2;
  const slots = state.stations.grill.slots;
  const busy = slots.some((s) => s && s.phase !== 'burnt');
  const pulse = frame.calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3);
  const heat = (busy ? 0.7 : 0.3) + pulse * 0.3;
  contactShadow(ctx, cx + 6, st.y + st.h - 2, 114, 16, 0.65);
  ctx.beginPath();
  ctx.moveTo(st.x + 2, st.y + st.h - 14);
  ctx.quadraticCurveTo(st.x - 4, st.y + 40, st.x + 22, st.y + 28);
  ctx.quadraticCurveTo(cx - 30, st.y + 16, cx + 6, st.y + 24);
  ctx.quadraticCurveTo(st.x + st.w - 10, st.y + 18, st.x + st.w - 2, st.y + 44);
  ctx.quadraticCurveTo(st.x + st.w + 4, st.y + st.h - 18, st.x + st.w - 12, st.y + st.h - 6);
  ctx.quadraticCurveTo(cx, st.y + st.h + 2, st.x + 2, st.y + st.h - 14);
  ctx.closePath();
  const rock = ctx.createLinearGradient(st.x, st.y + 20, st.x + st.w * 0.6, st.y + st.h + 30);
  rock.addColorStop(0, '#6c5c72');
  rock.addColorStop(0.5, '#3a2f40');
  rock.addColorStop(1, '#1a1420');
  ctx.fillStyle = rock;
  ctx.fill();
  outline(ctx, 3);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const [width, rgb, a] of [[11, '255,80,20', 0.3], [5, '255,140,50', 0.65], [2, '255,236,170', 0.95]]) {
    ctx.strokeStyle = `rgba(${rgb},${Math.min(1, a * heat)})`;
    ctx.lineWidth = width;
    for (const crack of CRACKS) {
      ctx.beginPath();
      for (const [dx, dy] of crack) ctx.lineTo(st.x + dx, st.y + dy);
      ctx.stroke();
    }
  }
  ctx.restore();
  roundRect(ctx, st.x + 8, st.y + 14, st.w - 16, 40, 10);
  ctx.fillStyle = '#1e1822';
  ctx.fill();
  outline(ctx, 3);
  for (let x = st.x + 20; x < st.x + st.w - 14; x += 16) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0c080e';
    ctx.beginPath();
    ctx.moveTo(x, st.y + 20);
    ctx.lineTo(x, st.y + 48);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(255,186,120,${0.25 + heat * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, st.y + 21);
    ctx.lineTo(x - 1.5, st.y + 47);
    ctx.stroke();
  }
  glow(ctx, cx, st.y + 36, 112, '255,110,40', 0.12 + heat * 0.3, 34);
  if (busy && !frame.calm) {
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.7 + k / 3) % 1;
      const y = st.y + 6 - p * 46;
      ctx.strokeStyle = `rgba(255,232,200,${0.2 * Math.sin(p * Math.PI)})`;
      ctx.beginPath();
      for (let x = st.x + 34; x <= st.x + st.w - 34; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + t * 6 + k) * 3);
      ctx.stroke();
    }
  }
  slots.forEach((item, i) => {
    const at = SLOT_TARGETS.grill[i];
    if (!item) return;
    contactShadow(ctx, at.x + 3, at.y - 2, 32, 7, 0.6);
    slotFood(ctx, item, at.x, at.y - 18, 68, t, true);
    if (item.phase === 'burnt') return;
    juices(ctx, at.x, at.y - 2, t + i * 0.9);
    if (!frame.calm) sizzle(ctx, at.x, at.y - 22, t + i * 0.4);
  });
}

/** Glossy juices bubbling out around grilled food. */
function juices(ctx, x, y, t) {
  for (let k = 0; k < 4; k++) {
    const p = frame.calm ? 0.5 : (t * 0.9 + k * 0.27) % 1;
    const jx = x + (k - 1.5) * 15;
    const r = 2.5 + Math.sin(p * Math.PI) * 2.5;
    blob(ctx, jx, y + (k % 2) * 3, r, 'rgba(255,196,110,0.9)', 'rgba(90,40,10,0.6)', 1);
    blob(ctx, jx - r * 0.35, y + (k % 2) * 3 - r * 0.35, r * 0.35, 'rgba(255,255,240,0.95)', null);
  }
}

/** One woven steamer basket with a window onto its food. */
function drawBasket(ctx, st, y, item, at, t) {
  const weave = ctx.createLinearGradient(st.x + 6, 0, st.x + st.w - 6, 0);
  weave.addColorStop(0, '#8d6034');
  weave.addColorStop(0.25, '#e4bf80');
  weave.addColorStop(0.6, '#c79a5e');
  weave.addColorStop(1, '#74492b');
  roundRect(ctx, st.x + 6, y, st.w - 12, 86, 14);
  ctx.fillStyle = weave;
  ctx.fill();
  outline(ctx, 3);
  for (let k = 1; k < 4; k++) {
    ctx.fillStyle = 'rgba(90,56,28,0.55)';
    ctx.fillRect(st.x + 9, y + k * 21 - 1, st.w - 18, 2);
    ctx.fillStyle = 'rgba(255,238,196,0.35)';
    ctx.fillRect(st.x + 9, y + k * 21 + 1, st.w - 18, 1.5);
  }
  ctx.fillStyle = 'rgba(255,240,206,0.5)';
  ctx.fillRect(st.x + 18, y + 3, st.w - 36, 2);
  roundRect(ctx, st.x + 22, y + 14, st.w - 44, 58, 12);
  const inside = ctx.createLinearGradient(0, y + 14, 0, y + 72);
  inside.addColorStop(0, 'rgba(18,12,8,0.92)');
  inside.addColorStop(1, 'rgba(70,48,28,0.85)');
  ctx.fillStyle = inside;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(59,42,77,0.8)';
  ctx.stroke();
  slotFood(ctx, item, at.x - 16, at.y - 4, 54, t);
  if (item && item.phase !== 'burnt') puff(ctx, at.x - 16 + Math.sin(t * 0.8) * 10, at.y - 14, 40, '255,255,255', 0.18, 22);
}

/** The Kelp Steamer: two woven baskets stacked under a lid that rattles and puffs steam. */
function drawSteamer(ctx, state, t) {
  const st = LAYOUT.stations.steamer;
  const cx = st.x + st.w / 2;
  const slots = state.stations.steamer.slots;
  const steaming = slots.some((s) => s && s.phase !== 'burnt');
  contactShadow(ctx, cx + 6, st.y + st.h + 4, 88, 13, 0.65);
  ctx.save();
  ctx.translate(cx, st.y + 30);
  if (steaming && !frame.calm) {
    ctx.translate(0, -Math.abs(Math.sin(t * 9)) * 2);
    ctx.rotate(Math.sin(t * 17) * 0.02);
  }
  const half = st.w / 2 - 10;
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.quadraticCurveTo(0, -40, half, 0);
  ctx.closePath();
  const lid = ctx.createLinearGradient(0, -22, 0, 0);
  lid.addColorStop(0, '#e8c48c');
  lid.addColorStop(1, '#94683a');
  ctx.fillStyle = lid;
  ctx.fill();
  outline(ctx, 3);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(110,74,47,0.55)';
  for (const f of [0.3, 0.6]) {
    const hw = half * Math.sqrt(1 - f);
    ctx.beginPath();
    ctx.moveTo(-hw, -20 * f);
    ctx.quadraticCurveTo(0, -20 * f - 5, hw, -20 * f);
    ctx.stroke();
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,244,214,0.6)';
  ctx.beginPath();
  ctx.moveTo(-half + 12, -5);
  ctx.quadraticCurveTo(-half * 0.55, -17, -18, -19);
  ctx.stroke();
  blob(ctx, 0, -22, 8, '#8a5a34', INK, 2.5);
  blob(ctx, -2.5, -24.5, 2.5, 'rgba(255,240,210,0.7)', null);
  ctx.restore();
  slots.forEach((item, i) => drawBasket(ctx, st, st.y + 32 + i * 96, item, SLOT_TARGETS.steamer[i], t));
  if (steaming) {
    wisps(ctx, cx, st.y - 6, t, 3, 54);
    steam(ctx, cx, st.y - 2, t, 4, 22, 84, 0.45);
    steam(ctx, st.x + 20, st.y + 26, t + 0.4, 2, 8, 40, 0.3);
    steam(ctx, st.x + st.w - 20, st.y + 26, t + 1.1, 2, 8, 40, 0.3);
  }
}

/** Every station, back to front, over the soft shadows that ground them and Octavia. */
export function drawStations(ctx, state, t) {
  const o = LAYOUT.octavia;
  contactShadow(ctx, o.x + 26, o.y + 36, 120, 110, 0.3);
  contactShadow(ctx, o.x + 10, LAYOUT.counterTop + 6, 150, 14, 0.35);
  drawBoard(ctx, state, t);
  drawPot(ctx, state, 'pot0', t);
  drawPot(ctx, state, 'pot1', t);
  drawGrill(ctx, state, t);
  drawSteamer(ctx, state, t);
}

/** Paints the Clam Plate's open upper shell: deep teal nacre inside, ribbed and rimmed, so pale dishes stand out. */
function paintClamLid(c, x, y, w) {
  const lid = () => {
    c.beginPath();
    c.moveTo(x - w / 2, y - 6);
    c.bezierCurveTo(x - w / 2, y - 92, x + w / 2, y - 92, x + w / 2, y - 6);
    c.closePath();
  };
  lid();
  const inner = c.createRadialGradient(x - 30, y - 60, 6, x, y - 20, w / 2 + 10);
  inner.addColorStop(0, '#e6d6ff');
  inner.addColorStop(0.3, '#8f74cf');
  inner.addColorStop(0.7, '#3f2f7a');
  inner.addColorStop(1, '#251a4e');
  c.fillStyle = inner;
  c.fill();
  c.save();
  lid();
  c.clip();
  for (let i = -5; i <= 5; i++) {
    c.beginPath();
    c.moveTo(x, y - 4);
    c.lineTo(x + i * 26 - 8, y - 80 + Math.abs(i) * 6);
    c.lineTo(x + i * 26 + 8, y - 80 + Math.abs(i) * 6);
    c.closePath();
    c.fillStyle = i % 2 ? 'rgba(4,24,40,0.22)' : 'rgba(200,255,246,0.14)';
    c.fill();
  }
  const sheen = c.createLinearGradient(x - w / 2, y - 80, x + w / 2, y);
  sheen.addColorStop(0.2, 'rgba(160,255,240,0)');
  sheen.addColorStop(0.4, 'rgba(160,255,240,0.22)');
  sheen.addColorStop(0.55, 'rgba(255,190,240,0.2)');
  sheen.addColorStop(0.75, 'rgba(255,190,240,0)');
  c.fillStyle = sheen;
  c.fillRect(x - w / 2, y - 92, w, 92);
  lid();
  c.lineWidth = 12;
  c.strokeStyle = 'rgba(70,40,120,0.16)';
  c.stroke();
  c.restore();
  lid();
  outline(c, 3);
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.beginPath();
  c.moveTo(x - w / 2 + 14, y - 26);
  c.quadraticCurveTo(x - w / 2 + 22, y - 66, x - 40, y - 74);
  c.stroke();
  c.lineCap = 'butt';
}

/** Dish sizes on the Clam Plate for the wide vessels, so the dark bed still frames them; bowls and cups use 278. */
const PLATE_SIZE = { kelpRoll: 260, toast: 260, skewer: 260, platter: 222 };

/** The Clam Plate: an open giant clam holding the dish being assembled. */
export function drawClamPlate(ctx, state, t) {
  const { x, y, w } = LAYOUT.plate;
  const plate = state.plate;
  const pulse = frame.calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 4);
  contactShadow(ctx, x + 10, y + 18, w / 2 + 28, 26, 0.65);
  drawCached(ctx, 'clamLid', x - w / 2 - 4, y - 96, w + 8, 96, (c) => paintClamLid(c, w / 2 + 4, 96, w));
  if (plate.recipeId) glow(ctx, x, y - 26, w * 0.42, '255,214,120', 0.1 + pulse * 0.08, 40);
  const lip = ctx.createLinearGradient(0, y - 24, 0, y + 36);
  lip.addColorStop(0, '#f8f0ff');
  lip.addColorStop(0.5, '#b9a6ea');
  lip.addColorStop(1, '#5d47a4');
  oval(ctx, x, y + 6, w / 2 + 6, 30, lip, INK, 3);
  const bed = ctx.createRadialGradient(x - 20, y - 2, 6, x, y + 6, w / 2);
  bed.addColorStop(0, '#5a4a9e');
  bed.addColorStop(0.6, '#2b2160');
  bed.addColorStop(1, '#160f36');
  oval(ctx, x, y + 4, w / 2 - 8, 22, bed, 'rgba(10,6,30,0.8)', 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(200,255,246,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, w / 2 - 14, 17, 0, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  if (plate.recipeId) {
    oval(ctx, x + 4, y + 14, 104, 15, 'rgba(0,10,18,0.5)', null);
    drawDish(ctx, plate.recipeId, x, y - 12, PLATE_SIZE[plate.recipeId] ?? 278, plate.parts, false);
    if (plate.parts.some((part) => part.prep !== 'raw' && part.prep !== 'chop')) {
      steam(ctx, x - 20, y - 52, t, 3, 10, 54, 0.3);
      wisps(ctx, x - 8, y - 56, t, 3, 54);
    }
    glint(ctx, x - 58, y - 30, t);
    glint(ctx, x + 50, y - 44, t + 1.7);
  } else {
    label(ctx, 'Hold food, then press Space', x, y + 10, 13, 'rgba(220,250,245,0.85)', 'center', 800);
  }
  const lw = 196;
  panel(ctx, x - lw / 2, y + 26, lw, 26, { fill: PALETTE.deep, stroke: INK, r: 9, line: 2.5, shadow: false });
  label(ctx, 'CLAM PLATE', x - 20, y + 44, 14, PALETTE.pearl, 'center', 800);
  keycap(ctx, 'Space', x + 58, y + 39, { size: 12 });
  if (plate.recipeId) oval(ctx, x, y + 6, w / 2 + 12, 34, null, `rgba(255,209,102,${0.3 + pulse * 0.35})`, 3);
}

/** A row of coral silhouettes along a baseline: branches, fans and brain corals in the given colours. */
function paintCorals(c, w, base, colors, scale, seed) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  c.lineCap = 'round';
  for (let x = -10; x < w + 20; x += 30 * scale) {
    const kind = Math.floor(rnd() * 3);
    const h = (30 + rnd() * 40) * scale;
    const color = colors[Math.floor(rnd() * colors.length)];
    c.fillStyle = color;
    c.strokeStyle = color;
    if (kind === 0) {
      c.lineWidth = 6 * scale;
      c.beginPath();
      c.moveTo(x, base);
      c.lineTo(x, base - h);
      c.moveTo(x, base - h * 0.45);
      c.lineTo(x - 12 * scale, base - h * 0.8);
      c.moveTo(x, base - h * 0.6);
      c.lineTo(x + 13 * scale, base - h * 0.95);
      c.stroke();
    } else if (kind === 1) {
      c.beginPath();
      c.ellipse(x, base, 20 * scale, h * 0.8, 0, Math.PI, 0);
      c.fill();
    } else {
      c.beginPath();
      c.arc(x, base, 14 * scale, Math.PI, 0);
      c.fill();
    }
  }
  c.lineCap = 'butt';
}

/** Paints the reef seen through the Current Window for a mood: water, sunlight, hazy and near corals, sand. */
function paintReef(c, mood, w, h) {
  c.fillStyle = verticalGradient(c, 0, h, mood.reef);
  c.fillRect(0, 0, w, h);
  const sun = c.createRadialGradient(w * 0.3, -40, 10, w * 0.3, -40, h * 0.9);
  sun.addColorStop(0, 'rgba(255,255,236,0.5)');
  sun.addColorStop(1, 'rgba(255,255,236,0)');
  c.fillStyle = sun;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(10 + i * 60, 0);
    c.lineTo(40 + i * 60, 0);
    c.lineTo(90 + i * 60, h);
    c.lineTo(40 + i * 60, h);
    c.fill();
  }
  paintCorals(c, w, h - 110, ['rgba(255,255,255,0.12)'], 0.8, 3);
  paintCorals(c, w, h - 40, ['rgba(255,122,140,0.6)', 'rgba(255,170,90,0.55)', 'rgba(190,140,255,0.55)', 'rgba(120,230,200,0.5)'], 1, 17);
  const sand = c.createLinearGradient(0, h - 44, 0, h);
  sand.addColorStop(0, 'rgba(244,216,166,0.35)');
  sand.addColorStop(1, 'rgba(244,216,166,0.8)');
  c.fillStyle = sand;
  c.fillRect(0, h - 44, w, 44);
  paintCorals(c, w, h + 6, ['rgba(0,22,30,0.5)'], 1.3, 29);
}

/** Paints the Current Window's wooden hatch frame with its brass trim and name plaque. */
function paintPassFrame(c) {
  const p = LAYOUT.pass;
  c.translate(8 - p.x, 8 - p.y);
  const wood = c.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
  wood.addColorStop(0, '#a6744a');
  wood.addColorStop(0.5, '#7a5233');
  wood.addColorStop(1, '#4a301e');
  c.save();
  c.shadowColor = 'rgba(0,10,14,0.6)';
  c.shadowBlur = 14;
  c.shadowOffsetX = 4;
  c.shadowOffsetY = 6;
  roundRect(c, p.x, p.y, p.w, p.h, 24);
  c.fillStyle = wood;
  c.fill();
  c.restore();
  outline(c, 4);
  c.lineWidth = 1;
  for (let x = p.x + 10; x < p.x + p.w - 6; x += 9) {
    c.strokeStyle = `rgba(40,20,8,${0.12 + (x % 3) * 0.05})`;
    c.beginPath();
    c.moveTo(x, p.y + 8);
    c.lineTo(x + Math.sin(x) * 3, p.y + p.h - 8);
    c.stroke();
  }
  roundRect(c, p.x + 5, p.y + 5, p.w - 10, p.h - 10, 20);
  c.lineWidth = 2.5;
  c.strokeStyle = '#d9ab5c';
  c.stroke();
  roundRect(c, p.x + 6, p.y + 38, p.w - 12, p.h - 46, 20);
  c.fillStyle = '#1a100a';
  c.fill();
  const plaque = c.createLinearGradient(0, p.y + 9, 0, p.y + 35);
  plaque.addColorStop(0, '#ffe2a0');
  plaque.addColorStop(1, '#b4843c');
  roundRect(c, p.x + 18, p.y + 9, p.w - 36, 26, 9);
  c.fillStyle = plaque;
  c.fill();
  outline(c, 2);
  label(c, 'CURRENT WINDOW', p.x + p.w / 2, p.y + 27, 14, INK, 'center', 900);
}

/** A wooden shelf across the hatch from y: its top is the ledge a plate rests on, its front carries that plate's labels. */
function drawShelf(ctx, rect, y) {
  ctx.fillStyle = cachedGradient(ctx, 'shelf', () => {
    const g = ctx.createLinearGradient(0, 0, 0, 44);
    g.addColorStop(0, '#d39a5e');
    g.addColorStop(0.13, '#9a6a40');
    g.addColorStop(0.16, '#5e3b22');
    g.addColorStop(1, '#43291a');
    return g;
  });
  ctx.save();
  ctx.translate(0, y);
  ctx.fillRect(rect.x, 0, rect.w, 44);
  ctx.fillStyle = 'rgba(255,240,206,0.7)';
  ctx.fillRect(rect.x, 0, rect.w, 1.5);
  ctx.fillStyle = INK;
  ctx.fillRect(rect.x, 6, rect.w, 1.5);
  ctx.fillRect(rect.x, 42, rect.w, 2);
  ctx.restore();
}

/** The red ORDER UP! ribbon pinned to the hatch frame's top-left corner at (x, y), its tail flapping toward the kitchen. */
function orderUpRibbon(ctx, x, y, t) {
  const w = 100;
  const h = 23;
  const flap = frame.calm ? 0 : Math.sin(t * 3.2) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.05);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(-w, flap);
  ctx.lineTo(-w + 12, h / 2 + flap);
  ctx.lineTo(-w, h + flap);
  ctx.lineTo(4, h);
  ctx.closePath();
  ctx.fillStyle = verticalGradient(ctx, 0, h, ['#ff8f74', '#e2412f', '#a3241b']);
  ctx.fill();
  outline(ctx, 2.5);
  ctx.fillStyle = 'rgba(255,236,220,0.45)';
  ctx.fillRect(-w + 12, 3 + flap * 0.6, w - 10, 2);
  text(ctx, 'ORDER UP!', -w / 2 + 4, h / 2 + 5, { size: 14, color: PALETTE.gold, align: 'center', line: 3.5 });
  blob(ctx, -3, h / 2, 4, '#f4d8a6', INK, 1.5);
  ctx.restore();
}

/** The Current Window: a hatch onto the reef with diners behind their plates, each plate's labels on its shelf, an ORDER UP! ribbon and the front diner's voice. */
export function drawPass(ctx, state, t) {
  const p = LAYOUT.pass;
  const mood = frame.mood;
  const calm = frame.calm;
  const rect = { x: p.x + 8, y: p.y + 40, w: p.w - 16, h: p.h - 50 };
  drawCached(ctx, 'passFrame', p.x - 8, p.y - 8, p.w + 16, p.h + 18, paintPassFrame);
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
  ctx.clip();
  drawCached(ctx, `reef:${MOODS.indexOf(mood)}`, rect.x, rect.y, rect.w, rect.h, (c) => paintReef(c, mood, rect.w, rect.h));
  for (let i = 0; i < 3; i++) {
    const fx = rect.x - 30 + ((t * (14 + i * 6) + i * 90) % (rect.w + 60));
    const fy = rect.y + rect.h - 150 + i * 34 + Math.sin(t * 1.5 + i) * 6;
    ctx.fillStyle = 'rgba(0,20,30,0.28)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 10, 4.5, 0, 0, TAU);
    ctx.moveTo(fx - 8, fy);
    ctx.lineTo(fx - 16, fy - 5);
    ctx.lineTo(fx - 16, fy + 5);
    ctx.fill();
  }
  drawWindowDiners(ctx, state, t, rect);
  const slots = state.upgrades.biggerPlate ? TUNING.biggerPassSlots : TUNING.passSlots;
  for (let i = 0; i < slots; i++) drawShelf(ctx, rect, slotPoint(i).y + 20);
  ctx.restore();
  let orderUp = false;
  for (let i = 0; i < slots; i++) {
    const { x, y } = slotPoint(i);
    const plate = state.pass[i];
    if (!plate) {
      oval(ctx, x, y + 10, 58, 12, 'rgba(255,246,230,0.1)', 'rgba(255,246,230,0.4)', 2);
      text(ctx, 'empty', x, y + 46, { size: 13, color: 'rgba(255,246,230,0.6)', align: 'center', line: 3 });
      continue;
    }
    const front = i === 0;
    const pulse = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 4 + i);
    const ticket = ticketForPlate(state, plate);
    orderUp ||= front && !!ticket;
    glow(ctx, x, y - 2, front ? 100 : 86, '255,190,90', 0.24 + pulse * 0.2, 40);
    drawFinishedDish(ctx, plate.recipeId, x, y - 4, front ? 150 : 134);
    steam(ctx, x - 18, y - 24, t + i, 3, 8, 50, 0.4);
    wisps(ctx, x - 6, y - 26, t + i * 0.37, 3, 40);
    glint(ctx, x - 34, y - 18, t + i);
    text(ctx, RECIPE[plate.recipeId].name, x, y + 40, { size: 13, color: PALETTE.pearl, align: 'center', line: 3, maxWidth: rect.w - 12 });
    const warm = plate.warmth / plate.maxWarmth;
    ctx.fillStyle = 'rgba(5,25,29,0.75)';
    roundRect(ctx, rect.x + 10, y + 44, rect.w - 20, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = warm > 0.35 ? PALETTE.coral : '#9fc7d6';
    roundRect(ctx, rect.x + 10, y + 44, (rect.w - 20) * warm, 5, 2.5);
    ctx.fill();
    const who = ticket ? `${CUSTOMERS[ticket.customerId].name.split(' ').pop()} #${ticket.id}` : 'nobody ordered';
    if (front && ticket) keycap(ctx, 'S', rect.x + 14, y + 57, { size: 11, fill: PALETTE.gold });
    const line = !ticket ? who : front ? `serve to ${who}` : `for ${who}`;
    text(ctx, line, rect.x + 26, y + 61, { size: 12, color: ticket ? PALETTE.pearl : PALETTE.orange, line: 3, maxWidth: rect.w - 50 });
    if (ticket) {
      const share = patienceShare(ticket);
      blob(ctx, rect.x + rect.w - 13, y + 57, 9, 'rgba(5,25,29,0.85)', null);
      ring(ctx, rect.x + rect.w - 13, y + 57, 6.5, share, share > 0.5 ? PALETTE.green : share > 0.25 ? PALETTE.gold : PALETTE.red, 3);
    }
  }
  if (orderUp) orderUpRibbon(ctx, p.x + 16, p.y + 14, t);
  drawWindowSpeech(ctx, state, rect);
}

/** Paints one ingredient crate: food heaped above the rim, slatted front and a name tag with its hotkey. */
function paintCrate(c, ing, w, h) {
  c.translate(4, 6);
  const cx = w / 2;
  roundRect(c, 5, 30, w - 10, 30, 6);
  c.fillStyle = '#3a2414';
  c.fill();
  c.fillStyle = ing.color;
  c.globalAlpha = 0.4;
  c.fill();
  c.globalAlpha = 1;
  for (const [dx, dy, s] of [[-26, 48, 34], [26, 48, 34], [-13, 38, 38], [14, 36, 38], [0, 22, 40]]) drawIngredient(c, ing.id, cx + dx, dy, s);
  const slats = c.createLinearGradient(0, 56, 0, h);
  slats.addColorStop(0, '#b07a44');
  slats.addColorStop(1, '#6e4628');
  roundRect(c, 2, 56, w - 4, h - 58, 8);
  c.fillStyle = slats;
  c.fill();
  outline(c, 3);
  c.fillStyle = 'rgba(40,20,8,0.35)';
  c.fillRect(5, 59, 9, h - 64);
  c.fillRect(w - 14, 59, 9, h - 64);
  roundRect(c, 0, 52, w, 10, 4);
  c.fillStyle = '#d19a5e';
  c.fill();
  c.lineWidth = 2.5;
  c.stroke();
  c.fillStyle = 'rgba(255,244,214,0.6)';
  c.fillRect(4, 53.5, w - 8, 1.5);
  roundRect(c, 10, 74, w - 20, 50, 7);
  c.fillStyle = '#fff3dc';
  c.fill();
  outline(c, 2);
  const words = ing.name.split(/[ -]/);
  const lines = ing.name.length > 11 ? [words.slice(0, -1).join(ing.name.includes('-') ? '-' : ' '), words[words.length - 1]] : [ing.name];
  lines.forEach((line, k) => {
    text(c, line, cx, 94 + k * 18 + (lines.length === 1 ? 9 : 0), { size: 15, color: INK, outline: null, align: 'center', maxWidth: w - 26 });
  });
  keycap(c, ing.key, 17, 15, { size: 14, fill: PALETTE.gold });
}

/** The ten ingredient crates on the counter ledge, each with its name and hotkey. */
export function drawBins(ctx, t, hover = null) {
  const b = LAYOUT.bins;
  INGREDIENTS.forEach((ing, i) => {
    const x = b.x + i * (b.w + b.gap);
    const lifted = hover === i ? -4 : 0;
    contactShadow(ctx, x + b.w / 2 + 4, b.y + b.h - 3, b.w * 0.58, 8, 0.7);
    drawCached(ctx, `crate:${ing.id}`, x - 4, b.y - 6 + lifted, b.w + 8, b.h + 10, (c) => paintCrate(c, ing, b.w, b.h));
  });
}

/** The ink jar that takes burnt food, mistakes and unwanted plates. */
export function drawTrash(ctx) {
  const tr = LAYOUT.trash;
  const cx = tr.x + tr.w / 2;
  contactShadow(ctx, cx + 4, tr.y + 68, 40, 8, 0.6);
  roundRect(ctx, tr.x + 8, tr.y + 14, tr.w - 16, 54, 14);
  const jar = ctx.createLinearGradient(tr.x + 8, 0, tr.x + tr.w - 8, 0);
  jar.addColorStop(0, '#3a2a4e');
  jar.addColorStop(0.3, '#7d62a0');
  jar.addColorStop(1, '#2a1d3a');
  ctx.fillStyle = jar;
  ctx.fill();
  outline(ctx, 3);
  oval(ctx, cx, tr.y + 16, tr.w / 2 - 6, 9, '#1c1228', INK, 3);
  blob(ctx, cx - 14, tr.y + 34, 4, 'rgba(255,255,255,0.35)', null);
  label(ctx, 'BIN', cx, tr.y + 50, 14, PALETTE.pearl, 'center', 900);
  keycap(ctx, 'Bksp', cx, tr.y + 78, { size: 11 });
}

const gradients = new Map();

/** A gradient made once with the main context and reused every frame. */
function cachedGradient(ctx, key, make) {
  if (!gradients.has(key)) gradients.set(key, make());
  return gradients.get(key);
}

/** Swaying wedges of light falling from the surface, slanting away from the top-left key light. */
function drawRays(ctx, mood, t) {
  ctx.fillStyle = cachedGradient(ctx, `ray:${mood.ray}`, () => {
    const g = ctx.createLinearGradient(0, 0, 0, 680);
    g.addColorStop(0, `rgba(${mood.ray},1)`);
    g.addColorStop(1, `rgba(${mood.ray},0)`);
    return g;
  });
  for (let i = 0; i < 5; i++) {
    const top = 120 + i * 240;
    const sway = Math.sin(t * 0.25 + i * 1.3) * 34;
    const wTop = 46 + (i % 3) * 22;
    const wBot = 190 + (i % 2) * 90;
    ctx.globalAlpha = mood.rays * (0.55 + 0.45 * Math.sin(t * 0.4 + i * 2.1));
    ctx.beginPath();
    ctx.moveTo(top - wTop / 2, -20);
    ctx.lineTo(top + wTop / 2, -20);
    ctx.lineTo(top + 230 + sway + wBot / 2, 680);
    ctx.lineTo(top + 230 + sway - wBot / 2, 680);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Marine snow sinking and swaying; on Moon Tide, glowing plankton too. */
function drawSnow(ctx, mood, t) {
  ctx.fillStyle = `rgba(${mood.snow},0.5)`;
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const y = ((i * 211.3 + t * (6 + (i % 7) * 2)) % 820) - 10;
    const x = (i * 389.7 + Math.sin(t * 0.4 + i) * 14 + 1280) % 1280;
    const r = 0.8 + (i % 4) * 0.45;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  if (!mood.moon) return;
  for (let i = 0; i < 30; i++) {
    const x = (i * 271.1 + Math.sin(t * 0.3 + i * 1.7) * 30 + 1280) % 1280;
    const y = 160 + ((i * 97.3 + t * (3 + (i % 3))) % 480);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
    const rgb = i % 3 ? '110,240,255' : '210,150,255';
    glow(ctx, x, y, 14, rgb, 0.35 + pulse * 0.5);
    blob(ctx, x, y, 1.8, `rgba(${rgb},0.95)`, null);
  }
}

/** Moon Tide's pale moonbeam slanting from the porthole down across the shelf and counter. */
function drawMoonbeam(ctx, t) {
  const { x, y } = LAYOUT.porthole;
  ctx.fillStyle = cachedGradient(ctx, 'moonbeam', () => {
    const g = ctx.createLinearGradient(x, y, x + 230, y + 380);
    g.addColorStop(0, 'rgba(200,214,255,0.42)');
    g.addColorStop(1, 'rgba(200,214,255,0)');
    return g;
  });
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 0.7);
  ctx.beginPath();
  ctx.moveTo(x - 46, y + 44);
  ctx.lineTo(x + 52, y - 40);
  ctx.lineTo(x + 470, y + 390);
  ctx.lineTo(x + 150, y + 390);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** King Tide's two golden spotlights sweeping in from the top corners, crossing over Octavia and pooling on the counter. */
function drawSpotlights(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(120, LAYOUT.board.y + LAYOUT.board.h + 4, LAYOUT.pass.x - 126, LAYOUT.counterBottom - LAYOUT.board.h - 14);
  ctx.rect(SLATE.x - 14, SLATE.y - 12, SLATE.w + 32, 262);
  ctx.moveTo(LAYOUT.plate.x + LAYOUT.plate.w / 2 + 14, LAYOUT.plate.y - 30);
  ctx.ellipse(LAYOUT.plate.x, LAYOUT.plate.y - 30, LAYOUT.plate.w / 2 + 14, 86, 0, 0, TAU);
  ctx.clip('evenodd');
  ctx.fillStyle = cachedGradient(ctx, 'spot', () => {
    const g = ctx.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, 'rgba(255,220,130,0.36)');
    g.addColorStop(1, 'rgba(255,220,130,0.04)');
    return g;
  });
  for (const [top, bottom, phase] of [[250, 820, 0], [1030, 460, 2.2]]) {
    const bx = bottom + Math.sin(t * 0.5 + phase) * 46;
    ctx.beginPath();
    ctx.moveTo(top - 24, -20);
    ctx.lineTo(top + 24, -20);
    ctx.lineTo(bx + 120, 640);
    ctx.lineTo(bx - 120, 640);
    ctx.closePath();
    ctx.fill();
    glow(ctx, bx, 612, 160, '255,214,120', 0.22, 38);
  }
  ctx.restore();
}

/** Light and mood over the kitchen, drawn after the counter and stations and before the HUD. */
export function drawAtmosphere(ctx, state, t, calm) {
  const mood = moodFor(state);
  const tt = calm ? 0 : t;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawRays(ctx, mood, tt);
  if (!mood.king) for (const b of BULBS) glow(ctx, b.x, b.y, 30, b.warm ? mood.lamp : '255,150,120', 0.4 + (calm ? 0 : 0.12 * Math.sin(t * 3 + b.x)));
  for (const [x, , ing] of JARS) glow(ctx, x, 280, 30, ing === 'pearl' ? '127,240,255' : mood.lamp, ing === 'pearl' ? 0.45 : 0.16);
  const port = LAYOUT.porthole;
  glow(ctx, port.x, port.y, port.r * 2.2, mood.caustic, 0.12);
  if (mood.moon) drawMoonbeam(ctx, tt);
  if (mood.king) drawSpotlights(ctx, tt);
  if (mood.storm && !calm) {
    const f = stormFlash(t);
    glow(ctx, port.x, port.y, 340, '200,230,255', f * 0.4);
    ctx.fillStyle = `rgba(200,230,255,${f * 0.12})`;
    ctx.fillRect(0, 0, 1280, 800);
  }
  ctx.restore();
  drawSnow(ctx, mood, tt);
  ctx.globalAlpha = mood.vignette;
  drawCached(ctx, 'vignette', 0, 0, 1280, 800, (c) => {
    const g = c.createRadialGradient(640, 380, 360, 640, 380, 860);
    g.addColorStop(0, 'rgba(1,8,12,0)');
    g.addColorStop(1, 'rgba(1,8,12,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, 1280, 800);
  }, 0.5);
  ctx.globalAlpha = 1;
}

/** Each station's name plate and hotkey, the plate's drop below the station, and its dials' offset from each slot (dx, dy, radius). */
const PLATES = {
  board: { name: 'SHELL BOARD', key: 'Q', drop: -8, dial: [62, -22, 16] },
  pot0: { name: 'BUBBLE POT', key: 'W', drop: 10, dial: [-60, -24, 17] },
  pot1: { name: 'POT 2', key: 'W', drop: 10, dial: [-60, -24, 17] },
  grill: { name: 'VENT GRILL', key: 'E', drop: 2, dial: [0, -54, 15] },
  steamer: { name: 'KELP STEAMER', key: 'R', drop: 12, dial: [30, -22, 15] },
};

/** Timing dials with their PERFECT, FLIP! and STIR ME! tags, and the station name plates, drawn above Octavia so her arms never hide them. */
export function drawStationOverlays(ctx, state, t) {
  for (const [id, { name, key, drop, dial }] of Object.entries(PLATES)) {
    const station = state.stations[id];
    if (!station || station.locked) continue;
    const st = LAYOUT.stations[id];
    station.slots.forEach((item, i) => {
      const at = SLOT_TARGETS[id][i];
      if (item) cookRing(ctx, item, at.x + dial[0], at.y + dial[1], t, dial[2]);
    });
    const item = station.slots[0];
    if (id === 'board' && item && !state.arms.some((a) => a.state === 'chop')) {
      text(ctx, 'needs an arm', st.target.x, st.target.y + 30, { size: 13, color: PALETTE.gold, align: 'center', line: 3 });
    }
    if (id.startsWith('pot') && item && item.phase !== 'cook' && item.phase !== 'burnt' && !isStirred(state, id)) {
      text(ctx, 'STIR ME!', st.x + st.w / 2, st.y + 96, { size: 14, color: PALETTE.orange, align: 'center', line: 4 });
    }
    stationLabel(ctx, name, key, st.x + st.w / 2, st.y + st.h + drop);
  }
}
