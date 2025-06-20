<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
import MarkdownIt from 'markdown-it';

import hljs from 'highlight.js';
import { tick } from 'svelte';
import { currentSkin } from '../stores/skin';
  import { currentPath } from '../stores/router';
  import { readable } from 'svelte/store';

  // Import all markdown under src/content as raw strings
  // load all markdown as raw strings (Vite 5 syntax)
const pagesMd = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default' });
const pagesHtml = import.meta.glob('../content/**/*.html', { query: '?raw', import: 'default' });

  const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: (str: string, lang: string): string => {
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
let backgroundImagePC: string | null = null;
let backgroundImageMobile: string | null = null;
let isMobileView: boolean = false;
let htmlContainer: HTMLDivElement | null = null;

// Subscribe to skin store
$: skin = $currentSkin;

  // Reactive statement for currentBackgroundImage
  $: currentBackgroundImage = isMobileView && backgroundImageMobile ? backgroundImageMobile : backgroundImagePC;
  $: isHomeWithBackground = (path === '/' || path === '/home.html') && currentBackgroundImage;

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

    const checkMobile = () => {
      isMobileView = typeof window !== 'undefined' && window.innerWidth < 768; // md: 768px
    };

    if (typeof window !== 'undefined') {
      checkMobile(); // Initial check
      window.addEventListener('resize', checkMobile);
    }

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile);
      }
    };
  });

  async function loadContent() {
    // Convert "/blogs/algo/treaps.md" -> "../content/blogs/algo/treaps.md"
    let filePath = path;
    if (filePath === '/') filePath = '/home.html'; // default landing page
    // Try to resolve Markdown source first
    const mdPath = filePath.replace(/\.html$/, '.md');
    const mdKey = '../content' + mdPath;
    const htmlKey = '../content' + filePath;
    if (mdKey in pagesMd) {
      contentRaw = (await (pagesMd as any)[mdKey]()) as string;
      const { fm, body } = parseFrontmatter(contentRaw);
      frontmatter = fm;
      isBlog = frontmatter.displayMode === 'blog';
      backgroundImagePC = frontmatter.backgroundImagePC || null;
      backgroundImageMobile = frontmatter.backgroundImageMobile || null;
      contentHtml = md.render(body);
      await tick();
      if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
        (window as any).MathJax.typesetPromise();
      }
    } else if (htmlKey in pagesHtml) {
      // Raw HTML file – execute as-is
      contentRaw = (await (pagesHtml as any)[htmlKey]()) as string;
      frontmatter = {};
      isBlog = false;
      backgroundImagePC = null;
      backgroundImageMobile = null;
      contentHtml = contentRaw;
      await tick();
      // Execute inline scripts so that browser games work
      if (typeof window !== 'undefined' && htmlContainer) {
        htmlContainer.querySelectorAll('script').forEach((oldScript) => {
          const newScript = document.createElement('script');
          [...oldScript.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.replaceWith(newScript);
        });
      }
    } else {
      contentRaw = `# 404\nPath not found: ${path}`;
      frontmatter = {};
      isBlog = false;
      backgroundImagePC = null;
      backgroundImageMobile = null;
      contentHtml = md.render(contentRaw);
      await tick();
      if (typeof window !== 'undefined' && (window as any).MathJax?.typesetPromise) {
        (window as any).MathJax.typesetPromise();
      }
    }
  }
</script>

{#if isBlog}
  <section class={`${skin.classes.contentPane} mx-auto max-w-4xl px-4 py-6 bg-surface text-text transition-colors duration-150 ease-retro`}>
    <header class="mb-8">
      <h1 class={`${skin.classes.blogTitle}`}>{frontmatter.title ?? 'Untitled'}</h1>
      {#if frontmatter.date}
        <p class="mt-2 text-xs text-text-muted">{new Date(frontmatter.date).toLocaleDateString()}</p>
      {/if}
      {#if frontmatter.tags && frontmatter.tags.length}
        <ul class="mt-4 flex flex-wrap gap-2 list-none pl-0">
          {#each frontmatter.tags as tag}
            <li class="rounded-sm border border-accent-subtle px-2 py-1 text-xs font-medium text-text-muted transition-colors duration-150 ease-retro"
            >{tag}</li>
          {/each}
        </ul>
      {/if}
    </header>
    <article class={`${skin.classes.contentPane} max-w-none`}>
      {@html contentHtml}
    </article>
  </section>
{:else}
  {#if isHomeWithBackground}
    <div 
      class="h-full w-full bg-cover bg-center bg-no-repeat"
      style="background-image: url('{currentBackgroundImage}');"
    >
      <!-- This div is purely for the background image -->
    </div>
  {:else}
    <div bind:this={htmlContainer} id="content-html-container" class={`${skin.classes.contentPane} p-4 max-w-none bg-surface text-text transition-colors duration-150 ease-retro`}>
      {@html contentHtml}
    </div>
  {/if}
{/if}
