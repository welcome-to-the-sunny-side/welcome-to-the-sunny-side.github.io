#!/usr/bin/env node
// Builds the whole site into dist/:
//
//   - one static page per VFS file (src/content/**/*.{md,html}; .md shown as .html)
//     and one index page per directory, all sharing the shell in src/build/templates.js
//   - /<path>.md (each markdown page's source), /llms.txt and /sitemap.xml
//   - /site.css (Tailwind + plain CSS) and /js/ (src/client, bundled by esbuild)
//   - everything in public/, copied as is
//
// Usage: node build.js
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import esbuild from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from './tailwind.config.js';
import { scanContent, listDir } from './src/build/vfs.js';
import { renderMarkdown } from './src/build/render.js';
import { shell, titleForPage, homeBody, navBody, plainBody, blogBody } from './src/build/templates.js';
import { themeCss } from './src/client/terminalThemes.js';

const OUT = 'dist';
const SITE = 'https://www.welcome-to-the-sunny-side.com';
// "/" and "/index.html" are both served by dist/index.html, which is the home
// page. The root directory listing (what the terminal and the "~" crumb open
// as /index.html) is built here instead; the client router fetches it.
const ROOT_INDEX_FILE = '/root-index.html';
// Browsers the CSS and JS are lowered and prefixed for.
const TARGET = ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'];

const started = Date.now();
rmSync(OUT, { recursive: true, force: true });
cpSync('public', OUT, { recursive: true });

const { files, dirs, tree, dates } = scanContent();
const assets = { css: await buildCss(), js: await buildJs() };

const write = (urlPath, content) => {
  const file = path.join(OUT, urlPath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

// Home: "/" (canonical) and "/home.html". src/content/home.md only puts it in the VFS.
const home = shell({ path: '/home.html', title: titleForPage('/home.html'), body: homeBody(), canonical: '/', assets });
write('/index.html', home);
write('/home.html', home);

const markdownPages = [];
for (const f of files) {
  if (f.path === '/home.html') continue;
  if (f.kind === 'html') {
    const html = stripDocumentTags(f.raw);
    write(f.path, shell({
      path: f.path, title: titleForPage(f.path), body: plainBody(html), canonical: f.path, assets,
      // Raw pages are not typeset at build time (arbitrary HTML may not survive
      // MathJax's parser); the client typesets them, only if they contain math.
      mathjax: hasMath(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')),
    }));
    continue;
  }
  const { fm, html, description } = await renderMarkdown(f.raw);
  const markdown = f.path.replace(/\.html$/, '.md');
  const body = fm.displayMode === 'blog' ? blogBody(fm, html, markdown) : plainBody(html);
  write(f.path, shell({ path: f.path, title: titleForPage(f.path, fm), body, description, canonical: f.path, markdown, assets }));
  write(markdown, f.raw);
  markdownPages.push({ path: f.path, title: fm.title, markdown });
}

for (const dir of dirs) {
  const urlPath = dir === '/' ? '/index.html' : dir + '/index.html';
  const entries = listDir(tree, dir).map((e) => {
    const child = (dir === '/' ? '' : dir) + '/' + e.name;
    return { ...e, href: e.isDir ? child + '/index.html' : child };
  });
  write(dir === '/' ? ROOT_INDEX_FILE : urlPath, shell({
    path: urlPath, title: titleForPage(urlPath), body: navBody(dir, entries),
    canonical: dir === '/' ? null : urlPath, assets,
  }));
}

write('/sitemap.xml', sitemap());
write('/llms.txt', llmsTxt());
console.log(`built ${files.length} pages + ${dirs.length} indexes in ${Date.now() - started}ms`);

// ---------------------------------------------------------------------------

async function buildJs() {
  const result = await esbuild.build({
    // musings.js and its worker are used by src/content/misc/void.html.
    entryPoints: ['src/client/site.js', 'src/client/musings.js', 'src/client/musingsWorker.js'],
    outdir: path.join(OUT, 'js'),
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    target: TARGET,
    entryNames: '[name]',
    chunkNames: '[name]-[hash]',
    // The terminal's copy of the VFS (see src/build/vfs.js).
    define: { VFS_TREE: JSON.stringify(tree), VFS_DATES: JSON.stringify(dates) },
    // xterm.css is part of /site.css.
    loader: { '.css': 'empty' },
    logLevel: 'warning',
  });
  if (result.errors.length) process.exit(1);
  return '/js/site.js?v=' + hash(readFileSync(path.join(OUT, 'js/site.js')));
}

async function buildCss() {
  const from = 'src/styles/global.css';
  const tw = await postcss([tailwindcss(tailwindConfig)]).process(readFileSync(from, 'utf8'), { from });
  // Order matters where selectors tie: global + Tailwind, xterm.css, the
  // terminal pane, then generated rules.
  const contents = [
    tw.css,
    readFileSync('node_modules/xterm/css/xterm.css', 'utf8'),
    readFileSync('src/styles/terminal.css', 'utf8'),
    themeCss(),
    homeBackgroundCss(),
  ].join('\n');
  const result = await esbuild.build({
    stdin: { contents, loader: 'css', resolveDir: 'src/styles', sourcefile: 'site.css' },
    bundle: true,
    minify: true,
    target: TARGET,
    external: ['/assets/*'], // the home backgrounds (site URLs, not files to bundle)
    write: false,
    logLevel: 'warning',
  });
  const css = result.outputFiles[0].contents;
  writeFileSync(path.join(OUT, 'site.css'), css);
  return '/site.css?v=' + hash(css);
}

// The home page background: one image per skin and device class, picked
// from public/assets/home/active/<skin>/<pc|mobile>/ (first file by name).
function homeBackgroundCss() {
  const root = 'public/assets/home/active';
  const first = (dir) => {
    try {
      return readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()[0];
    } catch {
      return undefined;
    }
  };
  const rules = [];
  for (const skin of readdirSync(root)) {
    for (const [device, media] of [['pc', null], ['mobile', '(max-width: 767.98px)']]) {
      const img = first(path.join(root, skin, device));
      if (!img) continue;
      const rule = `:root[data-skin="${skin}"] .home-bg{background-image:url("/assets/home/active/${skin}/${device}/${img}")}`;
      rules.push(media ? `@media ${media}{${rule}}` : rule);
    }
  }
  return rules.join('\n');
}

// A raw HTML page is a document fragment inside the content pane: drop the
// tags that only make sense at the top level (the browser would ignore them
// there anyway, as it did when these pages were inserted with innerHTML).
function stripDocumentTags(html) {
  return html.replace(/<!DOCTYPE[^>]*>/i, '').replace(/<\/?(html|head|body)\b[^>]*>/gi, '');
}

function hasMath(html) {
  return /\$|\\\(|\\\[/.test(html.replace(/<[^>]+>/g, ''));
}

function sitemap() {
  const urls = ['/', ...files.map((f) => f.path).filter((p) => p !== '/home.html'), ...dirs.filter((d) => d !== '/').map((d) => d + '/index.html')];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.sort().map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + `\n</urlset>\n`;
}

// /llms.txt (llmstxt.org): an index of the posts for AI agents, pointing at their markdown sources.
function llmsTxt() {
  const lines = markdownPages.map((p) => `- [${p.title || p.path.slice(1, -'.html'.length)}](${SITE}${p.markdown})`);
  return `# ${'Welcome to the Sunny Side!'}\n\n` +
    `> Personal site and blog: algorithms (problems, theory, contests), literature, life and miscellany.\n\n` +
    `Each page at ${SITE}/<path>.html has its markdown source at ${SITE}/<path>.md; ` +
    `math is TeX between $...$ / $$...$$. Prefer the markdown when reading a post.\n\n` +
    `## Pages\n\n` + lines.join('\n') + '\n';
}

function hash(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 10);
}
