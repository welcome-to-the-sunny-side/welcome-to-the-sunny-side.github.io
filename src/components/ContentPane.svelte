<script lang="ts">
  import { onMount } from 'svelte';
import MarkdownIt from 'markdown-it';

import hljs from 'highlight.js';
import { tick } from 'svelte';
  import { currentPath } from '../stores/router';
  import { readable } from 'svelte/store';

  // Import all markdown under src/content as raw strings
  // load all markdown as raw strings (Vite 5 syntax)
const pages = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default' });

  const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

let path = '/';
  let contentRaw: string = '';
let frontmatter: Record<string, any> = {};
let isBlog = false;
let contentHtml: string = md.render(contentRaw);

function parseFrontmatter(raw: string) {
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const yaml = raw.slice(3, end).trim();
      const body = raw.slice(end + 4); // skip newline
      const obj: Record<string, any> = {};
      for (const line of yaml.split(/\r?\n/)) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val: any = line.slice(idx + 1).trim();
        // strip quotes
        val = val.replace(/^['\"]|['\"]$/g, '');
        // try JSON parse for arrays
        if (val.startsWith('[') && val.endsWith(']')) {
          // naive list parsing: [a, b, c]
          val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^['\\"]|['\\"]$/g, ''));
        }
        obj[key] = val;
      }
      return { fm: obj, body };
    }
  }
  return { fm: {}, body: raw };
}

  const unsub = currentPath.subscribe(async (p) => {
    path = p;
    await loadContent();
  });

  onMount(() => {
    loadContent();
    return () => unsub();
  });

  async function loadContent() {
    // Convert "/blogs/algo/treaps.md" -> "../content/blogs/algo/treaps.md"
    let filePath = path;
    if (filePath === '/') filePath = '/home.html'; // default landing page
    // Convert .html path to matching markdown source
    const mdPath = filePath.replace(/\.html$/, '.md');
    const key = '../content' + mdPath;
    if (key in pages) {
      contentRaw = (await (pages as any)[key]()) as string;
      const { fm, body } = parseFrontmatter(contentRaw);
      frontmatter = fm;
      isBlog = frontmatter.displayMode === 'blog';
      contentHtml = md.render(body);
      await tick();
      if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
        (window as any).MathJax.typesetPromise();
      }
    } else {
      contentRaw = `# 404\nPath not found: ${path}`;
      frontmatter = {};
      isBlog = false;
      contentHtml = md.render(contentRaw);
      await tick();
      if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
        (window as any).MathJax.typesetPromise();
      }
    }
  }
</script>

{#if isBlog}
  <section class="mx-auto max-w-4xl px-4 py-6 bg-surface text-text transition-colors duration-150 ease-retro">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-accent">{frontmatter.title ?? 'Untitled'}</h1>
      {#if frontmatter.date}
        <p class="mt-2 text-xs text-text-muted">{new Date(frontmatter.date).toLocaleDateString()}</p>
      {/if}
      {#if frontmatter.tags && frontmatter.tags.length}
        <ul class="mt-4 flex flex-wrap gap-2">
          {#each frontmatter.tags as tag}
            <li class="rounded-sm border border-accent-subtle px-2 py-1 text-xs font-medium text-text-muted transition-colors duration-150 ease-retro"
            >{tag}</li>
          {/each}
        </ul>
      {/if}
    </header>
    <article class="prose prose-invert max-w-none">
      {@html contentHtml}
    </article>
  </section>
{:else}
  <div class="p-4 prose prose-invert max-w-none bg-surface text-text transition-colors duration-150 ease-retro">
    {@html contentHtml}
  </div>
{/if}
