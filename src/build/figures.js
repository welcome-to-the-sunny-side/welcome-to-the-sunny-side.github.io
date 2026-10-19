// Inlining of SVG figures, run on each rendered markdown page. A page marks a
// figure with an empty placeholder:
//
//   <div class="svg-figure" data-svg="sais/slope-view.svg" role="img" aria-label="..."></div>
//
// and this swaps in the contents of src/figures/sais/slope-view.svg. Inline
// (rather than <img>) so the page's CSS reaches inside the figure.
//
// Each folder is one figure set with its own palette.css, which sets the
// set's --fig-* colours per skin (keyed on <html data-skin>). It is inlined
// once, before the page's first figure from that folder, so skins carry no
// figure-specific variables and pages without figures get no extra CSS.
//
// Runs after typesetMath: MathJax would read the `$` in figure text as math.
import { readFileSync } from 'node:fs';

const FIGURES = 'src/figures/';
const PLACEHOLDER = /(<div\b[^>]*\bdata-svg="([^"]+)"[^>]*>)\s*(<\/div>)/g;

function read(file, what) {
  try {
    return readFileSync(FIGURES + file, 'utf8');
  } catch {
    throw new Error(`${what} not found: ${FIGURES}${file}`);
  }
}

export function inlineFigures(html) {
  const styled = new Set();
  return html.replace(PLACEHOLDER, (_, open, src, close) => {
    const svg = read(src, 'figure');
    const dir = src.slice(0, src.lastIndexOf('/') + 1);
    let style = '';
    if (!styled.has(dir)) {
      styled.add(dir);
      style = `<style>${read(dir + 'palette.css', 'figure palette')}</style>`;
    }
    return style + open + svg.replace('<svg ', '<svg aria-hidden="true" ').trim() + close;
  });
}
