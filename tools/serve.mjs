#!/usr/bin/env node
// Minimal static file server for dist/, behaving like GitHub Pages for this
// site: /foo/ and /foo serve index.html, unknown paths get 404.html.
//
//   node tools/serve.mjs [port] [dir]
//
// Also imported by tools/shots.mjs.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

async function resolveFile(root, urlPath) {
  const rel = decodeURIComponent(urlPath.split('?')[0]);
  const file = path.join(root, path.normalize(rel));
  if (!file.startsWith(root)) return null;
  for (const candidate of [file, path.join(file, 'index.html'), file + '.html']) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

export function serve(dir = 'dist', port = 4321) {
  const root = path.resolve(dir);
  const server = http.createServer(async (req, res) => {
    let file = await resolveFile(root, req.url);
    let status = 200;
    if (!file) {
      status = 404;
      file = await resolveFile(root, '/404.html');
    }
    if (!file) {
      res.writeHead(404).end('Not found');
      return;
    }
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] ?? 4321);
  await serve(process.argv[3] ?? 'dist', port);
  console.log(`Serving ${process.argv[3] ?? 'dist'}/ at http://localhost:${port}`);
}
