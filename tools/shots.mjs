#!/usr/bin/env node
// Visual regression harness. Builds nothing: run `npm run build` first.
//
//   node tools/shots.mjs capture <outDir>          screenshot every page + scripted sessions
//   node tools/shots.mjs compare <dirA> <dirB>      pixel-diff two captures (diffs go to <dirB>-diff/)
//
// Needs Playwright; in the Claude Code cloud container it is installed
// globally, so run with NODE_PATH=/opt/node-tools/node_modules.
//
// Captures, for each page and skin: the desktop viewport (terminal visible),
// the desktop content pane at full height, and the mobile page at full
// height. Sessions drive the terminal and the mobile nav and screenshot each
// step. cdn.jsdelivr.net (MathJax and its fonts) is served from node_modules,
// so the harness works offline and pins the same versions the build uses.
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PORT = 4399;
const BASE = `http://localhost:${PORT}`;
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SKINS = ['dark', 'sunny'];

// Lets the content pane grow to its full height on desktop, where it is
// normally a scroll container next to the terminal; the shot is of <main> only.
const FULL_HEIGHT_CSS = `
  html, body, :has(> main), main { height: auto !important; max-height: none !important; overflow: visible !important; }
`;

async function walkHtml(dir, base = dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'assets' || ent.name === 'musings') continue;
      out.push(...(await walkHtml(p, base)));
    } else if (ent.name.endsWith('.html') && ent.name !== '404.html') {
      out.push('/' + path.relative(base, p).split(path.sep).join('/'));
    }
  }
  return out.sort();
}

async function routeCdn(context) {
  await context.route('https://cdn.jsdelivr.net/npm/**', async (route) => {
    const m = new URL(route.request().url()).pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/);
    if (!m) return route.abort();
    let [, pkg, rest] = m;
    if (pkg === 'mathjax') { pkg = '@mathjax/src'; rest = 'bundle/' + rest; }
    try {
      const body = await readFile(path.join('node_modules', pkg, rest));
      const type = rest.endsWith('.js') ? 'text/javascript' : rest.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
      await route.fulfill({ body, contentType: type, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch {
      await route.abort();
    }
  });
  // Analytics: irrelevant to visuals and slows networkidle.
  await context.route('https://www.googletagmanager.com/**', (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
}

async function newContext(browser, viewport, skin, extra = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  await context.addInitScript((s) => {
    try { localStorage.setItem('wtss-skin', s); } catch {}
  }, skin);
  await routeCdn(context);
  return context;
}

async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

const fileName = (url, suffix) => (url.replace(/^\//, '').replace(/[/]/g, '__') || 'root') + `.${suffix}.png`;

async function capturePages(browser, outDir, pages) {
  const jobs = [];
  for (const skin of SKINS) {
    jobs.push({ skin, mode: 'desk' }, { skin, mode: 'full' }, { skin, mode: 'mob' });
  }
  await Promise.all(jobs.map(async ({ skin, mode }) => {
    const context = await newContext(browser, mode === 'mob' ? MOBILE : DESKTOP, skin, mode === 'mob' ? { isMobile: true, hasTouch: true } : {});
    const page = await context.newPage();
    for (const url of pages) {
      await page.goto(BASE + url);
      await settle(page);
      const out = path.join(outDir, 'pages', fileName(url, `${skin}.${mode}`));
      if (mode === 'full') {
        await page.addStyleTag({ content: FULL_HEIGHT_CSS });
        await page.waitForTimeout(200);
        await page.locator('main').screenshot({ path: out });
      } else {
        await page.screenshot({ path: out, fullPage: mode === 'mob' });
      }
    }
    await context.close();
  }));
}

async function terminalSession(browser, outDir, skin) {
  const context = await newContext(browser, DESKTOP, skin);
  const page = await context.newPage();
  const dir = path.join(outDir, 'session-terminal-' + skin);
  await mkdir(dir, { recursive: true });
  let n = 0;
  const shot = async (label, full = false) => {
    await page.waitForTimeout(450); // xterm smooth-scrolls for 120ms
    const name = `${String(++n).padStart(2, '0')}-${label}.png`;
    if (full) await page.screenshot({ path: path.join(dir, name) });
    else await page.locator('aside').screenshot({ path: path.join(dir, name) });
  };
  const run = async (cmd, label, wait = 0) => {
    await page.keyboard.type(cmd, { delay: 5 });
    await page.keyboard.press('Enter');
    if (wait) await settle(page, wait);
    await shot(label, !!wait);
  };

  await page.goto(BASE + '/home.html');
  await settle(page);
  await shot('initial', true);
  await run('help', 'help');
  await run('clear', 'clear');
  await run('ls', 'ls');
  await run('ls -r -v', 'ls-r-v');
  await run('clear', 'clear2');
  await run('ls -d algo', 'ls-d');
  await run('ls -de algo', 'ls-de');
  await run('cd algo/theo', 'cd-bad');
  await page.keyboard.type('cd algo/th', { delay: 5 });
  await shot('ghost');
  await page.keyboard.press('Tab');
  await shot('tab-accept');
  await page.keyboard.press('Enter');
  await shot('cd-done');
  await page.keyboard.type('open ', { delay: 5 });
  await shot('ghost-open');
  await page.keyboard.press('Shift+Tab');
  await shot('shift-tab-cycle');
  await page.keyboard.press('Shift+Tab');
  await shot('shift-tab-cycle2');
  await page.keyboard.press('Control+Backspace');
  await shot('ctrl-backspace');
  await run('open sais.html', 'open-sais', 1500);
  await shot('open-sais-terminal');
  await run('clear', 'clear3');
  await run('open ../../life/icpc.html', 'open-icpc', 1500);
  await run('open ../../misc/cf-archiver.html', 'open-html-page', 1500);
  await run('open ../../home.html', 'open-home', 1500);
  await run('pop', 'pop', 1500);
  await run('clear', 'clear4');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await shot('history-up');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X', { delay: 5 });
  await shot('mid-insert');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('End');
  await run('', 'enter-pop', 1500);
  await run('clear', 'clear5');
  await page.keyboard.type('ls ' + 'a/'.repeat(40), { delay: 1 });
  await shot('long-wrap');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
  await shot('long-wrap-backspace');
  await page.keyboard.press('Control+Backspace');
  await shot('long-wrap-ctrl-bs');
  await page.keyboard.press('Enter');
  await run('clear', 'clear6');
  await run('tskins', 'tskins');
  await run('tskin dracula', 'tskin-dracula');
  await run('ls', 'ls-dracula');
  await run('tskin classic', 'tskin-classic');
  await run('cskins', 'cskins');
  await run(`cskin ${skin === 'dark' ? 'sunny' : 'dark'}`, 'cskin-switch', 500);
  await run(`cskin ${skin}`, 'cskin-back', 500);
  await run('cd /algo', 'cd-algo');
  await run('open index.html', 'open-dir-index', 1500);
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(500);
  await shot('collapsed', true);
  await page.keyboard.press('Shift+ArrowLeft');
  await page.waitForTimeout(700);
  await shot('expanded', true);
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('j');
  await page.waitForTimeout(700);
  await shot('vim-scroll-blurred', true);
  await page.goBack();
  await settle(page, 1500);
  await shot('browser-back', true);
  await context.close();
}

async function mobileSession(browser, outDir, skin) {
  const context = await newContext(browser, MOBILE, skin, { isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const dir = path.join(outDir, 'session-mobile-' + skin);
  await mkdir(dir, { recursive: true });
  let n = 0;
  const shot = async (label) => {
    await settle(page, 600);
    await page.screenshot({ path: path.join(dir, `${String(++n).padStart(2, '0')}-${label}.png`) });
  };
  await page.goto(BASE + '/home.html');
  await shot('home');
  await page.locator('nav').getByText('~', { exact: true }).click();
  await shot('root-index');
  await page.locator('main a', { hasText: 'algo' }).first().click();
  await shot('algo-index');
  await page.locator('main a', { hasText: 'theory' }).first().click();
  await shot('theory-index');
  await page.locator('main a', { hasText: 'sais.html' }).first().click();
  await shot('sais');
  await page.locator('nav').getByText('theory', { exact: true }).click();
  await shot('crumb-back');
  await page.locator('nav button[aria-label^="Switch skin"]').click();
  await shot('skin-toggled');
  await page.goBack();
  await shot('browser-back');
  await context.close();
}

async function capture(outDir) {
  const pages = await walkHtml('dist');
  await mkdir(path.join(outDir, 'pages'), { recursive: true });
  const server = await serve('dist', PORT);
  const browser = await chromium.launch();
  try {
    await Promise.all([
      capturePages(browser, outDir, pages),
      ...SKINS.map((s) => terminalSession(browser, outDir, s)),
      ...SKINS.map((s) => mobileSession(browser, outDir, s)),
    ]);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`captured ${pages.length} pages into ${outDir}`);
}

async function listPngs(dir, base = dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await listPngs(p, base)));
    else if (ent.name.endsWith('.png')) out.push(path.relative(base, p));
  }
  return out.sort();
}

async function compare(dirA, dirB) {
  const a = new Set(await listPngs(dirA));
  const b = new Set(await listPngs(dirB));
  const diffDir = dirB.replace(/\/$/, '') + '-diff';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const rows = [];
  for (const name of [...new Set([...a, ...b])].sort()) {
    if (!a.has(name) || !b.has(name)) {
      rows.push({ name, status: a.has(name) ? 'missing in B' : 'missing in A' });
      continue;
    }
    const [ia, ib] = await Promise.all([readFile(path.join(dirA, name)), readFile(path.join(dirB, name))]);
    if (ia.equals(ib)) continue;
    const res = await page.evaluate(async ([sa, sb]) => {
      const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
      const [A, B] = await Promise.all([load(sa), load(sb)]);
      const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
      const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
      const da = px(A), db = px(B);
      const out = new OffscreenCanvas(w, h); const ox = out.getContext('2d'); const od = ox.createImageData(w, h);
      let bad = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
        if (d > 0) { bad++; od.data[i] = 255; od.data[i + 3] = 255; }
        else { od.data[i] = od.data[i + 1] = od.data[i + 2] = da[i] * 0.3; od.data[i + 3] = 255; }
      }
      if (!bad) return { bad: 0 };
      ox.putImageData(od, 0, 0);
      const blob = await out.convertToBlob();
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { bad, total: w * h, sizeA: `${A.width}x${A.height}`, sizeB: `${B.width}x${B.height}`, png: btoa(s) };
    }, [ia.toString('base64'), ib.toString('base64')]);
    if (!res.bad) continue;
    const out = path.join(diffDir, name);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(res.png, 'base64'));
    rows.push({ name, status: `${((100 * res.bad) / res.total).toFixed(3)}% px` + (res.sizeA !== res.sizeB ? ` size ${res.sizeA} -> ${res.sizeB}` : '') });
  }
  await browser.close();
  for (const r of rows) console.log(`${r.status.padEnd(40)} ${r.name}`);
  console.log(`${rows.length} differing of ${new Set([...a, ...b]).size}${rows.length ? `; diffs in ${diffDir}` : ''}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'capture' && args[0]) await capture(args[0]);
else if (cmd === 'compare' && args[1]) await compare(args[0], args[1]);
else {
  console.error('usage: shots.mjs capture <outDir> | compare <dirA> <dirB>');
  process.exit(1);
}
