// Production server for hosting the course online (`npm start`, after `npm run build`).
// Serves the built site from dist/ and adds the same voice + progress endpoints the dev
// server has. No dependencies: plain Node.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from './tts-server.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 5181);
const api = createHandler(root);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(dist, rel);
  // stay inside dist/, and only hand out real files
  if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.statusCode = 404;
    return res.end('not found');
  }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('cache-control', rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  fs.createReadStream(file).pipe(res);
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing — run "npm run build" first.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    api(req, res, () => serveStatic(req, res)).catch?.(() => {
      res.statusCode = 500;
      res.end('error');
    });
  })
  .listen(port, '0.0.0.0', () => console.log(`functions-journey is running on port ${port}`));
