// Client-side navigation. Every page is a static HTML file; navigating fetches
// the target page and swaps its <main>, breadcrumbs and head metadata into the
// current document, so the terminal (and its history) survive. Pages fire
// `site:load` on window after each swap and once at startup.
//
// Navigations started with push() (terminal, links, breadcrumbs) also fire
// `site:navstart` / `site:navend`, which drive the terminal's spinner.
// Back/forward swaps silently.

// "/" and "/index.html" are both served by dist/index.html (the home page);
// the root directory listing lives here instead (see build.js).
const ROOT_INDEX_FILE = '/root-index.html';
const resolve = (path) => (path === '/' ? '/home.html' : path);

let current = resolve(location.pathname);
let loading = false;
let latest = 0;

export const currentPath = () => current;
export const isLoading = () => loading;

/** Navigate to a site path, adding a history entry. */
export function push(path) {
  path = resolve(path);
  if (path === location.pathname) {
    // Nothing to load, but whoever started it (the terminal) awaits the end.
    dispatchEvent(new Event('site:navstart'));
    dispatchEvent(new Event('site:navend'));
    return;
  }
  // We restore scroll positions ourselves on back/forward (the browser would
  // do it before the page is swapped in). Only from here on: a plain reload
  // keeps the browser's own restoration.
  history.scrollRestoration = 'manual';
  saveScroll();
  history.pushState({}, '', path);
  current = path;
  loading = true;
  dispatchEvent(new Event('site:navstart'));
  load(path, 0).then((done) => {
    if (!done) return;
    loading = false;
    dispatchEvent(new Event('site:navend'));
  });
}

export function startRouter() {
  addEventListener('popstate', () => {
    current = resolve(location.pathname);
    load(current, history.state?.scroll ?? 0);
  });
  if (location.pathname === '/') history.replaceState({}, '', '/home.html');
  // The static /index.html is the home page; show the root listing instead.
  if (location.pathname === '/index.html') load('/index.html', 0);
}

// The content pane scrolls on desktop, the document on mobile.
const scroller = () => (matchMedia('(min-width: 768px)').matches ? document.querySelector('main') : document.scrollingElement);

function saveScroll() {
  history.replaceState({ ...history.state, scroll: scroller().scrollTop }, '');
}

/** Fetch and show a page; resolves false if a newer navigation overtook it. */
async function load(path, scrollTop) {
  const id = ++latest;
  let html;
  try {
    const res = await fetch(path === '/index.html' ? ROOT_INDEX_FILE : path);
    if (!res.ok) throw new Error(res.statusText);
    html = await res.text();
  } catch {
    location.reload();
    return false;
  }
  if (id !== latest) return false;
  swap(new DOMParser().parseFromString(html, 'text/html'));
  scroller().scrollTop = scrollTop;
  await runScripts(document.querySelector('main'));
  dispatchEvent(new Event('site:load'));
  return true;
}

const HEAD_TAGS = ['meta[name="description"]', 'meta[name="robots"]', 'link[rel="canonical"]', 'link[rel="alternate"]'];

function swap(doc) {
  document.title = doc.title;
  for (const sel of HEAD_TAGS) {
    document.head.querySelector(sel)?.remove();
    const tag = doc.head.querySelector(sel);
    if (tag) document.head.append(tag);
  }
  document.querySelector('nav').replaceWith(doc.querySelector('nav'));
  const main = document.querySelector('main');
  const next = doc.querySelector('main');
  main.toggleAttribute('data-mathjax', next.hasAttribute('data-mathjax'));
  main.replaceChildren(...next.childNodes);
}

// Scripts parsed by DOMParser never run, so recreate each one, in order
// (waiting for external scripts, as the parser would on a first load). Module
// scripts only ever run once per page lifetime; such a page should do its
// work on `site:load` too.
async function runScripts(root) {
  await new Promise(requestAnimationFrame);
  for (const old of root.querySelectorAll('script')) {
    const script = document.createElement('script');
    for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
    script.textContent = old.textContent;
    const loaded = script.src && !script.hasAttribute('async') && script.type !== 'module'
      ? new Promise((r) => { script.onload = script.onerror = r; })
      : null;
    old.replaceWith(script);
    await loaded;
  }
}
