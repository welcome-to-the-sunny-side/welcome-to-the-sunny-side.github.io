// HTML for every page: one shell (head, mobile breadcrumbs, content pane,
// terminal pane) around one of a few content bodies. Skin-dependent styling
// is expressed with Tailwind's `dark:` variant, which tailwind.config.js keys
// on <html data-skin="dark">, so a page needs no JS to wear its skin.

export const SITE_NAME = 'Welcome to the Sunny Side!';
const SITE = 'https://www.welcome-to-the-sunny-side.com';

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The skins' content classes. Both skins use `prose`; dark inverts it and
// sets long-form text in the sans face (code, metadata and terminal stay mono).
// Written out in full: Tailwind only generates classes it finds literally.
const PROSE = 'prose dark:prose-invert';
const PROSE_BODY =
  'dark:prose-headings:font-sans dark:prose-p:font-sans dark:prose-li:font-sans dark:prose-blockquote:font-sans ' +
  'dark:prose-td:font-sans dark:prose-th:font-sans dark:prose-p:tracking-normal dark:prose-li:tracking-normal ' +
  'dark:prose-blockquote:tracking-normal dark:prose-td:tracking-normal dark:prose-th:tracking-normal';
const ROOT_CLASSES = 'h-full bg-bg text-text font-serif dark:font-mono';

// Runs before first paint: puts the saved skin, terminal theme and terminal
// collapse state on <html>, where the CSS picks them up.
const PREPAINT = `(()=>{const d=document.documentElement;try{const s=localStorage.getItem('wtss-skin');if(s==='dark'||s==='sunny')d.dataset.skin=s;const t=localStorage.getItem('wtss-terminal-theme');if(t)d.dataset.tskin=t;if(sessionStorage.getItem('terminalCollapsed')==='true')d.dataset.termCollapsed=''}catch{}})()`;

export function titleForPage(path, fm) {
  if (path === '/' || path === '/home.html') return SITE_NAME;
  if (path.endsWith('/index.html')) {
    const dir = path.replace(/\/index\.html$/, '');
    return `${dir === '' ? '~' : dir} · ${SITE_NAME}`;
  }
  const name = fm?.title || path.split('/').pop().replace(/\.html$/, '');
  return `${name} · ${SITE_NAME}`;
}

/**
 * @param {object} p
 * @param {string} p.path       URL path the page is shown at ("/algo/index.html")
 * @param {string} p.title
 * @param {string} p.body       content pane HTML
 * @param {string} [p.description]
 * @param {string} [p.canonical]   path; omitted for pages that should not be indexed
 * @param {string} [p.markdown]    path of the page's markdown source
 * @param {object} p.assets     { css, js } URLs
 */
export function shell({ path, title, body, description, canonical, markdown, assets, mathjax }) {
  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    description && `<meta name="description" content="${esc(description)}">`,
    canonical ? `<link rel="canonical" href="${SITE}${canonical}">` : `<meta name="robots" content="noindex">`,
    markdown && `<link rel="alternate" type="text/markdown" href="${markdown}">`,
    `<link rel="icon" href="/favicon.ico">`,
    `<link rel="stylesheet" href="${assets.css}">`,
    `<script>${PREPAINT}</script>`,
    `<script type="module" src="${assets.js}"></script>`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=G-FDGES615HV"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-FDGES615HV');</script>`,
  ].filter(Boolean).join('\n');

  // Below md the document itself scrolls (main just grows): iOS WebKit lags
  // scrolling a math-heavy <main> that holds nested scroll areas (code,
  // spoilers). From md up, main is the scroll container next to the terminal.
  return `<!DOCTYPE html>
<html lang="en" class="${ROOT_CLASSES}" data-skin="dark">
<head>
${head}
</head>
<body class="${ROOT_CLASSES}">
<div class="min-h-[100dvh] md:h-screen w-screen grid grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[1fr_auto] md:grid-rows-1">
<div class="md:hidden sticky top-0 z-10">${breadcrumbs(path)}</div>
<main class="overflow-x-clip md:overflow-x-hidden md:overflow-y-auto bg-surface text-text transition-colors duration-150 ease-retro min-h-0"${mathjax ? ' data-mathjax' : ''}>
${body}
</main>
<aside class="hidden md:block">${TERMINAL_PANE}</aside>
</div>
</body>
</html>
`;
}

// Mobile breadcrumb bar: "~ / algo / theory / sais.html" plus the skin toggle.
export function breadcrumbs(path) {
  const parts = path === '/' ? ['home.html'] : path.replace(/^\//, '').split('/');
  const segs = [{ label: '~', href: '/index.html' }];
  parts.forEach((label, i) => {
    const isLast = i === parts.length - 1;
    segs.push({ label, href: isLast ? null : '/' + parts.slice(0, i + 1).join('/') + '/index.html' });
  });
  const items = segs.map((s, i) =>
    (i > 0 ? `<span class="text-accent mx-1 select-none">/</span>` : '') +
    (s.href
      ? `<button class="crumb-link text-text-muted hover:text-accent transition-colors duration-150" data-href="${esc(s.href)}">${esc(s.label)}</button>`
      : `<span class="text-text font-medium">${esc(s.label)}</span>`));
  return `<nav class="md:hidden flex items-center px-3 py-2 bg-surface border-b border-accent-subtle font-mono text-sm">` +
    `<div class="flex-1 flex items-center min-w-0 overflow-x-auto whitespace-nowrap">${items.join('')}</div>` +
    `<button class="skin-toggle flex-shrink-0 ml-3 text-text-muted hover:text-accent transition-colors duration-150 text-base leading-none" aria-label="Switch skin">` +
    `<span class="dark:hidden">☀</span><span class="hidden dark:inline">☾</span></button></nav>`;
}

// The desktop terminal pane; src/client/terminal.js mounts xterm.js in .terminal-shell.
const TERMINAL_PANE =
  `<div class="h-full flex flex-col desktop-wrapper focused">` +
  `<span class="collapsed-label">terminal</span>` +
  `<div class="flex-1 overflow-hidden"><div class="terminal-content">` +
  `<div class="terminal-shell-outer h-full w-full"><div class="terminal-shell"></div></div>` +
  `</div></div></div>`;

export function homeBody() {
  return `<div class="home-bg h-full w-full bg-cover bg-center bg-no-repeat"></div>`;
}

export function navBody(dir, entries) {
  const items = entries.map((e, i) => {
    const branch = i === entries.length - 1 ? '└─' : '├─';
    return `<li class="m-0 p-0"><a href="${esc(e.href)}" class="w-full px-2 py-2 rounded-sm transition-colors duration-150 hover:bg-accent-subtle flex items-center gap-2 no-underline">` +
      `<span class="text-text-muted select-none">${branch}</span> <span class="${e.isDir ? 'text-text' : 'text-accent'}">${esc(e.name)}${e.isDir ? '/' : ''}</span></a></li>`;
  });
  return `<div class="mx-auto max-w-2xl px-4 py-8 bg-surface text-text transition-colors duration-150 ease-retro">` +
    `<h1 class="font-mono text-accent text-lg mb-6">${esc(dir === '/' ? '~' : dir)}</h1> ` +
    `<ul class="list-none p-0 m-0 font-mono text-sm">${items.join('')}</ul></div>`;
}

// A markdown or raw HTML page without a blog header.
export function plainBody(html) {
  return `<div id="content-html-container" class="${PROSE} p-4 max-w-none bg-surface text-text transition-colors duration-150 ease-retro">${html}</div>`;
}

export function blogBody(fm, html, markdownHref, headings = []) {
  // The line under the title: the date (shown in the reader's locale;
  // src/client/site.js rewrites it from data-date) and, at the right, a link
  // to the page's markdown source.
  const meta = `<p class="mt-2 flex justify-between text-xs text-text-muted">` +
    `<span${fm.date ? ` data-date="${esc(fm.date)}"` : ''}>${fm.date ? esc(new Date(fm.date).toLocaleDateString('en-US')) : ''}</span>` +
    `<a href="${esc(markdownHref)}" class="md-source" title="This page's markdown source">(.md)</a></p>`;
  const tags = fm.tags?.length
    ? `<ul class="mt-4 flex flex-wrap gap-2 list-none pl-0">` +
      fm.tags.map((t) => `<li class="rounded-sm border border-accent-subtle px-2 py-1 text-xs font-medium text-text-muted transition-colors duration-150 ease-retro">${esc(t)}</li>`).join('') +
      `</ul>`
    : '';
  return contentsTree(headings) +
    `<section class="${PROSE} mx-auto max-w-4xl px-4 py-6 bg-surface text-text transition-colors duration-150 ease-retro">` +
    `<header class="mb-8">` +
    `<h1 class="font-bold leading-tight tracking-tight mb-3 text-[2.5rem] md:text-[3rem] text-[color:var(--title)] dark:font-sans dark:text-accent">${esc(fm.title ?? 'Untitled')}</h1>` +
    meta + tags +
    `</header>` +
    `<article class="${PROSE} ${PROSE_BODY} max-w-none">${html}</article>` +
    `</section>`;
}

// The blog contents tree (shown beside the post when the terminal is
// collapsed and the window is wide enough; src/styles/toc.css, src/client/toc.js).
// A heading's parent is the nearest earlier heading of a strictly higher level
// (`# ### ##` makes both later headings children of the first); headings with
// none are roots. Only tree depth matters from here on, never heading level.
function contentsTree(headings) {
  if (headings.length < 2) return '';
  const roots = [];
  const stack = [];
  for (const h of headings) {
    const node = { ...h, children: [] };
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    (stack.length ? stack[stack.length - 1].children : roots).push(node);
    stack.push(node);
  }
  const list = (nodes) =>
    `<ul>` +
    nodes.map((n, i) =>
      `<li><a href="#${esc(n.id)}"><span class="toc-branch">${i === nodes.length - 1 ? '└─' : '├─'}</span><span>${esc(n.text)}</span></a>` +
      (n.children.length ? list(n.children) : '') + `</li>`).join('') +
    `</ul>`;
  return `<nav class="toc" aria-label="Contents">${list(roots)}</nav>`;
}
