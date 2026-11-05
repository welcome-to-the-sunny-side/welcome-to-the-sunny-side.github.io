// Home page glitch (dark skin, desktop only): every few seconds a short burst
// tears horizontal bands of the background sideways with a red/cyan channel
// split, now and then shifts a block, then everything snaps back. Between
// bursts the canvas is empty and nothing runs. The faint rolling band and
// flicker underneath are plain CSS (src/styles/home.css).
//
// The canvas sits over .home-bg and redraws the same image the CSS background
// shows (same cover/center fit), so a band left in place is invisible.
const DESKTOP = matchMedia('(min-width: 768px)');
const CALM = matchMedia('(prefers-reduced-motion: reduce)');

let active = null;

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
  const want = !!el && document.documentElement.dataset.skin === 'dark' && DESKTOP.matches && !CALM.matches && !document.hidden;
  if (active && (!want || active.el !== el)) {
    active.stop();
    active = null;
  }
  if (want && !active) active = mount(el);
}

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

function mount(el) {
  const canvas = document.createElement('canvas');
  canvas.className = 'home-glitch';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  const ctx = canvas.getContext('2d');

  let img = null;
  let layers = null; // { base, red, cyan } at canvas size, or null when stale
  let timer = 0;
  let raf = 0;
  let stopped = false;

  const resize = new ResizeObserver(() => { layers = null; });
  resize.observe(el);

  const url = /url\("?(.*?)"?\)/.exec(getComputedStyle(el).backgroundImage)?.[1];
  if (url) {
    const im = new Image();
    im.src = url;
    im.decode().then(() => {
      if (stopped) return;
      img = im;
      schedule(rand(800, 2000));
    }, () => {});
  }

  function schedule(ms) {
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
      const c = new OffscreenCanvas(w, h);
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
  function frame(strength) {
    const { base, red, cyan, w, h, dpr } = layers;
    ctx.clearRect(0, 0, w, h);
    const bands = randInt(1, Math.round(3 + 5 * strength));
    for (let i = 0; i < bands; i++) {
      const bh = Math.round((Math.random() < 0.7 ? rand(2, 18) : rand(20, 90)) * dpr);
      const y = randInt(0, h - bh);
      const dx = Math.round(rand(-1, 1) * rand(6, 60) * strength * dpr);
      const split = Math.round(rand(2, 6) * dpr);
      // Additive red + cyan rebuild the image; offsetting them is the split.
      ctx.globalCompositeOperation = 'lighter';
      band(red, y, bh, dx + split);
      band(cyan, y, bh, dx - split);
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
  function band(src, y, bh, dx) {
    const w = layers.w;
    ctx.drawImage(src, 0, y, w, bh, dx, y, w, bh);
    ctx.drawImage(src, 0, y, w, bh, dx - Math.sign(dx || 1) * w, y, w, bh);
  }

  function burst() {
    if (stopped) return;
    if (!layers) build();
    const strength = Math.random() < 0.2 ? 1 : rand(0.35, 0.7);
    const end = performance.now() + rand(90, 260) * (0.6 + strength);
    let last = 0;
    const tick = (now) => {
      if (stopped) return;
      if (now >= end) {
        ctx.clearRect(0, 0, layers.w, layers.h);
        // Sometimes a quick aftershock, otherwise a calm stretch.
        schedule(Math.random() < 0.3 ? rand(120, 400) : rand(2500, 7000));
        return;
      }
      if (now - last > 45) { // ~20 fps: choppy reads as a signal fault
        frame(strength);
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  return {
    el,
    stop() {
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      resize.disconnect();
      canvas.remove();
    },
  };
}
