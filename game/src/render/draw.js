/**
 * Small Canvas 2D drawing helpers shared by every renderer: rounded panels, outlined text,
 * progress rings, stars, check marks and easing.
 */

import { FONT, PALETTE } from '../config.js';

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const TAU = Math.PI * 2;

/** Sets a bold font of the shared family. */
export function font(ctx, size, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

/** Rounded rectangle path. */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A chunky outlined panel with a soft drop shadow. */
export function panel(ctx, x, y, w, h, { fill = PALETTE.pearl, stroke = PALETTE.ink, r = 14, line = 3, shadow = true } = {}) {
  if (shadow) {
    ctx.fillStyle = 'rgba(3, 18, 22, 0.35)';
    roundRect(ctx, x + 3, y + 5, w, h, r);
    ctx.fill();
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

/** Text with a dark outline so it reads over any background. */
export function text(ctx, str, x, y, { size = 18, color = PALETTE.pearl, outline = PALETTE.ink, align = 'left', base = 'alphabetic', weight = 800, line = 4, maxWidth } = {}) {
  font(ctx, size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = line;
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y, maxWidth);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y, maxWidth);
}

/** Plain text without outline. */
export function label(ctx, str, x, y, size = 14, color = PALETTE.ink, align = 'left', weight = 800, base = 'alphabetic') {
  font(ctx, size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** A ring that fills clockwise from the top; `frac` is 0..1. */
export function ring(ctx, x, y, r, frac, color, width = 6, track = 'rgba(0,0,0,0.25)') {
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = track;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  if (frac <= 0) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1));
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A five-pointed star. */
export function star(ctx, x, y, r, fill, stroke = PALETTE.ink, line = 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.46 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** A row of rating stars, with half stars, centred on x. */
export function starRow(ctx, x, y, r, value, max = 5) {
  const gap = r * 2.2;
  const left = x - ((max - 1) * gap) / 2;
  for (let i = 0; i < max; i++) {
    const cx = left + i * gap;
    star(ctx, cx, y, r, 'rgba(20,30,40,0.45)', PALETTE.ink, 1.5);
    const fill = clamp(value - i, 0, 1);
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - r, y - r, r * 2 * fill, r * 2);
      ctx.clip();
      star(ctx, cx, y, r, PALETTE.gold, PALETTE.ink, 1.5);
      ctx.restore();
    }
  }
}

/** A check mark in a circle. */
export function check(ctx, x, y, r, color = PALETTE.green) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, r * 0.32);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y + r * 0.02);
  ctx.lineTo(x - r * 0.1, y + r * 0.38);
  ctx.lineTo(x + r * 0.5, y - r * 0.35);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A small key-cap badge such as [Q] or [Space]. */
export function keycap(ctx, key, x, y, { size = 14, fill = PALETTE.pearl, color = PALETTE.ink, align = 'center' } = {}) {
  font(ctx, size, 900);
  const w = Math.max(size * 1.5, ctx.measureText(key).width + size * 0.9);
  const h = size * 1.45;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, left, y - h / 2 + 2, w, h, 5);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, left, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  label(ctx, key, left + w / 2, y + 1, size, color, 'center', 900, 'middle');
  return w;
}

/** A filled circle with an outline. */
export function blob(ctx, x, y, r, fill, stroke = PALETTE.ink, line = 2.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** An ellipse with an outline. */
export function oval(ctx, x, y, rx, ry, fill, stroke = PALETTE.ink, line = 2.5) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Formats seconds as m:ss. */
export function clock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Word-wrapped plain text; returns the y below the last line. */
export function paragraph(ctx, str, x, y, maxWidth, lineHeight, size = 14, color = PALETTE.ink, weight = 700) {
  font(ctx, size, weight);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}
