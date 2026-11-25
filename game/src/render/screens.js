/**
 * The screens around service: title, reef map, night results with the Tide Shop, and the
 * help, pause and settings overlays. Each draw call returns the buttons it laid out, so the
 * input layer can hit-test exactly what was drawn.
 */

import { PALETTE } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { RECIPE } from '../data/recipes.js';
import { UPGRADES, totalStars } from '../campaign.js';
import { blob, keycap, label, oval, panel, paragraph, roundRect, star, starRow, TAU, text } from './draw.js';
import { drawCustomer } from './customers.js';
import { drawFinishedDish, drawIngredient } from './food.js';
import { drawOctaviaPortrait } from './octopus.js';

const INK = PALETTE.ink;

/** Deep water with light rays, a sand floor, coral and kelp. */
export function drawSea(ctx, t, calm) {
  const g = ctx.createLinearGradient(0, 0, 0, 800);
  g.addColorStop(0, '#1b7f95');
  g.addColorStop(0.55, '#0e3b43');
  g.addColorStop(1, '#082a30');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 800);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = 140 + i * 210 + (calm ? 0 : Math.sin(t * 0.3 + i) * 30);
    ctx.fillStyle = 'rgba(127,240,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(x - 30, 0);
    ctx.lineTo(x + 40, 0);
    ctx.lineTo(x + 160, 800);
    ctx.lineTo(x + 40, 800);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#d9b57a';
  ctx.beginPath();
  ctx.moveTo(0, 690);
  for (let x = 0; x <= 1280; x += 40) ctx.lineTo(x, 690 + Math.sin(x * 0.01) * 14);
  ctx.lineTo(1280, 800);
  ctx.lineTo(0, 800);
  ctx.fill();
  const corals = [[70, '#ff7a59'], [190, '#c9b8ff'], [1090, '#ff9aa8'], [1210, '#ffd166']];
  for (const [x, col] of corals) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x, 700);
      ctx.quadraticCurveTo(x + k * 30, 640, x + k * 44, 600 - Math.abs(k) * -20);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  ctx.strokeStyle = '#2e7d4f';
  ctx.lineWidth = 8;
  for (let i = 0; i < 6; i++) {
    const x = 300 + i * 140;
    ctx.beginPath();
    ctx.moveTo(x, 720);
    for (let y = 720; y > 560; y -= 20) ctx.lineTo(x + Math.sin(y * 0.05 + t * (calm ? 0 : 1.2) + i) * 10, y);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const x = (i * 157) % 1280;
    const y = 800 - ((t * (20 + (i % 5) * 9) + i * 97) % 820);
    blob(ctx, x + Math.sin(t + i) * 6, y, 2 + (i % 4), 'rgba(214,250,255,0.18)', 'rgba(214,250,255,0.5)', 1);
  }
}

/** A chunky button; returns its rectangle with an id. */
function button(ctx, id, str, x, y, w, h, { key = null, primary = false, disabled = false } = {}) {
  panel(ctx, x, y, w, h, { fill: disabled ? '#6b7f84' : primary ? PALETTE.coral : PALETTE.pearl, stroke: INK, r: 16, line: 3.5 });
  text(ctx, str, x + w / 2 - (key ? 18 : 0), y + h / 2 + 8, { size: 22, color: primary ? PALETTE.pearl : INK, align: 'center', outline: primary ? INK : null, line: 4 });
  if (key) keycap(ctx, key, x + w - 34, y + h / 2, { size: 13 });
  return { id, x, y, w, h, disabled };
}

/** The game's logo: two lines of chunky outlined type. */
export function drawLogo(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  text(ctx, "Octavia's", 0, 0, { size: 46, color: PALETTE.gold, align: 'center', line: 9 });
  text(ctx, 'TIDEPOOL KITCHEN', 0, 70, { size: 66, color: PALETTE.pearl, outline: PALETTE.coralDark, align: 'center', line: 12 });
  text(ctx, 'TIDEPOOL KITCHEN', 0, 70, { size: 66, color: PALETTE.pearl, outline: INK, align: 'center', line: 5 });
  ctx.restore();
}

/** Title screen. */
export function drawTitle(ctx, campaign, t, calm) {
  drawSea(ctx, t, calm);
  ctx.fillStyle = 'rgba(255,246,230,0.12)';
  ctx.beginPath();
  ctx.ellipse(380, 560, 330, 200, 0, Math.PI, 0);
  ctx.fill();
  drawOctaviaPortrait(ctx, 380, 470, 1.55, t);
  drawLogo(ctx, 900, 150);
  text(ctx, 'An eight-armed octopus chef runs a bistro inside a giant clam', 900, 262, { size: 19, color: PALETTE.foam, align: 'center', line: 4 });
  const chips = ['8 recipes', '10 ingredients', '5 stations', '5 tide nights', 'sea-creature regulars'];
  let cx = 650;
  chips.forEach((c, i) => {
    const w = c.length * 9.5 + 26;
    panel(ctx, cx, 286 + (i > 2 ? 40 : 0), w, 30, { fill: '#1d6f7a', stroke: INK, r: 15, line: 2.5, shadow: false });
    label(ctx, c, cx + w / 2, 307 + (i > 2 ? 40 : 0), 15, PALETTE.pearl, 'center', 800);
    cx += w + 10;
    if (i === 2) cx = 700;
  });
  const buttons = [
    button(ctx, 'play', 'Play', 760, 380, 280, 64, { key: 'Enter', primary: true }),
    button(ctx, 'help', 'How to play', 760, 458, 280, 56, { key: 'H' }),
    button(ctx, 'settings', 'Settings', 760, 528, 280, 56, { key: 'O' }),
  ];
  const stars = totalStars(campaign);
  text(ctx, `Campaign: ${stars}/15 stars  -  purse ${campaign.purse} coins`, 900, 624, { size: 16, color: PALETTE.pearl, align: 'center', line: 4 });
  const regulars = ['puffy', 'shelby', 'twins', 'tortuga', 'mantis'];
  regulars.forEach((id, i) => {
    const x = 120 + i * 92;
    drawCustomer(ctx, id, x, 742, 34, 0.9, t);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(x, 742, 34, 0, TAU);
    ctx.stroke();
  });
  text(ctx, 'Tonight\u2019s regulars', 304, 694, { size: 16, color: PALETTE.gold, align: 'center', line: 4 });
  text(ctx, 'Keyboard and mouse  -  works offline  -  progress saves', 900, 760, { size: 14, color: 'rgba(255,246,230,0.8)', align: 'center', line: 3 });
  return buttons;
}

/** Positions of the five nights on the reef map. */
const MAP_NODES = [[150, 560], [330, 430], [520, 560], [700, 420], [880, 520]];

/** The reef map: the campaign path, stars per night, details and the shop door. */
export function drawMap(ctx, campaign, selected, t, calm) {
  drawSea(ctx, t, calm);
  drawLogo(ctx, 470, 72, 0.62);
  text(ctx, 'An eight-armed octopus chef runs a reef bistro inside a giant clam', 470, 160, { size: 17, color: PALETTE.pearl, align: 'center', line: 4 });
  text(ctx, 'REEF MAP', 470, 204, { size: 24, color: PALETTE.foam, align: 'center', line: 5 });
  ctx.setLineDash([4, 14]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,246,230,0.7)';
  ctx.beginPath();
  MAP_NODES.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  const [mx, my] = MAP_NODES[selected];
  drawOctaviaPortrait(ctx, mx, my - 132, 0.34, t);
  const buttons = [];
  MAP_NODES.forEach(([x, y], i) => {
    const open = i < campaign.unlocked;
    const sel = i === selected;
    if (sel) {
      ctx.save();
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 24;
      blob(ctx, x, y, 58, 'rgba(255,209,102,0.35)', null);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(x - 50, y + 10);
    ctx.bezierCurveTo(x - 54, y - 58, x + 54, y - 58, x + 50, y + 10);
    ctx.quadraticCurveTo(x, y + 30, x - 50, y + 10);
    ctx.fillStyle = open ? (sel ? '#ffe3a3' : '#fff1d6') : '#6b7f84';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    text(ctx, String(i + 1), x, y - 2, { size: 34, color: open ? PALETTE.coralDark : '#3b4a4f', align: 'center', outline: null });
    text(ctx, NIGHTS[i].name, x, y + 50, { size: 17, color: PALETTE.pearl, align: 'center', line: 4 });
    for (let s = 0; s < 3; s++) star(ctx, x - 26 + s * 26, y + 74, 11, s < campaign.stars[i] ? PALETTE.gold : 'rgba(20,30,40,0.5)');
    if (!open) text(ctx, 'locked', x, y + 100, { size: 13, color: '#c7d3d6', align: 'center', line: 3 });
    buttons.push({ id: `night${i}`, x: x - 56, y: y - 56, w: 112, h: 140 });
  });
  const night = NIGHTS[selected];
  const px = 980;
  panel(ctx, px, 40, 284, 620, { fill: 'rgba(8,42,48,0.92)', stroke: '#c99a4b', r: 18, line: 4 });
  text(ctx, `NIGHT ${selected + 1}`, px + 142, 82, { size: 20, color: PALETTE.gold, align: 'center', line: 4 });
  text(ctx, night.name, px + 142, 114, { size: 28, color: PALETTE.pearl, align: 'center', line: 5 });
  label(ctx, `3:00 of service - ${night.rushes.length} Spring Tide${night.rushes.length > 1 ? 's' : ''}`, px + 142, 140, 14, PALETTE.foam, 'center', 800);
  label(ctx, 'MENU', px + 20, 170, 14, PALETTE.gold, 'left', 900);
  const menu = night.critic.length ? [...night.recipes, 'platter'] : night.recipes;
  menu.forEach((id, i) => {
    const y = 192 + i * 26;
    drawFinishedDish(ctx, id, px + 40, y, 42);
    label(ctx, RECIPE[id].name, px + 72, y + 5, 15, id === 'platter' ? PALETTE.gold : PALETTE.pearl, 'left', 700);
  });
  const ry = 192 + menu.length * 26 + 8;
  label(ctx, 'REGULARS', px + 20, ry, 14, PALETTE.gold, 'left', 900);
  const regs = Object.keys(night.customers).concat(night.critic.length ? ['mantis'] : []);
  regs.forEach((id, i) => {
    const x = px + 42 + i * 52;
    drawCustomer(ctx, id, x, ry + 32, 22, 0.9, t);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(x, ry + 32, 22, 0, TAU);
    ctx.stroke();
  });
  paragraph(ctx, night.tip, px + 20, ry + 80, 244, 17, 13, PALETTE.pearl);
  label(ctx, `Stars at ${night.stars.join(' / ')} coins`, px + 20, ry + 122, 13, PALETTE.foam, 'left', 800);
  const open = selected < campaign.unlocked;
  buttons.push(button(ctx, 'start', open ? 'Start night' : 'Locked', px + 22, 566, 240, 60, { key: 'Enter', primary: open, disabled: !open }));
  buttons.push(button(ctx, 'shop', 'Tide Shop', 40, 690, 240, 56, { key: 'U' }));
  buttons.push(button(ctx, 'title', 'Title', 300, 690, 170, 56, { key: 'Esc' }));
  panel(ctx, 500, 690, 450, 56, { fill: 'rgba(8,42,48,0.9)', stroke: INK, r: 16, line: 3 });
  text(ctx, `Purse ${campaign.purse} coins  -  ${totalStars(campaign)}/15 stars`, 725, 726, { size: 18, color: PALETTE.gold, align: 'center', line: 4 });
  const owned = UPGRADES.filter((u) => campaign.upgrades[u.id]);
  owned.forEach((u, i) => drawUpgradeIcon(ctx, u.id, 1000 + i * 50, 718, 20));
  return buttons;
}

/** Small icons for the Tide Shop upgrades. */
export function drawUpgradeIcon(ctx, id, x, y, r) {
  blob(ctx, x, y, r, '#1d6f7a', INK, 2.5);
  if (id === 'secondPot') {
    ctx.fillStyle = '#4fb7b0';
    roundRect(ctx, x - r * 0.55, y - r * 0.2, r * 1.1, r * 0.7, r * 0.2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    oval(ctx, x, y - r * 0.2, r * 0.55, r * 0.16, '#fbf3e4', INK, 1.5);
  } else if (id === 'quickArms') {
    ctx.strokeStyle = '#ff8a7a';
    ctx.lineWidth = r * 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y + r * 0.4);
    ctx.quadraticCurveTo(x - r * 0.1, y - r * 0.6, x + r * 0.5, y - r * 0.2);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = PALETTE.pearl;
    ctx.lineWidth = 2;
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.9, y + k * r * 0.25);
      ctx.lineTo(x - r * 0.55, y + k * r * 0.25);
      ctx.stroke();
    }
  } else if (id === 'calmingCoral') {
    ctx.strokeStyle = '#ff9aa8';
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.6);
      ctx.lineTo(x + k * r * 0.45, y - r * 0.45);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  } else if (id === 'autoStir') {
    ctx.strokeStyle = '#c9b8ff';
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(x + (k - 2.5) * r * 0.16, y + r * 0.45);
      ctx.quadraticCurveTo(x + (k - 2.5) * r * 0.3, y - r * 0.1, x + (k - 2.5) * r * 0.22, y - r * 0.55);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  } else {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y);
    ctx.bezierCurveTo(x - r * 0.7, y - r * 0.9, x + r * 0.7, y - r * 0.9, x + r * 0.7, y);
    ctx.closePath();
    ctx.fillStyle = '#efe4ff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    oval(ctx, x, y + r * 0.15, r * 0.72, r * 0.3, '#9ad9c6', INK, 2);
  }
}

/** The Tide Shop panel: every upgrade with its cost; returns the buy buttons. */
export function drawShop(ctx, campaign, x, y, w) {
  panel(ctx, x, y, w, 470, { fill: 'rgba(8,42,48,0.94)', stroke: '#c99a4b', r: 18, line: 4 });
  text(ctx, 'TIDE SHOP', x + w / 2, y + 40, { size: 26, color: PALETTE.gold, align: 'center', line: 5 });
  text(ctx, `purse ${campaign.purse} coins`, x + w / 2, y + 66, { size: 16, color: PALETTE.pearl, align: 'center', line: 3 });
  const buttons = [];
  UPGRADES.forEach((u, i) => {
    const ry = y + 84 + i * 76;
    const owned = !!campaign.upgrades[u.id];
    const afford = campaign.purse >= u.cost;
    panel(ctx, x + 14, ry, w - 28, 68, { fill: owned ? '#1d6f5a' : '#12474f', stroke: INK, r: 12, line: 2.5, shadow: false });
    drawUpgradeIcon(ctx, u.id, x + 48, ry + 34, 22);
    text(ctx, u.name, x + 80, ry + 28, { size: 17, color: PALETTE.pearl, line: 3 });
    label(ctx, u.text, x + 80, ry + 50, 12, PALETTE.foam, 'left', 700);
    const bx = x + w - 120;
    if (owned) {
      text(ctx, 'OWNED', bx + 50, ry + 41, { size: 16, color: PALETTE.green, align: 'center', line: 3 });
    } else {
      panel(ctx, bx, ry + 16, 96, 36, { fill: afford ? PALETTE.gold : '#6b7f84', stroke: INK, r: 10, line: 2.5, shadow: false });
      label(ctx, `${u.cost} c`, bx + 48, ry + 40, 16, INK, 'center', 900);
      buttons.push({ id: `buy:${u.id}`, x: bx, y: ry + 16, w: 96, h: 36, disabled: !afford });
    }
  });
  return buttons;
}

/** Results of a night: stars, coins, stats, the critic and the Tide Shop. */
export function drawResults(ctx, campaign, summary, t, calm) {
  drawSea(ctx, t, calm);
  const night = NIGHTS[summary.nightIndex];
  panel(ctx, 30, 30, 700, 740, { fill: 'rgba(8,42,48,0.94)', stroke: '#c99a4b', r: 22, line: 5 });
  text(ctx, `NIGHT ${summary.nightIndex + 1} COMPLETE`, 380, 84, { size: 34, color: PALETTE.gold, align: 'center', line: 7 });
  text(ctx, night.name, 380, 118, { size: 22, color: PALETTE.foam, align: 'center', line: 4 });
  for (let s = 0; s < 3; s++) {
    const appear = Math.min(1, Math.max(0, t * 2 - s * 0.4));
    const sc = calm ? 1 : 0.6 + 0.4 * appear;
    star(ctx, 270 + s * 110, 196 - (s === 1 ? 14 : 0), 44 * sc, s < summary.stars ? PALETTE.gold : 'rgba(20,30,40,0.55)', INK, 4);
  }
  text(ctx, `${summary.coins} coins`, 380, 290, { size: 40, color: PALETTE.pearl, align: 'center', line: 7 });
  label(ctx, `targets ${night.stars.join(' / ')}`, 380, 316, 15, PALETTE.foam, 'center', 800);
  const stats = [
    ['Plates served', summary.served], ['Customers missed', summary.missed],
    ['Perfect cooks', summary.perfectCooks], ['Best Ink Streak', summary.bestStreak],
    ['Tips earned', `${summary.tips} c`], ['Burnt food', summary.burnt],
    ['Twin bonuses', summary.twins], ['Orders changed', summary.ordersChanged],
  ];
  stats.forEach(([name, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 70 + col * 320;
    const y = 360 + row * 60;
    panel(ctx, x, y, 300, 48, { fill: '#12474f', stroke: INK, r: 12, line: 2.5, shadow: false });
    label(ctx, name, x + 16, y + 30, 17, PALETTE.foam, 'left', 800);
    text(ctx, String(value), x + 284, y + 33, { size: 22, color: PALETTE.pearl, align: 'right', line: 4 });
  });
  if (summary.critic !== null) {
    panel(ctx, 70, 604, 620, 56, { fill: '#3b2a4d', stroke: PALETTE.gold, r: 14, line: 3, shadow: false });
    drawCustomer(ctx, 'mantis', 108, 632, 22, 0.9, t);
    text(ctx, 'Madame Mantis reviews:', 142, 640, { size: 18, color: PALETTE.gold, line: 4 });
    starRow(ctx, 560, 632, 12, summary.critic);
  } else {
    drawOctaviaPortrait(ctx, 380, 626, 0.36, t);
  }
  const buttons = [];
  const nextOpen = summary.nightIndex + 1 < Math.min(NIGHTS.length, campaign.unlocked);
  if (summary.nightIndex + 1 < NIGHTS.length) buttons.push(button(ctx, 'next', 'Next night', 60, 690, 230, 60, { key: 'Enter', primary: nextOpen, disabled: !nextOpen }));
  buttons.push(button(ctx, 'retry', 'Replay', 302, 690, 190, 60, { key: 'R' }));
  buttons.push(button(ctx, 'map', 'Reef map', 504, 690, 200, 60, { key: 'M' }));
  drawShopHeader(ctx, t);
  return buttons.concat(drawShop(ctx, campaign, 760, 160, 490));
}

/** Octavia's note above the shop. */
function drawShopHeader(ctx, t) {
  panel(ctx, 760, 40, 490, 100, { fill: PALETTE.pearl, stroke: INK, r: 18, line: 3 });
  drawIngredient(ctx, 'pearl', 812, 90, 60, null, t);
  text(ctx, 'Spend your coins on the kitchen', 1020, 82, { size: 20, color: INK, align: 'center', outline: null });
  label(ctx, 'Upgrades last for the whole campaign', 1020, 110, 15, '#5a4470', 'center', 800);
}

/** A dark veil over the kitchen for overlays. */
function veil(ctx) {
  ctx.fillStyle = 'rgba(5,25,29,0.72)';
  ctx.fillRect(0, 0, 1280, 800);
}

/** How to play. */
export function drawHelp(ctx, t) {
  veil(ctx);
  panel(ctx, 90, 50, 1100, 700, { fill: PALETTE.pearl, stroke: INK, r: 24, line: 4 });
  text(ctx, 'HOW TO RUN THE TIDEPOOL KITCHEN', 640, 100, { size: 30, color: PALETTE.coralDark, align: 'center', outline: null });
  const rows = [
    ['1-0', 'Grab an ingredient from its bin. Each item takes one of Octavia\u2019s 8 arms.'],
    ['Q', 'Shell Board: chop. Chopping only moves while an arm works the board.'],
    ['W', 'Bubble Pot: simmer. The placing arm stirs; an unstirred pot burns twice as fast.'],
    ['E', 'Vent Grill: sear. When it shouts FLIP!, press E again before it chars.'],
    ['R', 'Kelp Steamer: steam. Two baskets, gentle and slow.'],
    ['Space', 'Clam Plate: lay held food on the dish, then press again to finish (Roll, Ladle...).'],
    ['S', 'Serve the glowing plate in the Current Window to the customer who ordered it.'],
    ['Tab', 'Pick which ticket the plate is for. Click tickets, bins and stations too.'],
    ['Bksp', 'Bin the newest held item, burnt food, or the plate.'],
  ];
  rows.forEach(([key, what], i) => {
    const y = 156 + i * 46;
    keycap(ctx, key, 196, y, { size: 16, fill: PALETTE.gold });
    label(ctx, what, 256, y + 6, 18, INK, 'left', 700);
  });
  panel(ctx, 140, 584, 1000, 120, { fill: '#e8f6f1', stroke: INK, r: 16, line: 2.5, shadow: false });
  drawIngredient(ctx, 'rice', 196, 626, 54, 'steam', t);
  label(ctx, 'Cooked food glows PERFECT for a few seconds: take it then for a tip bonus. Then it overcooks, then burns.', 240, 626, 15, INK, 'left', 700);
  label(ctx, 'Ink Streak: on-time perfect plates in a row raise your multiplier up to x3. A missed customer breaks it.', 240, 654, 15, INK, 'left', 700);
  label(ctx, 'Spring Tides bring a rush of tickets. P pauses, M mutes, H toggles this card.', 240, 682, 15, INK, 'left', 700);
  text(ctx, 'press H or click to close', 640, 734, { size: 15, color: '#5a4470', align: 'center', outline: null });
  return [{ id: 'closeHelp', x: 0, y: 0, w: 1280, h: 800 }];
}

/** Pause menu. */
export function drawPause(ctx) {
  veil(ctx);
  panel(ctx, 440, 190, 400, 420, { fill: 'rgba(8,42,48,0.96)', stroke: '#c99a4b', r: 24, line: 4 });
  text(ctx, 'PAUSED', 640, 258, { size: 40, color: PALETTE.gold, align: 'center', line: 7 });
  return [
    button(ctx, 'resume', 'Resume', 490, 300, 300, 60, { key: 'P', primary: true }),
    button(ctx, 'help', 'How to play', 490, 374, 300, 56, { key: 'H' }),
    button(ctx, 'settings', 'Settings', 490, 444, 300, 56, { key: 'O' }),
    button(ctx, 'quit', 'Quit to map', 490, 514, 300, 56, { key: 'Q' }),
  ];
}

/** Settings: sound and reduced motion. */
export function drawSettings(ctx, settings) {
  veil(ctx);
  panel(ctx, 420, 210, 440, 380, { fill: 'rgba(8,42,48,0.96)', stroke: '#c99a4b', r: 24, line: 4 });
  text(ctx, 'SETTINGS', 640, 272, { size: 36, color: PALETTE.gold, align: 'center', line: 6 });
  return [
    button(ctx, 'toggleSound', `Sound: ${settings.sound ? 'on' : 'off'}`, 470, 310, 340, 60, { key: 'M' }),
    button(ctx, 'toggleMotion', `Reduced motion: ${settings.reducedMotion ? 'on' : 'off'}`, 470, 384, 340, 60, {}),
    button(ctx, 'closeSettings', 'Back', 470, 480, 340, 60, { key: 'Esc', primary: true }),
  ];
}
