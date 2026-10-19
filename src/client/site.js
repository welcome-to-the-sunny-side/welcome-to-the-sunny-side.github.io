// Entry point for every page. The page arrives fully rendered and skinned;
// this adds client-side navigation, the skin toggle, the terminal pane and a
// few touch-ups that need the browser (local dates, math that needs the real
// column width, client-typeset math on raw HTML pages).
import { push, startRouter } from './router.js';
import { cycleSkin, labelSkinToggles } from './skin.js';
import { startPane } from './pane.js';
import { isPage } from './vfs.js';
import { typeset, rebreakDisplayMath } from './mathjax.js';

// Links and breadcrumbs to pages of the site navigate in place.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const crumb = e.target.closest('[data-href]');
  if (crumb) {
    push(crumb.dataset.href);
    return;
  }
  if (e.target.closest('.skin-toggle')) {
    cycleSkin();
    return;
  }
  const a = e.target.closest('a[href]');
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !isPage(url.pathname)) return;
  if (url.hash && url.pathname === location.pathname) return; // in-page anchor
  e.preventDefault();
  push(url.pathname);
});

// Spoilers start closed, so their display math can only be measured once opened.
document.addEventListener('toggle', (e) => {
  if (e.target.open) rebreakDisplayMath();
}, true);

addEventListener('site:load', enhance);

startRouter();
startPane();
enhance();

function enhance() {
  labelSkinToggles();
  for (const el of document.querySelectorAll('[data-date]')) {
    el.textContent = new Date(el.dataset.date).toLocaleDateString();
  }
  const main = document.querySelector('main[data-mathjax]');
  if (main) typeset([main]);
  rebreakDisplayMath();
}
