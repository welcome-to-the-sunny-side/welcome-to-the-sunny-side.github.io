// Sunny skin home effect (see homeEffects.js): loose shards drift out of the
// storm. The painted shards form a tunnel around a vanishing point behind the
// girl; these come out of it small and slowly spiral towards the viewer,
// growing as they come, spinning and tumbling like paper, until they leave
// the frame and a new one takes their place.
//
// Positions are in the sunny pc image's own pixels, mapped with its
// cover/center fit, so they hold at any window size. If that image is
// replaced, update IMAGE and EYE.
const IMAGE = [1500, 1049]; // public/assets/home/active/sunny/pc/
const EYE = [660, 570]; // the storm's vanishing point
const COUNT = 36;
const COLOURS = ['#2e2220', '#2e2220', '#3d302c', '#e9e5e3']; // mostly dark, as painted
const FAR = 6; // depth at which a shard appears (1 = image plane)
const NEAR = 0.3; // depth at which it has passed the viewer
const APPROACH = 0.18; // per second: depth shrinks by this fraction (steady zoom)
const LIFE = Math.log(FAR / NEAR) / APPROACH; // seconds from FAR to NEAR

const rand = (a, b) => a + Math.random() * (b - a);

export function shards(el) {
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  const ctx = canvas.getContext('2d');

  let fit = null; // image-to-canvas mapping, null when stale
  const resize = new ResizeObserver(() => { fit = null; });
  resize.observe(el);

  // Start with shards already spread through the tunnel, as if it had been
  // running all along; the whole layer fades in instead.
  const list = Array.from({ length: COUNT }, () => spawn(FAR * Math.exp(-APPROACH * rand(0, LIFE))));
  const t0 = performance.now();
  let last = t0;
  let raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    canvas.remove();
  };

  function spawn(z = FAR) {
    const a = rand(0, Math.PI * 2);
    const b = a + rand(1.7, 2.5);
    const c = b + rand(1.7, 2.5);
    const r = () => rand(0.55, 1);
    return {
      z,
      angle: rand(0, Math.PI * 2), // around the vanishing point
      swirl: rand(0.03, 0.08) * (Math.random() < 0.85 ? 1 : -1), // radians per second
      dist: rand(140, 950), // from the vanishing point at depth 1, image pixels
      size: rand(22, 55), // at depth 1, image pixels
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.5, 0.5),
      tumble: rand(0, Math.PI * 2),
      flip: rand(0.4, 1.4),
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      shape: [a, b, c].flatMap((t) => { const k = r(); return [Math.cos(t) * k, Math.sin(t) * k]; }),
    };
  }

  function measure() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = (canvas.width = Math.round(el.clientWidth * dpr));
    const h = (canvas.height = Math.round(el.clientHeight * dpr));
    const s = Math.max(w / IMAGE[0], h / IMAGE[1]);
    return { w, h, s, x: (w - IMAGE[0] * s) / 2, y: (h - IMAGE[1] * s) / 2 };
  }

  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const f = (fit ??= measure());
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, f.w, f.h);
    const fadeIn = Math.min(1, (now - t0) / 1500);

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.z *= Math.exp(-APPROACH * dt);
      p.angle += p.swirl * dt;
      p.rot += p.spin * dt;
      p.tumble += p.flip * dt;
      const x = f.x + (EYE[0] + (Math.cos(p.angle) * p.dist) / p.z) * f.s;
      const y = f.y + (EYE[1] + (Math.sin(p.angle) * p.dist * 0.8) / p.z) * f.s;
      const k = (p.size / p.z) * f.s;
      if (p.z < NEAR || x < -k || x > f.w + k || y < -k || y > f.h + k) list[i] = spawn();
    }
    list.sort((a, b) => b.z - a.z); // far ones first, near ones on top

    for (const p of list) {
      const x = f.x + (EYE[0] + (Math.cos(p.angle) * p.dist) / p.z) * f.s;
      const y = f.y + (EYE[1] + (Math.sin(p.angle) * p.dist * 0.8) / p.z) * f.s;
      const k = (p.size / p.z) * f.s;
      const t = Math.cos(p.tumble); // tumbling: squash along one axis, flipping through
      const cos = Math.cos(p.rot) * k;
      const sin = Math.sin(p.rot) * k;
      ctx.setTransform(cos, sin, -sin * t, cos * t, x, y);
      ctx.globalAlpha = fadeIn * Math.min(1, (FAR - p.z) / 1.5); // fade in out of the distance
      ctx.fillStyle = p.colour;
      const s = p.shape;
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      ctx.lineTo(s[2], s[3]);
      ctx.lineTo(s[4], s[5]);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }
}
