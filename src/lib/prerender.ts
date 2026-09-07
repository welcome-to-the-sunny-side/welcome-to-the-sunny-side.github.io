// Build-time pre-rendering of content pages.
//
// Runs only inside the Astro frontmatter of [...slug].astro (Node, at build
// time) — nothing here is shipped to the browser. It produces the same HTML
// that ContentPane.svelte would produce client-side, so the static page is
// readable without JavaScript (agents, search engines, link previews) and the
// Svelte island can hydrate over it without re-rendering.
//
// Pages that stay client-only (returned as kind 'client'):
//   - `displayMode: musings` (MusingsStream fetches + decrypts at runtime)
//   - raw .html content (contains inline <script>s that ContentPane re-executes
//     after mount; pre-rendering would run them twice)
import { list as vfsList, isDir } from './virtualFs';
import { parseFrontmatter } from './frontmatter';
import { getRenderer } from './markdown';
import type { InitialContent, NavEntry } from './contentTypes';
import { titleForPage } from './pageTitle';

export type { InitialContent, NavEntry };

// Eager raw import of every markdown source. Server-only: this glob lives in a
// module that only [...slug].astro imports, so it never enters a client chunk.
const mdSources = import.meta.glob('/src/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function navEntriesFor(dirPath: string): NavEntry[] {
  const children = vfsList(dirPath) || [];
  return children.map((name) => {
    const childPath = dirPath === '/' ? '/' + name : dirPath + '/' + name;
    const dir = isDir(childPath);
    return { name, path: dir ? childPath + '/index.html' : childPath, isDir: dir };
  });
}

/** Resolve a VFS path (e.g. "/algo/theory/foo.html") to its initial content. */
export async function prerenderPath(path: string): Promise<InitialContent> {
  // The client router maps "/" to "/home.html", so the root index.html file
  // (what "/" serves) is pre-rendered as home rather than the root listing.
  if (path === '/' || path === '/home.html' || path === '/index.html') {
    return { kind: 'home', path: '/home.html' };
  }

  if (path.endsWith('/index.html')) {
    const dirPath = path.replace(/\/index\.html$/, '');
    if (isDir(dirPath)) {
      return { kind: 'nav', path, navDir: dirPath, entries: navEntriesFor(dirPath) };
    }
  }

  const mdKey = '/src/content' + path.replace(/\.html$/, '.md');
  const raw = mdSources[mdKey];
  if (raw === undefined) return { kind: 'client', path };

  const { fm, body } = parseFrontmatter(raw);
  if (fm.displayMode === 'musings') return { kind: 'client', path };

  const md = await getRenderer();
  return { kind: 'md', path, html: md.render(body), frontmatter: fm };
}

/** <title> for the page. */
export function pageTitle(initial: InitialContent): string {
  return titleForPage(initial.path, initial.kind === 'md' ? initial.frontmatter : null);
}

/** Plain-text <meta name="description"> derived from the rendered body:
 *  the first substantial paragraph, falling back to the whole text. */
export function pageDescription(initial: InitialContent): string | null {
  if (initial.kind !== 'md') return null;
  const paragraphs = [...initial.html.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)]
    .map((m) => htmlToText(m[0]))
    .filter((t) => t.length >= 40);
  const text = paragraphs[0] ?? htmlToText(initial.html);
  if (!text) return null;
  return text.length > 160 ? text.slice(0, 157).trimEnd() + '…' : text;
}

function htmlToText(html: string): string {
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
