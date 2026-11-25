/**
 * Every ingredient in its raw and prepared looks, and the eight plated dishes, drawn so each
 * dish builds up layer by layer as its parts land on the Clam Plate.
 */

import { PALETTE } from '../config.js';
import { RECIPE } from '../data/recipes.js';
import { blob, oval, roundRect, TAU } from './draw.js';
import { contactShadow } from './light.js';

const INK = PALETTE.ink;

/** Form shadow on a round shape lit from the top left: a dark crescent at its lower right. */
function shade(ctx, x, y, r, alpha = 0.38) {
  if (r < 3) return;
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.2, x, y, r);
  g.addColorStop(0, 'rgba(20,10,30,0)');
  g.addColorStop(0.72, 'rgba(20,10,30,0)');
  g.addColorStop(1, `rgba(20,10,30,${alpha})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** A thin bright arc along the lit upper-left edge of an ellipse. */
function rimLight(ctx, x, y, rx, ry, width, alpha = 0.85) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A soft radial highlight that makes round food look glossy. */
function gloss(ctx, x, y, r, alpha = 0.55) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Dark grill stripes across a shape's bounding box, clipped by the caller. */
function grillMarks(ctx, x, y, w, h) {
  ctx.strokeStyle = 'rgba(40,20,10,0.75)';
  ctx.lineWidth = Math.max(2, h * 0.12);
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.28 - w * 0.12, y - h * 0.35);
    ctx.lineTo(x + i * w * 0.28 + w * 0.12, y + h * 0.35);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

const PAINT = {
  kelp(ctx, x, y, s, prep) {
    if (prep === 'chop') {
      for (let i = 0; i < 3; i++) {
        const px = x - s * 0.3 + i * s * 0.3;
        const py = y + (i % 2 ? -s * 0.1 : s * 0.12);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.5 + i * 0.45);
        ctx.fillStyle = '#3e9a5c';
        roundRect(ctx, -s * 0.16, -s * 0.07, s * 0.32, s * 0.14, s * 0.06);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.strokeStyle = '#8fe0a3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, 0);
        ctx.lineTo(s * 0.1, 0);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.42, y + s * 0.28);
      ctx.bezierCurveTo(x - s * 0.18, y - s * 0.55, x + s * 0.12, y + s * 0.52, x + s * 0.42, y - s * 0.3);
    };
    ctx.lineCap = 'round';
    path();
    ctx.lineWidth = s * 0.3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    path();
    ctx.lineWidth = s * 0.22;
    ctx.strokeStyle = '#4caf6a';
    ctx.stroke();
    path();
    ctx.lineWidth = s * 0.05;
    ctx.strokeStyle = '#a5e8b5';
    ctx.stroke();
    ctx.lineCap = 'butt';
  },
  grape(ctx, x, y, s) {
    ctx.strokeStyle = '#2d6b4f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.36);
    ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.5, x + s * 0.2, y - s * 0.46);
    ctx.stroke();
    const spots = [[0, -0.22], [-0.17, -0.08], [0.17, -0.08], [0, 0.04], [-0.12, 0.2], [0.12, 0.2], [0, 0.32]];
    for (const [dx, dy] of spots) {
      const cx = x + dx * s;
      const cy = y + dy * s;
      blob(ctx, cx, cy, s * 0.13, '#5cc79b', INK, 2);
      shade(ctx, cx, cy, s * 0.13);
      gloss(ctx, cx, cy, s * 0.13, 0.7);
    }
  },
  salt(ctx, x, y, s) {
    const bits = [[-0.2, 0.12, 0.3], [0.04, 0.16, -0.4], [0.24, 0.1, 0.2], [-0.08, -0.08, 0.8], [0.14, -0.1, -0.2], [0.02, -0.28, 0.5]];
    for (const [dx, dy, rot] of bits) {
      ctx.save();
      ctx.translate(x + dx * s, y + dy * s);
      ctx.rotate(rot + Math.PI / 4);
      ctx.fillStyle = dy < 0 ? '#ffc2cb' : '#ff8fa0';
      ctx.fillRect(-s * 0.1, -s * 0.1, s * 0.2, s * 0.2);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = INK;
      ctx.strokeRect(-s * 0.1, -s * 0.1, s * 0.2, s * 0.2);
      ctx.restore();
    }
  },
  jelly(ctx, x, y, s, prep) {
    const firm = prep === 'steam';
    if (!firm) {
      ctx.strokeStyle = 'rgba(200,184,255,0.9)';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.16, y + s * 0.06);
        ctx.bezierCurveTo(x + i * s * 0.2 + s * 0.08, y + s * 0.25, x + i * s * 0.16 - s * 0.08, y + s * 0.35, x + i * s * 0.18, y + s * 0.46);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.moveTo(x - s * 0.36, y + s * 0.08);
    ctx.bezierCurveTo(x - s * 0.36, y - s * 0.42, x + s * 0.36, y - s * 0.42, x + s * 0.36, y + s * 0.08);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x + s * 0.36 - (i * s * 0.72) / 6, y + s * 0.08 + (i % 2 ? s * 0.07 : 0));
    ctx.closePath();
    ctx.fillStyle = firm ? 'rgba(186,164,255,0.97)' : 'rgba(201,184,255,0.82)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    gloss(ctx, x - s * 0.05, y - s * 0.1, s * 0.3, 0.8);
    if (firm) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.02, s * 0.2, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
    }
  },
  pearl(ctx, x, y, s, prep, t = 0) {
    const spots = [[-0.2, 0.1], [0.05, 0.16], [0.24, 0.02], [-0.06, -0.12], [0.16, -0.2]];
    spots.forEach(([dx, dy], i) => {
      const cx = x + dx * s;
      const cy = y + dy * s;
      const pulse = 0.85 + 0.15 * Math.sin(t * 4 + i);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.26);
      g.addColorStop(0, `rgba(127,240,255,${0.55 * pulse})`);
      g.addColorStop(1, 'rgba(127,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.26, 0, TAU);
      ctx.fill();
      blob(ctx, cx, cy, s * 0.1, '#bff8ff', INK, 1.8);
      gloss(ctx, cx, cy, s * 0.1, 0.9);
    });
  },
  rice(ctx, x, y, s, prep) {
    if (prep === 'sear') {
      ctx.save();
      ctx.fillStyle = '#e3a14d';
      roundRect(ctx, x - s * 0.36, y - s * 0.22, s * 0.72, s * 0.44, s * 0.12);
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#f2c477';
      ctx.fillRect(x - s * 0.36, y - s * 0.22, s * 0.72, s * 0.12);
      grillMarks(ctx, x, y, s * 0.72, s * 0.44);
      gloss(ctx, x - s * 0.14, y - s * 0.1, s * 0.3, 0.4);
      ctx.restore();
      roundRect(ctx, x - s * 0.36, y - s * 0.22, s * 0.72, s * 0.44, s * 0.12);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      return;
    }
    const cooked = prep === 'steam';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y + s * 0.22);
    ctx.bezierCurveTo(x - s * 0.36, y - s * 0.34, x + s * 0.36, y - s * 0.34, x + s * 0.4, y + s * 0.22);
    ctx.closePath();
    ctx.fillStyle = cooked ? '#fffaf0' : '#ead9b4';
    ctx.fill();
    ctx.fillStyle = vgrad(ctx, y - s * 0.3, y + s * 0.22, 'rgba(255,255,255,0.3)', 'rgba(120,90,50,0.25)');
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    if (cooked) gloss(ctx, x - s * 0.1, y - s * 0.12, s * 0.22, 0.85);
    ctx.fillStyle = cooked ? '#e7dcc6' : '#c7ad7c';
    for (let i = 0; i < 9; i++) {
      const gx = x + (((i * 37) % 9) / 9 - 0.5) * s * 0.55;
      const gy = y + (((i * 53) % 7) / 7 - 0.4) * s * 0.3;
      ctx.beginPath();
      ctx.ellipse(gx, gy, s * 0.05, s * 0.025, i, 0, TAU);
      ctx.fill();
    }
  },
  shroom(ctx, x, y, s, prep) {
    if (prep === 'chop') {
      for (let i = 0; i < 3; i++) {
        const px = x - s * 0.26 + i * s * 0.26;
        const py = y + (i === 1 ? -s * 0.08 : s * 0.06);
        ctx.beginPath();
        ctx.moveTo(px - s * 0.12, py);
        ctx.quadraticCurveTo(px - s * 0.12, py - s * 0.18, px, py - s * 0.18);
        ctx.quadraticCurveTo(px + s * 0.12, py - s * 0.18, px + s * 0.12, py);
        ctx.lineTo(px + s * 0.05, py);
        ctx.lineTo(px + s * 0.05, py + s * 0.16);
        ctx.lineTo(px - s * 0.05, py + s * 0.16);
        ctx.lineTo(px - s * 0.05, py);
        ctx.closePath();
        ctx.fillStyle = '#f1dcc0';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#7a5434';
        ctx.stroke();
      }
      return;
    }
    const seared = prep === 'sear';
    ctx.fillStyle = '#efe0c8';
    roundRect(ctx, x - s * 0.1, y - s * 0.02, s * 0.2, s * 0.36, s * 0.06);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y + s * 0.02);
    ctx.bezierCurveTo(x - s * 0.4, y - s * 0.42, x + s * 0.4, y - s * 0.42, x + s * 0.4, y + s * 0.02);
    ctx.closePath();
    ctx.fillStyle = seared ? '#8a5a34' : '#b98a5e';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = vgrad(ctx, y - s * 0.32, y + s * 0.02, 'rgba(255,236,200,0.35)', 'rgba(50,25,10,0.3)');
    ctx.fillRect(x - s * 0.42, y - s * 0.42, s * 0.84, s * 0.46);
    ctx.strokeStyle = seared ? 'rgba(40,20,10,0.6)' : 'rgba(110,70,40,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y + s * 0.1, s * (0.16 + i * 0.1), Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    if (seared) grillMarks(ctx, x, y - s * 0.16, s * 0.6, s * 0.3);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y + s * 0.02);
    ctx.bezierCurveTo(x - s * 0.4, y - s * 0.42, x + s * 0.4, y - s * 0.42, x + s * 0.4, y + s * 0.02);
    ctx.closePath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  },
  milk(ctx, x, y, s, prep) {
    if (prep === 'simmer') {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.38, y - s * 0.08);
      ctx.quadraticCurveTo(x, y + s * 0.62, x + s * 0.38, y - s * 0.08);
      ctx.closePath();
      ctx.fillStyle = '#2f8f9d';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      oval(ctx, x, y - s * 0.08, s * 0.38, s * 0.1, '#fbf3e4', INK, 2.5);
      for (const [dx, r] of [[-0.14, 0.05], [0.08, 0.04], [0.2, 0.03]]) blob(ctx, x + dx * s, y - s * 0.1, r * s, '#ffffff', 'rgba(59,42,77,0.5)', 1);
      return;
    }
    blob(ctx, x, y + s * 0.06, s * 0.3, 'rgba(232,244,255,0.95)', INK, 2.5);
    shade(ctx, x, y + s * 0.06, s * 0.3, 0.3);
    ctx.fillStyle = '#c8a26b';
    roundRect(ctx, x - s * 0.08, y - s * 0.42, s * 0.16, s * 0.16, s * 0.04);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    for (const [dx, dy, r] of [[-0.1, 0.1, 0.06], [0.08, 0.0, 0.05], [0.02, 0.2, 0.04]]) blob(ctx, x + dx * s, y + dy * s, r * s, 'rgba(255,255,255,0.9)', 'rgba(90,169,230,0.7)', 1.2);
    gloss(ctx, x, y + s * 0.06, s * 0.3, 0.7);
  },
  urchin(ctx, x, y, s, prep) {
    if (prep === 'chop') {
      for (let i = 0; i < 3; i++) {
        const a = -0.6 + i * 0.6;
        const px = x - s * 0.22 + i * s * 0.22;
        const py = y + (i === 1 ? -s * 0.06 : s * 0.08);
        ctx.beginPath();
        ctx.moveTo(px, py + s * 0.14);
        ctx.arc(px, py + s * 0.14, s * 0.2, Math.PI * 1.2 + a * 0.2, Math.PI * 1.8 + a * 0.2);
        ctx.closePath();
        ctx.fillStyle = '#ff9f1c';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        blob(ctx, px, py + s * 0.02, s * 0.04, '#ffe28a', null);
      }
      return;
    }
    ctx.fillStyle = '#e07b10';
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r = i % 2 ? s * 0.3 : s * 0.44;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    blob(ctx, x, y, s * 0.29, '#ff9f1c', INK, 2.5);
    shade(ctx, x, y, s * 0.29, 0.45);
    gloss(ctx, x, y, s * 0.29, 0.6);
  },
  pepper(ctx, x, y, s, prep) {
    const seared = prep === 'sear';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.1, y - s * 0.34, x + s * 0.5, y - s * 0.05, x + s * 0.36, y + s * 0.32);
    ctx.bezierCurveTo(x + s * 0.2, y + s * 0.05, x - s * 0.05, y + s * 0.02, x - s * 0.3, y + s * 0.06);
    ctx.closePath();
    ctx.fillStyle = seared ? '#b8262f' : '#e63946';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = vgrad(ctx, y - s * 0.3, y + s * 0.35, 'rgba(255,255,255,0.2)', 'rgba(60,0,10,0.4)');
    ctx.fillRect(x - s * 0.5, y - s * 0.4, s, s * 0.8);
    if (seared) grillMarks(ctx, x + s * 0.05, y - s * 0.02, s * 0.6, s * 0.36);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.1, y - s * 0.34, x + s * 0.5, y - s * 0.05, x + s * 0.36, y + s * 0.32);
    ctx.bezierCurveTo(x + s * 0.2, y + s * 0.05, x - s * 0.05, y + s * 0.02, x - s * 0.3, y + s * 0.06);
    ctx.closePath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#3f9c55';
    roundRect(ctx, x - s * 0.42, y - s * 0.17, s * 0.16, s * 0.2, s * 0.05);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    gloss(ctx, x + s * 0.05, y - s * 0.12, s * 0.2, 0.55);
  },
};

/** Draws one ingredient, raw or in a prepared look, centred in a box about `s` wide. */
export function drawIngredient(ctx, ingId, x, y, s, prep = null, t = 0) {
  PAINT[ingId](ctx, x, y, s, prep, t);
}

/** A soft shadow under a vessel, offset away from the top-left light. */
function shadow(ctx, x, y, rx, ry) {
  contactShadow(ctx, x + rx * 0.06, y + ry * 0.15, rx * 1.08, ry * 1.25, 0.55);
}

/** A vertical gradient from `top` to `bottom` colour across an object. */
function vgrad(ctx, y0, y1, top, bottom) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

const VESSELS = {
  plate(ctx, x, y, u) {
    shadow(ctx, x, y + 14 * u, 92 * u, 26 * u);
    oval(ctx, x, y, 92 * u, 34 * u, vgrad(ctx, y - 34 * u, y + 34 * u, '#ffffff', '#e2d0b4'), INK, 3);
    oval(ctx, x, y - 2 * u, 70 * u, 24 * u, vgrad(ctx, y - 26 * u, y + 22 * u, '#e4d5ba', '#fbf3e4'), 'rgba(59,42,77,0.25)', 2);
    if (u > 0.3) rimLight(ctx, x, y, 84 * u, 29 * u, 3 * u);
  },
  platter(ctx, x, y, u) {
    shadow(ctx, x, y + 16 * u, 104 * u, 30 * u);
    oval(ctx, x, y, 104 * u, 38 * u, vgrad(ctx, y - 38 * u, y + 38 * u, '#ffc2a8', '#e9765a'), INK, 3);
    oval(ctx, x, y - 2 * u, 90 * u, 30 * u, vgrad(ctx, y - 32 * u, y + 28 * u, '#efe0c6', '#fff8ec'), 'rgba(59,42,77,0.3)', 2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      blob(ctx, x + Math.cos(a) * 97 * u, y + Math.sin(a) * 34 * u, 3.2 * u, '#ffd166', null);
    }
    if (u > 0.3) rimLight(ctx, x, y, 98 * u, 33 * u, 3 * u);
  },
  bowl(ctx, x, y, u) {
    shadow(ctx, x, y + 34 * u, 70 * u, 16 * u);
    ctx.beginPath();
    ctx.moveTo(x - 72 * u, y - 8 * u);
    ctx.bezierCurveTo(x - 70 * u, y + 48 * u, x + 70 * u, y + 48 * u, x + 72 * u, y - 8 * u);
    ctx.closePath();
    const glaze = ctx.createLinearGradient(x - 72 * u, 0, x + 72 * u, 0);
    glaze.addColorStop(0, '#2c8592');
    glaze.addColorStop(0.28, '#5fc2c4');
    glaze.addColorStop(0.62, '#2f8f9d');
    glaze.addColorStop(1, '#1a5560');
    ctx.fillStyle = glaze;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.strokeStyle = '#7fd1b9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 58 * u, y + 18 * u);
    ctx.bezierCurveTo(x - 30 * u, y + 30 * u, x + 30 * u, y + 30 * u, x + 58 * u, y + 18 * u);
    ctx.stroke();
    if (u > 0.3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 4 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 54 * u, y + 4 * u);
      ctx.quadraticCurveTo(x - 50 * u, y + 20 * u, x - 36 * u, y + 28 * u);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    oval(ctx, x, y - 8 * u, 72 * u, 18 * u, '#fff6e6', INK, 3);
    oval(ctx, x, y - 7 * u, 62 * u, 13 * u, vgrad(ctx, y - 20 * u, y + 6 * u, '#b9ddd4', '#e4f4ef'), null);
  },
  cup(ctx, x, y, u) {
    shadow(ctx, x, y + 36 * u, 46 * u, 10 * u);
    ctx.beginPath();
    ctx.moveTo(x - 46 * u, y - 30 * u);
    ctx.lineTo(x - 34 * u, y + 34 * u);
    ctx.lineTo(x + 34 * u, y + 34 * u);
    ctx.lineTo(x + 46 * u, y - 30 * u);
    ctx.closePath();
    const glass = ctx.createLinearGradient(x - 46 * u, 0, x + 46 * u, 0);
    glass.addColorStop(0, 'rgba(235,252,255,0.75)');
    glass.addColorStop(0.35, 'rgba(214,240,245,0.4)');
    glass.addColorStop(1, 'rgba(150,200,215,0.6)');
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  },
};

/** The glass cup's front highlight, drawn over its contents. */
function cupGlint(ctx, x, y, u) {
  if (u <= 0.3) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 4 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 34 * u, y - 20 * u);
  ctx.lineTo(x - 27 * u, y + 24 * u);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Whether a part is on the dish. */
const hasPart = (parts, ing, prep) => parts.some((p) => p.ing === ing && p.prep === prep);

/** Each dish's layers, painted only for the parts present; `done` adds the finishing touch. */
const DISHES = {
  kelpRoll: { vessel: 'plate', paint(ctx, x, y, u, parts, done) {
    if (done) {
      for (const [dx, dy] of [[-48, -4], [-16, -12], [16, -4], [48, -12]]) {
        blob(ctx, x + dx * u, y + dy * u, 17 * u, '#2f7d4f', INK, 2.5);
        blob(ctx, x + dx * u, y + dy * u, 12 * u, '#fffaf0', null);
        blob(ctx, x + dx * u, y + dy * u, 5 * u, '#ff8fa0', null);
      }
      return;
    }
    if (hasPart(parts, 'kelp', 'chop')) {
      ctx.fillStyle = vgrad(ctx, y - 18 * u, y + 10 * u, '#48a56b', '#1f5a38');
      roundRect(ctx, x - 62 * u, y - 18 * u, 124 * u, 28 * u, 8 * u);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(170,240,190,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = -5; i <= 5; i++) {
        ctx.moveTo(x + i * 11 * u, y - 15 * u);
        ctx.lineTo(x + i * 11 * u + 6 * u, y + 7 * u);
      }
      ctx.stroke();
    }
    if (hasPart(parts, 'rice', 'steam')) {
      ctx.fillStyle = '#fffaf0';
      roundRect(ctx, x - 52 * u, y - 16 * u, 104 * u, 20 * u, 9 * u);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(59,42,77,0.5)';
      ctx.stroke();
      ctx.fillStyle = '#e4d6bd';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.ellipse(x - 46 * u + ((i * 37) % 92) * u, y - 12 * u + ((i * 7) % 12) * u, 3.2 * u, 1.6 * u, i, 0, TAU);
        ctx.fill();
      }
    }
    if (hasPart(parts, 'salt', 'raw')) drawIngredient(ctx, 'salt', x + 34 * u, y - 18 * u, 30 * u);
  } },
  pearlBowl: { vessel: 'bowl', paint(ctx, x, y, u, parts, done) {
    if (hasPart(parts, 'rice', 'steam')) {
      ctx.beginPath();
      ctx.ellipse(x, y - 12 * u, 58 * u, 22 * u, 0, Math.PI, 0);
      ctx.fillStyle = '#fffaf0';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(59,42,77,0.45)';
      ctx.stroke();
    }
    if (hasPart(parts, 'shroom', 'sear')) {
      drawIngredient(ctx, 'shroom', x - 24 * u, y - 24 * u, 34 * u, 'sear');
      drawIngredient(ctx, 'shroom', x - 2 * u, y - 30 * u, 30 * u, 'sear');
    }
    if (hasPart(parts, 'pearl', 'raw')) drawIngredient(ctx, 'pearl', x + 30 * u, y - 24 * u, 44 * u);
    if (done) leaf(ctx, x + 6 * u, y - 40 * u, u);
  } },
  broth: { vessel: 'bowl', paint(ctx, x, y, u, parts, done) {
    if (hasPart(parts, 'milk', 'simmer')) {
      oval(ctx, x, y - 8 * u, 60 * u, 13 * u, '#fbf3e4', null);
      for (const [dx, r] of [[-30, 4], [-8, 3], [22, 5], [40, 3]]) blob(ctx, x + dx * u, y - 9 * u, r * u, '#ffffff', 'rgba(59,42,77,0.4)', 1);
    }
    if (hasPart(parts, 'kelp', 'chop')) drawIngredient(ctx, 'kelp', x - 22 * u, y - 10 * u, 40 * u, 'chop');
    if (hasPart(parts, 'shroom', 'chop')) drawIngredient(ctx, 'shroom', x + 24 * u, y - 12 * u, 38 * u, 'chop');
    if (done) {
      ctx.strokeStyle = 'rgba(255,209,102,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y - 8 * u, 18 * u, 0.2, Math.PI * 1.6);
      ctx.stroke();
    }
  } },
  toast: { vessel: 'plate', paint(ctx, x, y, u, parts, done) {
    if (hasPart(parts, 'rice', 'sear')) drawIngredient(ctx, 'rice', x, y - 8 * u, 120 * u, 'sear');
    if (hasPart(parts, 'urchin', 'chop')) drawIngredient(ctx, 'urchin', x + 2 * u, y - 16 * u, 66 * u, 'chop');
    if (done) {
      drawIngredient(ctx, 'salt', x - 34 * u, y - 18 * u, 22 * u);
      leaf(ctx, x + 40 * u, y - 24 * u, u * 0.8);
    }
  } },
  pudding: { vessel: 'cup', paint(ctx, x, y, u, parts, done) {
    if (hasPart(parts, 'milk', 'simmer')) {
      ctx.beginPath();
      ctx.moveTo(x - 40 * u, y - 6 * u);
      ctx.lineTo(x - 34 * u, y + 32 * u);
      ctx.lineTo(x + 34 * u, y + 32 * u);
      ctx.lineTo(x + 40 * u, y - 6 * u);
      ctx.closePath();
      ctx.fillStyle = '#fbf3e4';
      ctx.fill();
    }
    cupGlint(ctx, x, y, u);
    if (hasPart(parts, 'jelly', 'steam')) drawIngredient(ctx, 'jelly', x, y - 16 * u, 96 * u, 'steam');
    if (hasPart(parts, 'pearl', 'raw')) drawIngredient(ctx, 'pearl', x, y - 40 * u, 40 * u);
    if (done) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 20 * u, y - 34 * u);
      ctx.lineTo(x + 26 * u, y - 70 * u);
      ctx.stroke();
      ctx.fillStyle = PALETTE.coral;
      ctx.beginPath();
      ctx.moveTo(x + 26 * u, y - 70 * u);
      ctx.lineTo(x + 46 * u, y - 64 * u);
      ctx.lineTo(x + 25 * u, y - 57 * u);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } },
  skewer: { vessel: 'plate', paint(ctx, x, y, u, parts, done) {
    if (done) {
      ctx.strokeStyle = '#8a5a34';
      ctx.lineWidth = 5 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 76 * u, y + 2 * u);
      ctx.lineTo(x + 76 * u, y - 22 * u);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    if (hasPart(parts, 'pepper', 'sear')) {
      drawIngredient(ctx, 'pepper', x - 44 * u, y - 2 * u, 46 * u, 'sear');
      drawIngredient(ctx, 'pepper', x + 20 * u, y - 14 * u, 46 * u, 'sear');
    }
    if (hasPart(parts, 'shroom', 'sear')) drawIngredient(ctx, 'shroom', x - 12 * u, y - 8 * u, 40 * u, 'sear');
    if (hasPart(parts, 'grape', 'raw')) drawIngredient(ctx, 'grape', x + 52 * u, y - 18 * u, 36 * u);
  } },
  salad: { vessel: 'bowl', paint(ctx, x, y, u, parts, done) {
    if (hasPart(parts, 'kelp', 'chop')) {
      drawIngredient(ctx, 'kelp', x - 20 * u, y - 16 * u, 56 * u, 'chop');
      drawIngredient(ctx, 'kelp', x + 18 * u, y - 20 * u, 48 * u, 'chop');
    }
    if (hasPart(parts, 'urchin', 'chop')) drawIngredient(ctx, 'urchin', x - 30 * u, y - 26 * u, 40 * u, 'chop');
    if (hasPart(parts, 'grape', 'raw')) drawIngredient(ctx, 'grape', x + 28 * u, y - 30 * u, 34 * u);
    if (hasPart(parts, 'salt', 'raw')) drawIngredient(ctx, 'salt', x + 2 * u, y - 34 * u, 24 * u);
    if (done) leaf(ctx, x - 4 * u, y - 46 * u, u * 0.9);
  } },
  platter: { vessel: 'platter', paint(ctx, x, y, u, parts, done) {
    if (hasPart(parts, 'rice', 'steam')) drawIngredient(ctx, 'rice', x - 52 * u, y - 8 * u, 64 * u, 'steam');
    if (hasPart(parts, 'jelly', 'steam')) drawIngredient(ctx, 'jelly', x - 2 * u, y - 18 * u, 54 * u, 'steam');
    if (hasPart(parts, 'pepper', 'sear')) drawIngredient(ctx, 'pepper', x + 50 * u, y - 10 * u, 56 * u, 'sear');
    if (hasPart(parts, 'urchin', 'chop')) drawIngredient(ctx, 'urchin', x + 4 * u, y + 6 * u, 50 * u, 'chop');
    if (done) {
      blob(ctx, x - 2 * u, y - 42 * u, 7 * u, '#ffd166', INK, 2);
      gloss(ctx, x - 2 * u, y - 42 * u, 7 * u, 0.9);
      leaf(ctx, x - 78 * u, y - 6 * u, u * 0.8);
    }
  } },
};

/** A small sea-lettuce garnish leaf. */
function leaf(ctx, x, y, u) {
  ctx.beginPath();
  ctx.moveTo(x - 12 * u, y + 6 * u);
  ctx.quadraticCurveTo(x - 6 * u, y - 14 * u, x + 14 * u, y - 8 * u);
  ctx.quadraticCurveTo(x + 6 * u, y + 10 * u, x - 12 * u, y + 6 * u);
  ctx.fillStyle = '#5fd38d';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/**
 * Draws a dish about `w` pixels wide centred on (x, y): its vessel, the parts present, and
 * the finishing touch once `done`.
 */
export function drawDish(ctx, recipeId, x, y, w, parts = [], done = false) {
  const u = w / 200;
  const dish = DISHES[recipeId];
  VESSELS[dish.vessel](ctx, x, y, u);
  dish.paint(ctx, x, y, u, parts, done);
}

/** A whole finished dish with every part of its recipe, for tickets, menus and the pass. */
export function drawFinishedDish(ctx, recipeId, x, y, w) {
  const parts = RECIPE[recipeId].parts.map(([ing, prep]) => ({ ing, prep }));
  drawDish(ctx, recipeId, x, y, w, parts, true);
}
