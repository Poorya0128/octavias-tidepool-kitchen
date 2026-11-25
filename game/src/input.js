/**
 * Keyboard and mouse. Every key and click becomes either a night action (sent to `dispatch`)
 * or a screen command; ingredients can also be dragged from a bin onto a station or the plate.
 */

import { LAYOUT, VIEW_H, VIEW_W } from './config.js';
import { INGREDIENTS, allowsPrep } from './data/ingredients.js';
import { isUsable } from './stations.js';
import { slotPoint } from './orders.js';

const STATION_KEYS = { q: 'board', e: 'grill', r: 'steamer' };

/** Which pot W should work: the one with something to take, place or stir. */
export function chooseKeyPot(state) {
  const pots = ['pot0', 'pot1'].filter((id) => !state.stations[id].locked);
  const holdingSimmer = state.arms.some((a) => a.state === 'hold' && a.item.prep === null && allowsPrep(a.item.ing, 'simmer'));
  const by = (test) => pots.find((id) => test(state.stations[id].slots[0]));
  return by((s) => s?.phase === 'burnt') ?? by((s) => isUsable(s)) ?? (holdingSimmer ? by((s) => !s) : null) ?? by((s) => !!s) ?? 'pot0';
}

/** Rectangles the pointer can hit during service, in logical pixels. */
export function nightHitAreas(state) {
  const areas = [];
  const b = LAYOUT.bins;
  INGREDIENTS.forEach((ing, i) => areas.push({ kind: 'bin', ing: ing.id, index: i, x: b.x + i * (b.w + b.gap), y: b.y, w: b.w, h: b.h }));
  const s = LAYOUT.stations;
  areas.push({ kind: 'station', id: 'board', x: s.board.x, y: s.board.y, w: s.board.w, h: s.board.h });
  areas.push({ kind: 'station', id: 'pot0', x: s.pot0.x, y: s.pot0.y, w: s.pot0.w, h: s.pot0.h + 20 });
  areas.push({ kind: 'station', id: 'pot1', x: s.pot1.x, y: s.pot1.y, w: s.pot1.w, h: s.pot1.h + 20 });
  areas.push({ kind: 'station', id: 'grill', slot: 0, x: s.grill.x, y: s.grill.y - 30, w: s.grill.w / 2, h: s.grill.h + 30 });
  areas.push({ kind: 'station', id: 'grill', slot: 1, x: s.grill.x + s.grill.w / 2, y: s.grill.y - 30, w: s.grill.w / 2, h: s.grill.h + 30 });
  areas.push({ kind: 'station', id: 'steamer', slot: 0, x: s.steamer.x, y: s.steamer.y, w: s.steamer.w, h: 128 });
  areas.push({ kind: 'station', id: 'steamer', slot: 1, x: s.steamer.x, y: s.steamer.y + 128, w: s.steamer.w, h: s.steamer.h - 128 });
  const p = LAYOUT.plate;
  areas.push({ kind: 'plate', x: p.x - p.w / 2, y: p.y - 92, w: p.w, h: 150 });
  const tr = LAYOUT.trash;
  areas.push({ kind: 'trash', x: tr.x, y: tr.y, w: tr.w, h: tr.h });
  state.pass.forEach((_, i) => {
    const c = slotPoint(i);
    areas.push({ kind: 'pass', index: i, x: c.x - 90, y: c.y - 64, w: 180, h: 128 });
  });
  const tk = LAYOUT.ticket;
  state.tickets.slice(0, tk.max).forEach((t, i) => areas.push({ kind: 'ticket', id: t.id, x: tk.x + i * (tk.w + tk.gap), y: tk.y - 8, w: tk.w, h: tk.h + 8 }));
  return areas;
}

/** The first area containing a point. */
export function hitTest(areas, x, y) {
  return areas.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;
}

/** The night action a clicked area stands for. */
export function actionForArea(area) {
  switch (area.kind) {
    case 'bin': return { type: 'grab', ing: area.ing };
    case 'station': return { type: 'station', id: area.id, slot: area.slot ?? null };
    case 'plate': return { type: 'plate' };
    case 'trash': return { type: 'trash' };
    case 'pass': return { type: 'serve', index: area.index };
    case 'ticket': return { type: 'select', id: area.id };
    default: return null;
  }
}

/** The night action for a key during service, or null. */
export function actionForKey(state, key) {
  const k = key.length === 1 ? key.toLowerCase() : key;
  const ing = INGREDIENTS.find((i) => i.key === k);
  if (ing) return { type: 'grab', ing: ing.id };
  if (STATION_KEYS[k]) return { type: 'station', id: STATION_KEYS[k] };
  if (k === 'w') return { type: 'station', id: chooseKeyPot(state) };
  if (k === ' ' || k === 'Enter') return { type: 'plate' };
  if (k === 's') return { type: 'serve' };
  if (k === 'Tab') return { type: 'cycle' };
  if (k === 'Backspace' || k === 'Delete') return { type: 'trash' };
  return null;
}

/**
 * Wires the canvas and window to the app: `onKey(key, event)`, `onPointer(kind, x, y)` with
 * kind 'down', 'up' or 'move' in logical coordinates.
 */
export function bindInput(canvas, { onKey, onPointer }) {
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * VIEW_W) / r.width, y: ((e.clientY - r.top) * VIEW_H) / r.height };
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (onKey(e.key, e)) e.preventDefault();
  });
  canvas.addEventListener('pointerdown', (e) => {
    const p = toLogical(e);
    canvas.setPointerCapture?.(e.pointerId);
    onPointer('down', p.x, p.y);
  });
  canvas.addEventListener('pointerup', (e) => {
    const p = toLogical(e);
    onPointer('up', p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    onPointer('move', p.x, p.y);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
