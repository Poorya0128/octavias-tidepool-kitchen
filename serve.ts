// Local play server for Octavia's Tidepool Kitchen (Node 22, standard library only).
// `node serve.ts` serves game/ at http://localhost:8080 (`--port 9000` picks another port).
// It answers GET and HEAD for files inside game/ only, with the content types the game uses.

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join, resolve, sep } from 'node:path';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portFlag = process.argv.indexOf('--port');
const port = portFlag > 0 ? Number(process.argv[portFlag + 1]) : 8080;

/** The game ships HTML and ES modules only; images are listed for the screenshots folder. */
const TYPES = new Map<string, string>([
  ['.js', 'text/javascript; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json'],
  ['.jpg', 'image/jpeg'],
]);

/** The file under game/ a request path names, or null when it would leave game/. */
function fileFor(urlPath: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(new URL(urlPath, 'http://local').pathname);
  } catch {
    return null;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(gameRoot, path));
  return file === gameRoot || file.startsWith(gameRoot + sep) ? file : null;
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  const file = fileFor(req.url ?? '/');
  if (!file) {
    res.writeHead(403).end('outside game/');
    return;
  }
  let size: number;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  const type = TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'cache-control': 'no-store' });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Octavia's Tidepool Kitchen: http://localhost:${port}`));
