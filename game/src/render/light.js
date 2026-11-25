/**
 * Light for the kitchen: the mood of each tide night, offscreen layers painted once and reused,
 * soft sprites for glows, shadows, steam and smoke, and a tileable caustic light net.
 */

/**
 * The light of each tide night, by night index: wall gradient, tile accents and grout, the sea
 * in the porthole and the reef seen through the Current Window, and the colours ('r,g,b') and strengths of god rays,
 * caustics, lamps and marine snow. `bio` adds glowing plankton, `storm` lightning, `spot` a
 * golden spotlight on Octavia.
 */
export const MOODS = [
  { wall: ['#0c4c55', '#1d8086'], tiles: ['#53c9b9', '#ffa47f', '#effff8'], grout: '#063038', sea: ['#7fe3f0', '#148aa8'], reef: ['#9beef5', '#2a9cb4'],
    ray: '255,246,206', rays: 0.13, caustic: '196,255,244', caustics: 0.2, lamp: '255,206,130', snow: '236,255,250', vignette: 0.4 },
  { wall: ['#33324f', '#8c5a5c'], tiles: ['#ff8a6b', '#ffc49a', '#5fb3b0'], grout: '#1e1a2c', sea: ['#ffd08a', '#ff8a70', '#5a3f86'], reef: ['#ffd4a8', '#ff9c84', '#6a5296'],
    ray: '255,178,128', rays: 0.15, caustic: '255,206,176', caustics: 0.16, lamp: '255,176,104', snow: '255,226,210', vignette: 0.45 },
  { wall: ['#12173a', '#2b2d6c'], tiles: ['#8a7bff', '#5fe6ff', '#d9d4ff'], grout: '#090b22', sea: ['#323a8c', '#0b0e30'], reef: ['#4f5ab4', '#181d52'],
    ray: '168,190,255', rays: 0.09, caustic: '150,206,255', caustics: 0.13, lamp: '120,236,255', snow: '170,232,255', vignette: 0.55, bio: true },
  { wall: ['#062228', '#0f434a'], tiles: ['#2f948e', '#7aa3b0', '#c9735d'], grout: '#031418', sea: ['#2a5864', '#061c22'], reef: ['#4a8c96', '#163f48'],
    ray: '190,228,236', rays: 0.07, caustic: '160,222,226', caustics: 0.11, lamp: '255,198,124', snow: '204,232,232', vignette: 0.55, storm: true },
  { wall: ['#0f2f45', '#21586a'], tiles: ['#ffd36e', '#46ada2', '#fff1cc'], grout: '#08182a', sea: ['#ffd98a', '#2a6070'], reef: ['#ffe4a8', '#3a8292'],
    ray: '255,216,122', rays: 0.15, caustic: '255,232,168', caustics: 0.18, lamp: '255,206,112', snow: '255,240,200', vignette: 0.5, spot: true },
];

/** The mood of a night (Slack Tide when the night is unknown). */
export function moodFor(state) {
  return MOODS[state?.nightIndex ?? 0] ?? MOODS[0];
}

/** A vertical gradient from y0 to y1 through evenly spaced colours. */
export function verticalGradient(ctx, y0, y1, colors) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col));
  return g;
}

const canvases = new Map();

/**
 * An offscreen canvas of w x h logical pixels at the screen's pixel density (or a fixed
 * `density` for soft layers), painted once by `paint(c)` in local coordinates and repainted
 * only if the density changes.
 */
function cachedCanvas(ctx, key, w, h, paint, density = null) {
  const k = density ?? Math.min(2, Math.max(1, Math.round(ctx.getTransform().a * 2) / 2));
  let entry = canvases.get(key);
  if (!entry || entry.k !== k) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * k);
    canvas.height = Math.ceil(h * k);
    const c = canvas.getContext('2d');
    c.scale(k, k);
    paint(c);
    entry = { k, canvas };
    canvases.set(key, entry);
  }
  return entry.canvas;
}

/** Draws a cached layer at (x, y); see cachedCanvas. */
export function drawCached(ctx, key, x, y, w, h, paint, density = null) {
  ctx.drawImage(cachedCanvas(ctx, key, w, h, paint, density), x, y, w, h);
}

const sprites = new Map();

/** A 64 px soft round sprite of one colour ('r,g,b') fading to transparent. */
function softSprite(rgb) {
  let sprite = sprites.get(rgb);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const c = sprite.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(0.4, `rgba(${rgb},0.5)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    sprites.set(rgb, sprite);
  }
  return sprite;
}

/** A soft puff of colour with normal blending: steam, smoke, haze. */
export function puff(ctx, x, y, r, rgb, alpha = 1, ry = r) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(softSprite(rgb), x - r, y - ry, r * 2, ry * 2);
  ctx.globalAlpha = 1;
}

/** Additive light of radius r (vertical radius ry) at (x, y). */
export function glow(ctx, x, y, r, rgb, alpha = 1, ry = r) {
  if (alpha <= 0.01) return;
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  puff(ctx, x, y, r, rgb, alpha, ry);
  ctx.globalCompositeOperation = op;
}

/** A soft dark contact shadow under an object resting on a surface. */
export function contactShadow(ctx, x, y, rx, ry, alpha = 0.5) {
  puff(ctx, x, y, rx, '2,16,20', alpha, ry);
}

/** A tileable caustic net, `n` x `n * squash` px: the bright cell edges of a wrapped cellular noise, in white. */
function causticNet(n, squash) {
  const key = `net:${n}:${squash}`;
  let net = sprites.get(key);
  if (net) return net;
  const cells = 4;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([(i + 0.2 + rnd() * 0.6) / cells, (j + 0.2 + rnd() * 0.6) / cells]);
  const h = Math.round(n * squash);
  net = document.createElement('canvas');
  net.width = n;
  net.height = h;
  const c = net.getContext('2d');
  const img = c.createImageData(n, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < n; x++) {
      let f1 = 9;
      let f2 = 9;
      for (const [px, py] of pts) {
        const dx = Math.min(Math.abs(x / n - px), 1 - Math.abs(x / n - px));
        const dy = Math.min(Math.abs(y / h - py), 1 - Math.abs(y / h - py));
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < f1) [f1, f2] = [d, f1];
        else if (d < f2) f2 = d;
      }
      const e = Math.max(0, 1 - (f2 - f1) / 0.04);
      const k = (y * n + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = 255 * e * e * (3 - 2 * e);
    }
  }
  c.putImageData(img, 0, 0);
  sprites.set(key, net);
  return net;
}

/** The caustic net tinted one colour ('r,g,b'). */
function causticTile(rgb, n, squash) {
  const key = `caustic:${rgb}:${n}:${squash}`;
  let tile = sprites.get(key);
  if (tile) return tile;
  const net = causticNet(n, squash);
  tile = document.createElement('canvas');
  tile.width = net.width;
  tile.height = net.height;
  const c = tile.getContext('2d');
  c.drawImage(net, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = `rgb(${rgb})`;
  c.fillRect(0, 0, tile.width, tile.height);
  sprites.set(key, tile);
  return tile;
}

const patterns = new Map();

/**
 * Adds a shimmering caustic light net over a rectangle: two nets of different sizes drifting
 * against each other at whole-pixel offsets (cheap to fill); `squash` flattens them for
 * horizontal surfaces.
 */
export function drawCaustics(ctx, rect, rgb, alpha, t, squash = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const [n, vx, vy, a] of [[240, 14, 6, 1], [170, -9, 11, 0.7]]) {
    const key = `${rgb}:${n}:${squash}`;
    let pattern = patterns.get(key);
    if (!pattern) patterns.set(key, (pattern = ctx.createPattern(causticTile(rgb, n, squash), 'repeat')));
    const h = Math.round(n * squash);
    const ox = Math.round(((t * vx) % n) + n) % n;
    const oy = Math.round(((t * vy * squash) % h) + h) % h;
    ctx.save();
    ctx.globalAlpha = alpha * a;
    ctx.translate(rect.x + ox - n, rect.y + oy - h);
    ctx.fillStyle = pattern;
    ctx.fillRect(n - ox, h - oy, rect.w, rect.h);
    ctx.restore();
  }
  ctx.restore();
}
