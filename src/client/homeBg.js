// Helpers shared by the home page effects (see homeEffects.js).
export const rand = (a, b) => a + Math.random() * (b - a);

// The .home-bg background image, looked up lazily: call the returned function
// until it gives the loaded image (null before that). Polled, not awaited: in
// Brave and Edge, while the page is still loading, .home-bg can report no
// background yet, and a load event for it may never come.
export function backgroundImage(el) {
  let im = null;
  return () => {
    if (!im) {
      const url = /url\("?(.*?)"?\)/.exec(getComputedStyle(el).backgroundImage)?.[1];
      if (!url) return null;
      im = new Image();
      im.src = url;
    }
    return im.complete && im.naturalWidth > 0 ? im : null;
  };
}

// How a background-size: cover; background-position: center image of iw×ih
// sits in a w×h box: drawn at scale s with its top left corner at (x, y).
export function cover(w, h, iw, ih) {
  const s = Math.max(w / iw, h / ih);
  return { s, x: (w - iw * s) / 2, y: (h - ih * s) / 2 };
}

// A canvas laid over .home-bg, sized to it in device pixels by fit().
export function overlay(el) {
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
  canvas.setAttribute('aria-hidden', 'true');
  el.append(canvas);
  canvas.fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(el.clientWidth * dpr);
    canvas.height = Math.round(el.clientHeight * dpr);
    return dpr;
  };
  return canvas;
}
