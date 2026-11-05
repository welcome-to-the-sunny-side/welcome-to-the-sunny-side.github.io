// Home page glitch (dark skin, desktop only): every few seconds a short burst
// tears horizontal bands of the background sideways with a red/cyan channel
// split, now and then shifts a block, then everything snaps back. Between
// bursts the canvas is empty and nothing runs. The faint rolling band
// underneath is plain CSS (src/styles/home.css), switched on by the
// `live` class this module puts on .home-bg, so this file alone decides when
// anything moves. tools/shots.mjs sets window.__wtssStill to keep it all off.
//
// The canvas sits over .home-bg and redraws the same image the CSS background
// shows (same cover/center fit), so a band left in place is invisible.
const DESKTOP = matchMedia('(min-width: 768px)');
const CALM = matchMedia('(prefers-reduced-motion: reduce)');

let active = null;

// Debug trail for the proof of concept: `__glitchLog` in the console.
const log = (window.__glitchLog = []);
const note = (...m) => {
  log.push(`${Math.round(performance.now())}ms ${m.join(' ')}`);
  if (log.length > 60) log.shift();
};

export function startHomeGlitch() {
  addEventListener('site:load', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  DESKTOP.addEventListener('change', sync);
  CALM.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}

function sync() {
  const el = document.querySelector('.home-bg');
  const want = !!el && !window.__wtssStill && document.documentElement.dataset.skin === 'dark' && DESKTOP.matches && !CALM.matches && !document.hidden;
  note('sync', `el=${!!el}`, `skin=${document.documentElement.dataset.skin}`, `desktop=${DESKTOP.matches}`, `hidden=${document.hidden}`, `want=${want}`, `active=${!!active}`, `sameEl=${active?.el === el}`);
  if (active && (!want || active.el !== el)) {
    active.stop();
    active = null;
  }
  if (want && !active) active = mount(el);
}

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const calm = () => rand(2500, 7000); // the gap between bursts

function mount(el) {
  note('mount');
  const canvas = document.createElement('canvas');
  canvas.className = 'home-glitch';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  el.classList.add('live');
  const ctx = canvas.getContext('2d');

  let img = null;
  let layers = null; // { base, red, cyan } at canvas size, or null when stale
  let timer = 0;
  let raf = 0;
  let stopped = false;

  const resize = new ResizeObserver(() => { layers = null; });
  resize.observe(el);

  // The image is looked up and checked by each burst, not here: in Brave and
  // Edge, at this point (page still loading) .home-bg can report no
  // background yet, and a load event for it may never come. A burst that
  // finds the image not ready is skipped; the next one tries again.
  let im = null;
  note('background at mount', getComputedStyle(el).backgroundImage);
  schedule(rand(800, 2000));

  // For trying it out: run `__glitchNow()` in the console for a burst on demand.
  window.__glitchNow = () => { clearTimeout(timer); burst(); };

  function schedule(ms) {
    note('schedule', Math.round(ms));
    timer = setTimeout(burst, ms);
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(el.clientWidth * dpr);
    const h = Math.round(el.clientHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    const layer = (tint) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      if (tint) {
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = tint;
        g.fillRect(0, 0, w, h);
      }
      return c;
    };
    layers = { base: layer(null), red: layer('#ff0000'), cyan: layer('#00ffff'), w, h, dpr };
  }

  // One frame of a burst: a handful of torn bands, sometimes a moved block.
  function frame(L, strength) {
    const { base, red, cyan, w, h, dpr } = L;
    ctx.clearRect(0, 0, w, h);
    const bands = randInt(1, Math.round(3 + 5 * strength));
    for (let i = 0; i < bands; i++) {
      const bh = Math.round((Math.random() < 0.7 ? rand(2, 18) : rand(20, 90)) * dpr);
      const y = randInt(0, h - bh);
      const dx = Math.round(rand(-1, 1) * rand(6, 60) * strength * dpr);
      const split = Math.round(rand(2, 6) * dpr);
      // Additive red + cyan rebuild the image; offsetting them is the split.
      ctx.globalCompositeOperation = 'lighter';
      band(red, w, y, bh, dx + split);
      band(cyan, w, y, bh, dx - split);
    }
    if (Math.random() < 0.35 * strength) {
      const bw = Math.round(rand(40, 260) * dpr);
      const bh = Math.round(rand(10, 70) * dpr);
      const sx = randInt(0, w - bw);
      const sy = randInt(0, h - bh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(base, sx, sy, bw, bh, sx + Math.round(rand(-80, 80) * dpr), sy + Math.round(rand(-20, 20) * dpr), bw, bh);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Draw a horizontal band of `src` shifted by dx, wrapping at the edges.
  function band(src, w, y, bh, dx) {
    ctx.drawImage(src, 0, y, w, bh, dx, y, w, bh);
    ctx.drawImage(src, 0, y, w, bh, dx - Math.sign(dx || 1) * w, y, w, bh);
  }

  function burst() {
    note('burst', `stopped=${stopped}`, `img=${!!img}`, `el=${el.clientWidth}x${el.clientHeight}`, `connected=${el.isConnected}`);
    if (stopped) return;
    if (!img) {
      if (!im) {
        const bg = getComputedStyle(el).backgroundImage;
        const url = /url\("?(.*?)"?\)/.exec(bg)?.[1];
        if (url) {
          im = new Image();
          im.src = url;
        } else {
          note('no background yet', bg);
        }
      }
      if (!(im?.complete && im.naturalWidth)) {
        schedule(calm()); // not ready: skip this one, the next tries again
        return;
      }
      img = im;
      note('image ready', `${im.naturalWidth}x${im.naturalHeight}`);
    }
    let L;
    try {
      if (!layers) build();
      L = layers;
    } catch (err) {
      note('build failed', err);
      console.warn('[homeGlitch] could not prepare the image', err);
      return;
    }
    const strength = Math.random() < 0.2 ? 1 : rand(0.35, 0.7);
    const end = performance.now() + rand(90, 260) * (0.6 + strength);
    let last = 0;
    const tick = (now) => {
      if (stopped) return;
      if (now >= end) {
        note('burst end', `canvas=${canvas.width}x${canvas.height}`);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Sometimes a quick aftershock, otherwise a calm stretch.
        schedule(Math.random() < 0.3 ? rand(120, 400) : calm());
        return;
      }
      if (now - last > 45) { // ~20 fps: choppy reads as a signal fault
        try {
          frame(L, strength);
        } catch (err) {
          note('frame failed', err);
          console.warn('[homeGlitch] frame failed', err);
        }
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  return {
    el,
    stop() {
      note('stop');
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      resize.disconnect();
      canvas.remove();
      el.classList.remove('live');
      delete window.__glitchNow;
    },
  };
}
