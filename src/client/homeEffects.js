// Animated home page backgrounds: one effect per skin, desktop only (from
// 768px). An effect takes the .home-bg element, starts animating it and
// returns a function that stops it and cleans up. One runs while the home
// page is shown in a visible tab; it is stopped or swapped as soon as that
// changes (navigation, skin, window size, tab switch). tools/shots.mjs sets
// window.__wtssStill to keep them off, since they're random.
import { glitch } from './homeGlitch.js';
import { ripple } from './homeRipple.js';

const EFFECTS = { dark: glitch, sunny: ripple };
const DESKTOP = matchMedia('(min-width: 768px)');

let running = null; // { el, effect, stop }

export function startHomeEffects() {
  addEventListener('site:load', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  DESKTOP.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}

function sync() {
  const el = document.querySelector('.home-bg');
  const on = el && DESKTOP.matches && !document.hidden && !window.__wtssStill;
  const effect = on ? EFFECTS[document.documentElement.dataset.skin] : undefined;
  if (running && (running.el !== el || running.effect !== effect)) {
    running.stop();
    running = null;
  }
  if (effect && !running) running = { el, effect, stop: effect(el) };
}
