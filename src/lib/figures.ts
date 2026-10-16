// Build-time inlining of SVG figures.
//
// Server-only, like prerender.ts (its only caller). A markdown page marks a
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

const svgSources = import.meta.glob('/src/figures/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const palettes = import.meta.glob('/src/figures/**/palette.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PLACEHOLDER = /(<div\b[^>]*\bdata-svg="([^"]+)"[^>]*>)\s*(<\/div>)/g;

export function inlineFigures(html: string): string {
  const styled = new Set<string>();
  return html.replace(PLACEHOLDER, (_, open: string, src: string, close: string) => {
    const svg = svgSources['/src/figures/' + src];
    if (svg === undefined) throw new Error(`figure not found: src/figures/${src}`);
    const dir = src.slice(0, src.lastIndexOf('/') + 1);
    let style = '';
    if (!styled.has(dir)) {
      styled.add(dir);
      const css = palettes['/src/figures/' + dir + 'palette.css'];
      if (css === undefined) throw new Error(`figure palette not found: src/figures/${dir}palette.css`);
      style = `<style>${css}</style>`;
    }
    return style + open + svg.replace('<svg ', '<svg aria-hidden="true" ').trim() + close;
  });
}
