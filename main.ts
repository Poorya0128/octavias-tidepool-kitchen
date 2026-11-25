// Octavia's Tidepool Kitchen: the entry program for make.fun's cooking game bounty.
// Node 22, standard library only, no build. It hands in the game exactly as it sits in this
// repository: game/ (static files a desktop browser plays offline) and screenshots/ (the
// cover first by name) are copied to the output directory, and dossier.json is written there
// with the make.fun library, byte for byte what the scorer rebuilds.
//
// The grader runs it with /output writable; anywhere else set MAKEFUN_OUTPUT_DIR:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { buildDossier } from './vendor/makefun-game.ts';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');

/** The scorer's caps from the bounty's gate: only text_max_bytes shapes the bytes, the rest refuse. */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Refuses early, with a readable reason, an entry the scorer would refuse. */
function checkEntry(): string[] {
  if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
  const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f) && !f.startsWith('.')).sort() : [];
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    throw new Error(`screenshots/ must hold 3 or 4 images, it holds ${shots.length}`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > CAPS.screenshots.max_bytes) throw new Error(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
  return shots;
}

checkEntry();
mkdirSync(output, { recursive: true });
cpSync(gameDir, join(output, 'game'), { recursive: true });
cpSync(shotsDir, join(output, 'screenshots'), { recursive: true });
writeFileSync(join(output, 'dossier.json'), buildDossier(output, CAPS));
