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
import { CUSTOMERS } from '../data/customers.js';
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
  drawFishSchool(ctx, t, calm);
}

/** Two little schools of reef fish drifting across the water. */
function drawFishSchool(ctx, t, calm) {
  const drift = calm ? 0 : t;
  for (const [row, speed, col, dir] of [[150, 26, '#ffd166', 1], [420, 18, '#ff9aa8', -1]]) {
    for (let i = 0; i < 6; i++) {
      const run = (drift * speed + i * 34) % 1500;
      const x = dir > 0 ? run - 110 : 1390 - run;
      const y = row + (i % 3) * 16 + Math.sin(drift * 2 + i) * 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-15, -5);
      ctx.lineTo(-15, 5);
      ctx.closePath();
      ctx.ellipse(0, 0, 9, 5, 0, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      blob(ctx, 4, -1, 1.4, INK, null);
      ctx.restore();
    }
  }
}

/** A chunky glossy button lit from above; returns its rectangle with an id. */
function button(ctx, id, str, x, y, w, h, { key = null, primary = false, disabled = false } = {}) {
  const [top, bottom] = disabled ? ['#9aaaae', '#6b7f84'] : primary ? ['#ffa384', PALETTE.coralDark] : ['#fffdf7', '#efdcbf'];
  ctx.fillStyle = 'rgba(3,18,22,0.4)';
  roundRect(ctx, x + 3, y + 6, w, h, 16);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  roundRect(ctx, x + 9, y + 5, w - 18, h * 0.3, 9);
  ctx.fill();
  text(ctx, str, x + w / 2 - (key ? 18 : 0), y + h / 2 + 8, { size: 22, color: primary ? PALETTE.pearl : INK, align: 'center', outline: primary ? INK : null, line: 5 });
  if (key) keycap(ctx, key, x + w - 34, y + h / 2, { size: 13 });
  return { id, x, y, w, h, disabled };
}

/**
 * The game's logo: "Octavia's" on a coral ribbon over chunky gold TIDEPOOL KITCHEN letters
 * with a deep shadow, a pearl and a few bubbles.
 */
export function drawLogo(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const ribbon = new Path2D();
  ribbon.moveTo(-150, -44);
  ribbon.quadraticCurveTo(0, -62, 150, -44);
  ribbon.lineTo(150, 4);
  ribbon.quadraticCurveTo(0, -14, -150, 4);
  ribbon.closePath();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 140, -36);
    ctx.lineTo(side * 186, -34);
    ctx.lineTo(side * 170, -14);
    ctx.lineTo(side * 186, 8);
    ctx.lineTo(side * 140, 10);
    ctx.closePath();
    ctx.fillStyle = PALETTE.coralDark;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  const coral = ctx.createLinearGradient(0, -60, 0, 4);
  coral.addColorStop(0, '#ffa384');
  coral.addColorStop(1, PALETTE.coralDark);
  ctx.fillStyle = coral;
  ctx.fill(ribbon);
  ctx.lineWidth = 4;
  ctx.stroke(ribbon);
  text(ctx, "Octavia's", 0, -9, { size: 44, color: PALETTE.pearl, align: 'center', line: 8, weight: 900 });
  ctx.font = `900 68px "Trebuchet MS", "Segoe UI", "Noto Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(5,25,29,0.55)';
  ctx.lineWidth = 16;
  ctx.strokeStyle = 'rgba(5,25,29,0.55)';
  ctx.strokeText('TIDEPOOL KITCHEN', 5, 80);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14;
  ctx.strokeText('TIDEPOOL KITCHEN', 0, 72);
  const gold = ctx.createLinearGradient(0, 22, 0, 74);
  gold.addColorStop(0, '#fffbe0');
  gold.addColorStop(0.45, '#ffd166');
  gold.addColorStop(1, '#ff8f3a');
  ctx.fillStyle = gold;
  ctx.fillText('TIDEPOOL KITCHEN', 0, 72);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeText('TIDEPOOL KITCHEN', 0, 70);
  blob(ctx, 0, -66, 9, '#fff6e6', INK, 3);
  blob(ctx, -3, -69, 3, '#ffffff', null);
  for (const [bx, by, r] of [[300, 10, 8], [318, -16, 5], [-306, 24, 6], [-322, 2, 4]]) blob(ctx, bx, by, r, 'rgba(214,250,255,0.25)', 'rgba(214,250,255,0.8)', 2);
  ctx.restore();
}

/** Title screen. */
export function drawTitle(ctx, campaign, t, calm) {
  drawSea(ctx, t, calm);
  const spot = ctx.createRadialGradient(380, 380, 40, 380, 420, 380);
  spot.addColorStop(0, 'rgba(255,236,200,0.32)');
  spot.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 40, 760, 760);
  drawClamStage(ctx, 378, 640);
  drawOctaviaPortrait(ctx, 384, 410, 1.2, t, 'hero');
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
    drawCustomer(ctx, id, x, 742, 34, 0.9);
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

/** The open giant clam Octavia stands in on the title screen, centred on (x, y). */
function drawClamStage(ctx, x, y) {
  const shell = ctx.createLinearGradient(x - 260, y - 150, x + 260, y);
  shell.addColorStop(0, '#fff1f6');
  shell.addColorStop(0.5, '#e9c7f0');
  shell.addColorStop(1, '#a98ad6');
  ctx.beginPath();
  ctx.moveTo(x - 250, y);
  ctx.bezierCurveTo(x - 250, y - 210, x + 250, y - 210, x + 250, y);
  ctx.closePath();
  ctx.fillStyle = shell;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(59,42,77,0.22)';
  ctx.lineWidth = 3;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + i * 44, y - 148 + Math.abs(i) * 18);
    ctx.stroke();
  }
  oval(ctx, x, y + 6, 262, 34, '#9ad9c6', INK, 4);
  oval(ctx, x, y, 230, 20, '#c6efe2', null);
  blob(ctx, x + 150, y - 6, 13, '#fff6e6', INK, 3);
  blob(ctx, x + 146, y - 10, 4, '#ffffff', null);
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
    drawCustomer(ctx, id, x, ry + 32, 22, 0.9);
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
    text(ctx, u.text, x + 80, ry + 50, { size: 12, color: PALETTE.foam, outline: null, weight: 700, maxWidth: w - 214 });
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

/** Reef Gazette headline and subhead for each star count. */
const HEADLINES = [
  ['KITCHEN IN HOT WATER', 'Hungry diners swim off as the tide turns'],
  ['A DECENT CATCH', 'Octavia keeps the clam bistro afloat'],
  ['OCTAVIA MAKES WAVES', 'Regulars rave about the eight-armed chef'],
  ['EIGHT ARMS OF GENIUS!', 'The reef crowns its finest kitchen'],
];

const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", serif';

/** Newsprint type in the Gazette's serif. */
function serif(ctx, str, x, y, size, { weight = 700, color = INK, align = 'center', italic = false, maxWidth } = {}) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y, maxWidth);
}

/** A printed rule across the Gazette page. */
function rule(ctx, x0, x1, y, width = 1.5) {
  ctx.fillStyle = INK;
  ctx.fillRect(x0, y, x1 - x0, width);
}

/**
 * Results of a night as a Reef Gazette review: masthead, a headline by stars earned, a photo
 * of Octavia taking a bow, the verdict in stars and coins, the night's numbers and a diner's
 * quote, with the Tide Shop beside it.
 */
export function drawResults(ctx, campaign, summary, t, calm) {
  drawSea(ctx, t, calm);
  const night = NIGHTS[summary.nightIndex];
  ctx.save();
  ctx.translate(378, 350);
  ctx.rotate(-0.012);
  ctx.translate(-378, -350);
  ctx.fillStyle = 'rgba(3,18,22,0.45)';
  roundRect(ctx, 44, 40, 680, 636, 8);
  ctx.fill();
  const paper = ctx.createLinearGradient(0, 32, 0, 668);
  paper.addColorStop(0, '#fcf6e8');
  paper.addColorStop(1, '#eadcbc');
  roundRect(ctx, 38, 32, 680, 636, 8);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  serif(ctx, 'THE REEF GAZETTE', 378, 88, 44, { weight: 900 });
  rule(ctx, 62, 694, 100, 3.5);
  rule(ctx, 62, 694, 107);
  serif(ctx, `LATE TIDE EDITION  \u2022  NIGHT ${summary.nightIndex + 1}: ${night.name.toUpperCase()}  \u2022  ONE PEARL`, 378, 126, 12, { weight: 700, color: '#5a4470' });
  rule(ctx, 62, 694, 135);
  const [headline, subhead] = HEADLINES[summary.stars];
  serif(ctx, headline, 378, 182, 40, { weight: 900, maxWidth: 630 });
  serif(ctx, subhead, 378, 208, 17, { italic: true, color: '#5a4470' });
  rule(ctx, 62, 694, 222);
  const photo = { x: 62, y: 236, w: 288, h: 206 };
  ctx.save();
  roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 4);
  const reef = ctx.createLinearGradient(0, photo.y, 0, photo.y + photo.h);
  reef.addColorStop(0, '#2b8fa0');
  reef.addColorStop(1, '#0e3b43');
  ctx.fillStyle = reef;
  ctx.fill();
  ctx.clip();
  const glowSpot = ctx.createRadialGradient(206, 300, 10, 206, 320, 170);
  glowSpot.addColorStop(0, 'rgba(255,236,200,0.45)');
  glowSpot.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = glowSpot;
  ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
  oval(ctx, 206, 430, 150, 30, '#d9b57a', null);
  drawOctaviaPortrait(ctx, 206, 352, 0.5, t, 'bow');
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 4);
  ctx.stroke();
  serif(ctx, 'Chef Octavia takes a bow after service.', 206, 462, 13, { italic: true, color: '#5a4470' });
  rule(ctx, 361, 362.5, 236, 230);
  serif(ctx, 'OUR VERDICT', 533, 256, 14, { weight: 900, color: '#5a4470' });
  for (let s = 0; s < 3; s++) {
    const appear = Math.min(1, Math.max(0, t * 2 - s * 0.4));
    const sc = calm ? 1 : 0.6 + 0.4 * appear;
    star(ctx, 457 + s * 76, 302 - (s === 1 ? 10 : 0), 32 * sc, s < summary.stars ? PALETTE.gold : 'rgba(59,42,77,0.2)', INK, 3.5);
  }
  serif(ctx, `${summary.coins} coins`, 533, 374, 38, { weight: 900 });
  serif(ctx, `targets ${night.stars.join(' / ')}`, 533, 398, 14, { italic: true, color: '#5a4470' });
  serif(ctx, `${summary.inkBursts ?? 0} Ink Burst${summary.inkBursts === 1 ? '' : 's'}  \u2022  best streak ${summary.bestStreak}`, 533, 428, 14, { color: '#7a3fbf' });
  rule(ctx, 62, 694, 478);
  serif(ctx, 'BY THE NUMBERS', 378, 500, 13, { weight: 900, color: '#5a4470' });
  const stats = [
    ['Plates served', summary.served], ['Customers missed', summary.missed],
    ['Perfect cooks', summary.perfectCooks], ['Tips earned', `${summary.tips} c`],
    ['Burnt food', summary.burnt], ['Twin bonuses', summary.twins],
    ['Orders changed', summary.ordersChanged], ['Ink Bursts', summary.inkBursts ?? 0],
  ];
  stats.forEach(([name, value], i) => {
    const x = 62 + (i % 2) * 330;
    const y = 524 + Math.floor(i / 2) * 22;
    serif(ctx, name, x, y, 15, { align: 'left', weight: 700 });
    const from = x + ctx.measureText(name).width + 8;
    serif(ctx, String(value), x + 302, y, 16, { align: 'right', weight: 900 });
    const to = x + 302 - ctx.measureText(String(value)).width - 8;
    ctx.fillStyle = 'rgba(59,42,77,0.4)';
    for (let d = from; d < to; d += 6) ctx.fillRect(d, y - 3, 2, 2);
  });
  const voice = summary.critic !== null ? 'mantis' : ['puffy', 'shelby', 'twins', 'tortuga'][summary.stars];
  const said = CUSTOMERS[voice].lines?.[summary.stars > 0 ? 'happy' : 'angry']?.[summary.nightIndex % 3] ?? 'What a night!';
  rule(ctx, 62, 694, 610);
  drawCustomer(ctx, voice, 88, 638, 20, summary.stars > 0 ? 1 : 0.2);
  serif(ctx, `\u201c${said}\u201d`, 118, 645, 19, { align: 'left', italic: true, weight: 700, maxWidth: 330 });
  serif(ctx, `- ${CUSTOMERS[voice].name}`, 694, 645, 14, { align: 'right', color: '#5a4470' });
  if (summary.critic !== null) starRow(ctx, 600, 624, 7, summary.critic);
  ctx.restore();
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
    ['I', 'Ink Burst: fills with perfect cooks; freezes patience and speeds your arms for 6 s.'],
  ];
  rows.forEach(([key, what], i) => {
    const y = 150 + i * 42;
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
