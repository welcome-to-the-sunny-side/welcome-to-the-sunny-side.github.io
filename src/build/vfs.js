// The virtual file system: src/content/**/*.{md,html} as a tree, with every
// .md presented as .html (users only ever see rendered filenames). It decides
// which pages get built, and a compact copy of it is bundled into the
// terminal, which lists and navigates it.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const CONTENT = 'src/content';

/**
 * @returns {{
 *   files: { path: string, src: string, kind: 'md' | 'html', raw: string }[],
 *   dirs: string[],
 *   tree: object,
 *   dates: Record<string, number>,
 * }}
 * `path` is the VFS path ("/algo/theory/sais.html"), `src` the source file.
 * `tree` is the terminal's copy: directories are objects, files are 0.
 * `dates` maps VFS paths to epoch millis, for date-sorted `ls`.
 */
export function scanContent() {
  const files = [];
  const dirs = ['/'];
  const tree = {};
  const walk = (dir, node, vdir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        const vpath = vdir + ent.name;
        dirs.push(vpath);
        walk(src, (node[ent.name] = {}), vpath + '/');
        continue;
      }
      const ext = path.extname(ent.name);
      if (ext !== '.md' && ext !== '.html') continue;
      const name = ent.name.replace(/\.md$/, '.html');
      node[name] = 0;
      files.push({ path: vdir + name, src, kind: ext.slice(1), raw: readFileSync(src, 'utf8') });
    }
  };
  walk(CONTENT, tree, '/');

  const dates = {};
  for (const f of files) {
    const date = f.kind === 'md' ? frontmatterDate(f.raw) : metaDate(f.raw);
    const ts = date ? Date.parse(date) : NaN;
    if (Number.isFinite(ts)) dates[f.path] = ts;
  }
  files.sort((a, b) => (a.path < b.path ? -1 : 1));
  return { files, dirs: dirs.sort(), tree, dates };
}

function frontmatterDate(md) {
  const fm = md.match(/^---\s*[\r\n]([\s\S]*?)\n---/);
  const m = fm?.[1].match(/^\s*date:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  return m ? m[1] : null;
}

// Raw HTML pages can carry a date for `ls -d` with <meta name="wtss:date" content="YYYY-MM-DD">.
function metaDate(html) {
  const m = html.match(/<meta\s+name=["']wtss:date["']\s+content=["'](\d{4}-\d{2}-\d{2})["'][^>]*>/i);
  return m ? m[1] : null;
}

/** Directory listing as the terminal and the index pages show it: dirs, then files, each sorted. */
export function listDir(tree, dirPath) {
  let node = tree;
  for (const part of dirPath.split('/').filter(Boolean)) node = node[part];
  const names = Object.keys(node);
  const dirs = names.filter((n) => typeof node[n] === 'object').sort();
  const files = names.filter((n) => typeof node[n] !== 'object').sort();
  return [...dirs.map((name) => ({ name, isDir: true })), ...files.map((name) => ({ name, isDir: false }))];
}
