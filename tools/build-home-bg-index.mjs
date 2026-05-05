#!/usr/bin/env node
// Walks public/assets/home/active/<skin>/<device>/ and emits a JSON manifest
// the home page fetches at runtime — replaces the eager import.meta.glob in
// ContentPane.svelte, which used to bundle every image URL into the JS chunk.

import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const homeDir = path.resolve(projectRoot, 'public/assets/home/active');
const outFile = path.resolve(projectRoot, 'public/home-bg-index.json');

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function listImages(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && IMG_EXT.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function main() {
  const index = {};
  let skins;
  try {
    skins = (await fs.readdir(homeDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(outFile, '{}');
      console.log('[home-bg-index] No home asset dir; wrote empty index.');
      return;
    }
    throw err;
  }
  for (const skin of skins) {
    const pc = await listImages(path.join(homeDir, skin, 'pc'));
    const mobile = await listImages(path.join(homeDir, skin, 'mobile'));
    index[skin] = {
      pc: pc.map((f) => `/assets/home/active/${skin}/pc/${f}`),
      mobile: mobile.map((f) => `/assets/home/active/${skin}/mobile/${f}`),
    };
  }
  await fs.writeFile(outFile, JSON.stringify(index, null, 2));
  const total = Object.values(index).reduce((n, v) => n + v.pc.length + v.mobile.length, 0);
  console.log(`[home-bg-index] Wrote ${total} entries (${skins.length} skins) to ${path.relative(projectRoot, outFile)}`);
}

main().catch((err) => {
  console.error('[home-bg-index] Failed:', err);
  process.exitCode = 1;
});
