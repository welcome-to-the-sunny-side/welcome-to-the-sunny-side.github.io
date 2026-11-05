// Dark skin home effect (see homeEffects.js): every few seconds a short burst
// tears horizontal bands of the background sideways with a red/cyan channel
// split, sometimes shifts a block, then snaps back. Between bursts the canvas
// is empty and nothing runs.
//
// The canvas redraws the background image itself, with the same cover/center
// fit, so a band left in place is invisible.
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const calm = () => rand(2500, 7000); // the gap between bursts

export function glitch(el) {
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  const ctx = canvas.getContext('2d');

  let im = null;
  let layers = null; // the image at canvas size: plain, red only, cyan only
  let timer = setTimeout(burst, rand(800, 2000));
  let raf = 0;
  const resize = new ResizeObserver(() => { layers = null; });
  resize.observe(el);

  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    resize.disconnect();
    canvas.remove();
  };

  // Is the background image loaded? Looked up lazily and polled, not awaited:
  // in Brave and Edge, while the page is still loading, .home-bg can report no
  // background yet, and a load event for it may never come.
  function ready() {
    if (!im) {
      const url = /url\("?(.*?)"?\)/.exec(getComputedStyle(el).backgroundImage)?.[1];
      if (!url) return false;
      im = new Image();
      im.src = url;
    }
    return im.complete && im.naturalWidth > 0;
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = (canvas.width = Math.round(el.clientWidth * dpr));
    const h = (canvas.height = Math.round(el.clientHeight * dpr));
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const dw = im.naturalWidth * s;
    const dh = im.naturalHeight * s;
    const layer = (tint) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
      if (tint) {
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = tint;
        g.fillRect(0, 0, w, h);
      }
      return c;
    };
    return { base: layer(null), red: layer('#ff0000'), cyan: layer('#00ffff'), w, h, dpr };
  }

  function burst() {
    if (!ready()) {
      timer = setTimeout(burst, calm()); // skip this one; the next tries again
      return;
    }
    const L = (layers ??= build());
    const strength = Math.random() < 0.2 ? 1 : rand(0.35, 0.7);
    const end = performance.now() + rand(90, 260) * (0.6 + strength);
    let last = 0;
    const tick = (now) => {
      if (now >= end) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Sometimes a quick aftershock, otherwise a calm stretch.
        timer = setTimeout(burst, Math.random() < 0.3 ? rand(120, 400) : calm());
        return;
      }
      if (now - last > 45) { // ~20 fps: choppy reads as a signal fault
        frame(L, strength);
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // One frame of a burst: a handful of torn bands, sometimes a moved block.
  function frame({ base, red, cyan, w, h, dpr }, strength) {
    ctx.clearRect(0, 0, w, h);
    // Additive red + cyan rebuild the image; offsetting them is the split.
    ctx.globalCompositeOperation = 'lighter';
    const bands = randInt(1, Math.round(3 + 5 * strength));
    for (let i = 0; i < bands; i++) {
      const bh = Math.round((Math.random() < 0.7 ? rand(2, 18) : rand(20, 90)) * dpr);
      const y = randInt(0, h - bh);
      const dx = Math.round(rand(-1, 1) * rand(6, 60) * strength * dpr);
      const split = Math.round(rand(2, 6) * dpr);
      band(red, w, y, bh, dx + split);
      band(cyan, w, y, bh, dx - split);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.35 * strength) {
      const bw = Math.round(rand(40, 260) * dpr);
      const bh = Math.round(rand(10, 70) * dpr);
      const sx = randInt(0, w - bw);
      const sy = randInt(0, h - bh);
      ctx.drawImage(base, sx, sy, bw, bh, sx + Math.round(rand(-80, 80) * dpr), sy + Math.round(rand(-20, 20) * dpr), bw, bh);
    }
  }

  // Draw a horizontal band of `src` shifted by dx, wrapping at the edges.
  function band(src, w, y, bh, dx) {
    ctx.drawImage(src, 0, y, w, bh, dx, y, w, bh);
    ctx.drawImage(src, 0, y, w, bh, dx - Math.sign(dx || 1) * w, y, w, bh);
  }
}
