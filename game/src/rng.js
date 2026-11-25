/**
 * Seeded pseudo-random numbers (mulberry32), so a night with the same seed plays the same way.
 */

/** Creates a random generator; `next()` returns a float in [0, 1). */
export function createRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Float in [lo, hi). */
    range: (lo, hi) => lo + (hi - lo) * next(),
    /** Integer in [0, n). */
    int: (n) => Math.floor(next() * n),
    /** One element of a non-empty array. */
    pick: (list) => list[Math.floor(next() * list.length)],
    /** One key of a { key: weight } table, chosen by weight. */
    weighted(table) {
      const entries = Object.entries(table);
      let roll = next() * entries.reduce((sum, [, w]) => sum + w, 0);
      for (const [key, w] of entries) {
        roll -= w;
        if (roll < 0) return key;
      }
      return entries[entries.length - 1][0];
    },
  };
}
