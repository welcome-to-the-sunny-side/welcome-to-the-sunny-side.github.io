// Post-build: rename dist/**/foo.html.html -> foo.html
//
// VFS slugs already end in ".html" and astro.config sets build.format: 'file',
// so Astro writes "<slug>.html", i.e. "foo.html.html". GitHub Pages happens to
// serve /foo.html from that (it retries with ".html" appended), but
// `astro preview` and most other static hosts do not. Renaming makes the files
// match the URLs the site actually uses.
import { readdirSync, renameSync, unlinkSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');
let renamed = 0;
let removed = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!name.endsWith('.html.html')) continue;
    const target = p.slice(0, -'.html'.length);
    if (existsSync(target)) {
      // dist/index.html already comes from src/pages/index.astro; the root
      // "index.html" slug produces the same home shell. Drop the duplicate.
      unlinkSync(p);
      removed++;
    } else {
      renameSync(p, target);
      renamed++;
    }
  }
}

walk(root);
console.log(`[fix-html-filenames] renamed ${renamed} file(s), removed ${removed} duplicate(s)`);
