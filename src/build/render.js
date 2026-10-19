// Markdown page → finished HTML: markdown-it, then math typeset by MathJax,
// then SVG figures inlined (in that order: MathJax would read the `$` in
// figure text as math). Also gives headings ids (collected for the blog
// contents tree) and derives the page's meta description.
import { getRenderer } from '../lib/markdown.js';
import { parseFrontmatter } from './frontmatter.js';
import { typesetMath } from './typesetMath.js';
import { inlineFigures } from './figures.js';

export async function renderMarkdown(raw) {
  const { fm, body } = parseFrontmatter(raw);
  const md = await getRenderer();
  const html = md.render(body);
  const { html: anchored, headings } = anchorHeadings(html);
  return {
    fm,
    html: inlineFigures(await typesetMath(anchored)),
    headings,
    // From markdown-it's output: in typeset math only the screen-reader MathML has text.
    description: describe(html),
  };
}

/** Gives each markdown heading an id; returns them as [{ level, id, text }] in document order. */
function anchorHeadings(html) {
  const headings = [];
  const taken = new Set();
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const text = htmlToText(inner);
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    headings.push({ level: Number(level), id, text });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html, headings };
}

/** Plain-text <meta name="description">: the first substantial paragraph, falling back to the whole text. */
function describe(html) {
  const paragraphs = [...html.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)]
    .map((m) => htmlToText(m[0]))
    .filter((t) => t.length >= 40);
  const text = paragraphs[0] ?? htmlToText(html);
  if (!text) return null;
  return text.length > 160 ? text.slice(0, 157).trimEnd() + '…' : text;
}

function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
