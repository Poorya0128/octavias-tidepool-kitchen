/**
 * Every sound is synthesised with WebAudio: bubble pops, sizzle, chop clicks, the serve bell,
 * coin blips, ink puffs, the Spring Tide horn and a soft plucked-string loop that quickens in a
 * Spring Tide and gains a bass arpeggio while the Ink Streak runs hot.
 */

const SCALE = [0, 3, 5, 7, 10, 12, 15];
const MELODY = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, 4];
const ARPEGGIO = [0, 7, 12, 7, 3, 7, 12, 15];

/** Creates the audio system; nothing plays until the first user gesture unlocks it. */
export function createAudio() {
  return { ctx: null, master: null, music: null, muted: false, musicStep: 0, nextNote: 0, noise: null };
}

/** Starts the audio context on a user gesture. */
export function unlockAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  audio.ctx = new AC();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = audio.muted ? 0 : 0.55;
  audio.master.connect(audio.ctx.destination);
  audio.music = audio.ctx.createGain();
  audio.music.gain.value = 0.22;
  audio.music.connect(audio.master);
  const len = audio.ctx.sampleRate;
  audio.noise = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = audio.noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  audio.nextNote = audio.ctx.currentTime + 0.1;
}

/** Mutes or unmutes everything. */
export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master) audio.master.gain.setTargetAtTime(muted ? 0 : 0.55, audio.ctx.currentTime, 0.02);
}

/** A single oscillator note with an attack-decay envelope. */
function tone(audio, { freq, type = 'sine', dur = 0.15, vol = 0.3, slide = 0, at = 0, dest = null }) {
  const c = audio.ctx;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest ?? audio.master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A filtered noise burst for sizzles, chops, puffs and whooshes (the filter can sweep). */
function hiss(audio, { dur = 0.2, vol = 0.2, freq = 3000, q = 0.8, type = 'bandpass', at = 0, slide = 0 }) {
  const c = audio.ctx;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = audio.noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(audio.master);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

const SOUNDS = {
  grab: (a) => tone(a, { freq: 520, slide: 380, dur: 0.09, vol: 0.18 }),
  place: (a) => tone(a, { freq: 300, slide: 500, dur: 0.12, vol: 0.2 }),
  chop: (a) => hiss(a, { dur: 0.05, vol: 0.25, freq: 2400, q: 2 }),
  chopDone: (a) => tone(a, { freq: 660, dur: 0.1, vol: 0.15, type: 'triangle' }),
  cookPerfect: (a) => { tone(a, { freq: 1046, dur: 0.14, vol: 0.16, type: 'triangle' }); tone(a, { freq: 1568, dur: 0.3, vol: 0.13, at: 0.08 }); },
  overdone: (a) => tone(a, { freq: 420, dur: 0.12, vol: 0.12, type: 'square' }),
  flipReady: (a) => tone(a, { freq: 740, dur: 0.08, vol: 0.12, type: 'square' }),
  flip: (a) => hiss(a, { dur: 0.35, vol: 0.22, freq: 4200, q: 0.6 }),
  cookBurnt: (a) => { hiss(a, { dur: 0.7, vol: 0.22, freq: 900, slide: -600, q: 0.5, type: 'lowpass' }); tone(a, { freq: 150, slide: -80, dur: 0.5, vol: 0.1, type: 'sawtooth' }); },
  take: (a) => tone(a, { freq: 600, slide: 200, dur: 0.1, vol: 0.16 }),
  stir: (a) => hiss(a, { dur: 0.25, vol: 0.14, freq: 700, slide: 500, q: 3 }),
  plateAdd: (a) => tone(a, { freq: 760, dur: 0.08, vol: 0.14, type: 'triangle' }),
  finish: (a) => { tone(a, { freq: 523, dur: 0.12, vol: 0.18, type: 'triangle' }); tone(a, { freq: 784, dur: 0.18, vol: 0.16, type: 'triangle', at: 0.08 }); },
  serve: (a) => { tone(a, { freq: 1568, dur: 0.9, vol: 0.16 }); tone(a, { freq: 2349, dur: 0.7, vol: 0.08, at: 0.01 }); tone(a, { freq: 988, dur: 0.12, vol: 0.12, type: 'square', at: 0.12 }); },
  miss: (a) => tone(a, { freq: 330, slide: -160, dur: 0.4, vol: 0.18, type: 'sawtooth' }),
  trash: (a) => hiss(a, { dur: 0.3, vol: 0.2, freq: 500, q: 0.7, type: 'lowpass' }),
  invalid: (a) => tone(a, { freq: 200, dur: 0.08, vol: 0.12, type: 'square' }),
  noArm: (a) => { tone(a, { freq: 240, dur: 0.08, vol: 0.14, type: 'square' }); tone(a, { freq: 180, dur: 0.1, vol: 0.14, type: 'square', at: 0.09 }); },
  spawn: (a) => tone(a, { freq: 990, dur: 0.07, vol: 0.08, type: 'triangle' }),
  rushWarn: (a) => tone(a, { freq: 220, slide: 220, dur: 0.6, vol: 0.14, type: 'sawtooth' }),
  rushStart: (a) => { tone(a, { freq: 196, dur: 0.7, vol: 0.18, type: 'sawtooth' }); tone(a, { freq: 294, dur: 0.7, vol: 0.12, type: 'sawtooth', at: 0.05 }); },
  orderChanged: (a) => tone(a, { freq: 700, slide: -300, dur: 0.2, vol: 0.14, type: 'triangle' }),
  twinBonus: (a) => { tone(a, { freq: 1046, dur: 0.1, vol: 0.12 }); tone(a, { freq: 1318, dur: 0.14, vol: 0.12, at: 0.08 }); },
  criticVerdict: (a) => { for (let i = 0; i < 4; i++) tone(a, { freq: 523 * 2 ** (i / 4), dur: 0.15, vol: 0.12, type: 'triangle', at: i * 0.08 }); },
  inkReady: (a) => { for (let i = 0; i < 6; i++) tone(a, { freq: 784 * 2 ** (i / 6), dur: 0.3, vol: 0.07, at: i * 0.05 }); },
  inkBurst: (a) => {
    hiss(a, { dur: 0.7, vol: 0.28, freq: 300, slide: 2400, q: 1.2 });
    for (let i = 0; i < 6; i++) tone(a, { freq: 260 + i * 70, slide: 420, dur: 0.07, vol: 0.12, at: 0.08 + i * 0.07 });
  },
  nightOver: (a) => { for (let i = 0; i < 3; i++) tone(a, { freq: 392 * 2 ** (i / 3), dur: 0.4, vol: 0.14, type: 'triangle', at: i * 0.14 }); },
  click: (a) => tone(a, { freq: 880, dur: 0.05, vol: 0.1, type: 'triangle' }),
};

/** Plays the sound for a game event, if any. */
export function playEvent(audio, type) {
  if (!audio.ctx || audio.muted) return;
  SOUNDS[type]?.(audio);
}

/**
 * Schedules the plucked-string loop a little ahead of time: faster during a Spring Tide (`rush`),
 * with a bass arpeggio under it while the Ink Streak is x2 or more (`hot`). After a pause or a
 * mute it picks up from now instead of replaying the beats it missed.
 */
export function updateMusic(audio, playing, { rush = false, hot = false } = {}) {
  if (!audio.ctx || audio.muted || !playing) return;
  const c = audio.ctx;
  const beat = rush ? 0.2 : 0.27;
  if (audio.nextNote < c.currentTime) audio.nextNote = c.currentTime + 0.05;
  while (audio.nextNote < c.currentTime + 0.25) {
    const step = audio.musicStep % MELODY.length;
    const note = SCALE[MELODY[step]];
    const freq = 220 * 2 ** (note / 12);
    const at = audio.nextNote - c.currentTime;
    tone(audio, { freq, dur: 0.45, vol: 0.5, type: 'triangle', at, dest: audio.music });
    if (step % 4 === 0) tone(audio, { freq: freq / 2, dur: 0.6, vol: 0.4, at, dest: audio.music });
    if (hot) tone(audio, { freq: 110 * 2 ** (ARPEGGIO[step % ARPEGGIO.length] / 12), dur: 0.2, vol: 0.22, type: 'square', at, dest: audio.music });
    audio.musicStep++;
    audio.nextNote += beat;
  }
}
