#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcContentDir = path.resolve(projectRoot, 'src/content');
const outDir = path.resolve(projectRoot, 'public');
const outFile = path.join(outDir, 'vfs-date-index.json');

/**
 * Recursively walk a directory and return absolute file paths
 */
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (ent) => {
      const res = path.resolve(dir, ent.name);
      if (ent.isDirectory()) return walk(res);
      return res;
    })
  );
  return files.flat();
}

function extractFrontmatterDate(md) {
  const fm = md.match(/^---\s*[\r\n]([\s\S]*?)\n---/);
  if (!fm) return null;
  const body = fm[1];
  const m = body.match(/^\s*date:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  return m ? m[1] : null;
}

function extractHtmlMetaDate(html) {
  const m = html.match(/<meta\s+name=["']wtss:date["']\s+content=["'](\d{4}-\d{2}-\d{2})["'][^>]*>/i);
  return m ? m[1] : null;
}

function toVirtualHtmlPath(absFile) {
  // absFile starts with src/content/... Replace prefix and map .md to .html
  const rel = path.relative(srcContentDir, absFile).split(path.sep).join('/');
  const isMd = rel.toLowerCase().endsWith('.md');
  const virt = '/' + (isMd ? rel.replace(/\.md$/i, '.html') : rel);
  return virt;
}

async function main() {
  try {
    const all = await walk(srcContentDir);
    const index = {};
    for (const file of all) {
      const ext = path.extname(file).toLowerCase();
      if (ext !== '.md' && ext !== '.html') continue;
      const raw = await fs.readFile(file, 'utf8');
      let dateStr = null;
      if (ext === '.md') dateStr = extractFrontmatterDate(raw);
      else dateStr = extractHtmlMetaDate(raw);
      if (!dateStr) continue;
      const ts = Date.parse(dateStr);
      if (!Number.isFinite(ts)) continue;
      const virt = toVirtualHtmlPath(file);
      index[virt] = ts;
    }
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outFile, JSON.stringify(index, null, 2));
    const count = Object.keys(index).length;
    console.log(`[vfs-date-index] Wrote ${count} entries to ${path.relative(projectRoot, outFile)}`);
  } catch (err) {
    console.error('[vfs-date-index] Failed:', err);
    process.exitCode = 1;
  }
}

main();
