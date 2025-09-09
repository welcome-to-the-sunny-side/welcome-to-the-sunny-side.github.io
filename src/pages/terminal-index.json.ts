import type { APIRoute } from 'astro';

// Build-time endpoint that emits a JSON map of '/path.html' -> timestamp (ms since epoch)
// for all content files. For Markdown sources, the date is read from front-matter 'date:'.
// For native HTML files, the date is read from <meta name="wtss:date" content="YYYY-MM-DD">.
// Entries without a date are emitted with null.

function extractFrontmatterDate(raw: string): number | null {
  const fm = raw.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!fm) return null;
  const body = fm[1];
  const m = body.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?/m);
  if (!m) return null;
  const ts = Date.parse(m[1]);
  return Number.isNaN(ts) ? null : ts;
}

function extractHtmlDate(raw: string): number | null {
  const m = raw.match(/<meta\s+name=["']wtss:date["']\s+content=["'](\d{4}-\d{2}-\d{2})["'][^>]*>/i);
  if (!m) return null;
  const ts = Date.parse(m[1]);
  return Number.isNaN(ts) ? null : ts;
}

export const GET: APIRoute = async () => {
  const mdModules = import.meta.glob('../content/**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
  const htmlModules = import.meta.glob('../content/**/*.html', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

  const index: Record<string, number | null> = {};

  for (const [key, raw] of Object.entries(mdModules)) {
    // key example: '../content/algo/foo.md' -> '/algo/foo.html'
    const rel = key.replace(/^\.\.\/content\//, '/');
    const htmlPath = rel.replace(/\.md$/, '.html');
    index[htmlPath] = extractFrontmatterDate(raw);
  }

  for (const [key, raw] of Object.entries(htmlModules)) {
    const rel = key.replace(/^\.\.\/content\//, '/');
    const htmlPath = rel; // already .html
    index[htmlPath] = extractHtmlDate(raw);
  }

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  });
};
