<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tick } from 'svelte';
  import { currentSkin } from '../stores/skin';
  import { currentPath } from '../stores/router';
  import { readable } from 'svelte/store';

  // Dynamic-only components and libs (loaded per-route)
  let md: any = null;
  let hljs: any = null;
  let MusingsStreamComp: any = null;
  let showMusings: boolean = false;

  // Import all markdown under src/content as raw strings
  // load all markdown as raw strings (Vite 5 syntax)
const pagesMd = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default' });
const pagesHtml = import.meta.glob('../content/**/*.html', { query: '?raw', import: 'default' });

  // md and hljs are initialized on-demand for non-home pages in loadContent()

let path = '/';
  let contentRaw: string = '';
let frontmatter: Record<string, any> = {};
let isBlog = false;
let isMusings = false;
let contentHtml: string = '';
let blogArticleEl: HTMLElement | null = null;
type Device = 'pc' | 'mobile';
// Collect all home background images at build time (hashed URLs)
const imageModules = import.meta.glob('../../public/assets/home/active/**/*.{jpg,jpeg,png,webp}', { as: 'url', eager: true });
const imagesBySkin: Record<string, Record<Device, string[]>> = {};
for (const [absPath, url] of Object.entries(imageModules)) {
  const parts = absPath.split('/');
  const idx = parts.indexOf('active'); // .../home/active/<skin>/<device>/<file>
  if (idx !== -1 && parts.length >= idx + 3) {
    const skinName = parts[idx + 1];
    const device = parts[idx + 2] as Device;
    (imagesBySkin[skinName] ??= { pc: [], mobile: [] })[device].push(url as string);
  }
}

let currentBackgroundImage: string | null = null;
let isMobileView: boolean = false;
let htmlContainer: HTMLDivElement | null = null;

// Subscribe to skin store
$: skin = $currentSkin;

  // Reactive background image logic
  $: {
    const isHome = path === '/' || path === '/home.html';
    if (isHome) {
      const device: Device = isMobileView ? 'mobile' : 'pc';
      const list = imagesBySkin[$currentSkin.name]?.[device] ?? [];
      currentBackgroundImage = list.length ? list[Math.floor(Math.random() * list.length)] : null;
    } else {
      currentBackgroundImage = null;
    }
  }
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

  // Protect inline/display math from Markdown emphasis parsing by temporarily
  // replacing math segments with unique placeholders before md.render(), then
  // restoring the original TeX delimiters back into the resulting HTML string.
  // Supported delimiters: $...$, $$...$$, \(...\), \[...\]
  function protectMathSegments(input: string): { placeholderText: string; restore: (html: string) => string } {
    const placeholders: string[] = [];
    const MARKER = '§§MATH§§';
    let counter = 0;

    function makeKey(idx: number): string {
      return `${MARKER}${idx}§§`;
    }

    function pushPlaceholder(raw: string): string {
      const key = makeKey(counter);
      placeholders.push(raw);
      counter++;
      return key;
    }

    function isEscaped(src: string, pos: number): boolean {
      // Count preceding backslashes
      let backslashes = 0;
      for (let i = pos - 1; i >= 0 && src[i] === '\\'; i--) backslashes++;
      return (backslashes % 2) === 1;
    }

    let i = 0;
    let out = '';
    const n = input.length;

    while (i < n) {
      const ch = input[i];

      // Skip code spans/fences delimited by backticks `...` or ```...```
      if (ch === '`') {
        // Count backticks length
        let btCount = 1;
        let j = i + 1;
        while (j < n && input[j] === '`') { btCount++; j++; }
        // Find closing sequence of same length
        const fence = '`'.repeat(btCount);
        let k = input.indexOf(fence, j);
        if (k === -1) {
          // No closing fence; append rest and break
          out += input.slice(i);
          break;
        } else {
          // Include closing fence
          out += input.slice(i, k + btCount);
          i = k + btCount;
          continue;
        }
      }

      // MathJax \(...\)
      if (ch === '\\' && i + 1 < n && input[i + 1] === '(') {
        const start = i;
        const end = input.indexOf('\\)', i + 2);
        if (end !== -1) {
          const raw = input.slice(start, end + 2);
          out += pushPlaceholder(raw);
          i = end + 2;
          continue;
        }
      }

      // MathJax \[...\]
      if (ch === '\\' && i + 1 < n && input[i + 1] === '[') {
        const start = i;
        const end = input.indexOf('\\]', i + 2);
        if (end !== -1) {
          const raw = input.slice(start, end + 2);
          out += pushPlaceholder(raw);
          i = end + 2;
          continue;
        }
      }

      // Dollar-delimited: $...$ or $$...$$
      if (ch === '$') {
        // Count consecutive dollars (1 or 2 supported)
        let d = 1;
        if (i + 1 < n && input[i + 1] === '$') d = 2;
        const start = i;
        let j = i + d;
        let found = -1;
        while (true) {
          j = input.indexOf('$'.repeat(d), j);
          if (j === -1) break;
          if (!isEscaped(input, j)) { found = j; break; }
          j += d;
        }
        if (found !== -1) {
          const raw = input.slice(start, found + d);
          out += pushPlaceholder(raw);
          i = found + d;
          continue;
        }
      }

      // Default: copy one char
      out += ch;
      i++;
    }

    function restore(html: string): string {
      let result = html;
      for (let idx = 0; idx < placeholders.length; idx++) {
        const key = makeKey(idx);
        result = result.split(key).join(placeholders[idx]);
      }
      return result;
    }

    return { placeholderText: out, restore };
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

    const isHome = filePath === '/home.html';
    showMusings = (filePath === '/misc/void.html');
    if (showMusings && !MusingsStreamComp) {
      // Dynamically import Musings stream only on misc/void.html
      MusingsStreamComp = (await import('./MusingsStream.svelte')).default;
    }

    if (isHome) {
      // Skip loading markdown-it, highlight.js, and MathJax on home.
      frontmatter = {};
      isBlog = false;
      isMusings = false;
      contentRaw = '';
      contentHtml = '';
      return;
    }

    // Non-home pages: ensure markdown-it and highlight.js are available
    if (!md || !hljs) {
      const [{ default: MarkdownIt }, { default: hl }]: any = await Promise.all([
        import('markdown-it'),
        import('highlight.js'),
      ]);
      hljs = hl;
      md = new MarkdownIt({
        html: true,
        linkify: true,
        highlight: (str: string, lang: string): string => {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
            } catch {}
          }
          return `<pre class=\"hljs\"><code>${md.utils.escapeHtml(str)}</code></pre>`;
        },
      });
      // Ensure all Markdown images are lazy-loaded by default
      const defaultImg = md.renderer.rules.image || ((tokens: any, idx: number, options: any, env: any, self: any) => self.renderToken(tokens, idx, options));
      md.renderer.rules.image = (tokens: any, idx: number, options: any, env: any, self: any) => {
        tokens[idx].attrSet('loading', 'lazy');
        tokens[idx].attrSet('decoding', 'async');
        return defaultImg(tokens, idx, options, env, self);
      };
    }

    // Try to resolve Markdown source first
    const mdPath = filePath.replace(/\.html$/, '.md');
    const mdKey = '../content' + mdPath;
    const htmlKey = '../content' + filePath;
    if (mdKey in pagesMd) {
      contentRaw = (await (pagesMd as any)[mdKey]()) as string;
      const { fm, body } = parseFrontmatter(contentRaw);
      frontmatter = fm;
      isBlog = frontmatter.displayMode === 'blog';
      isMusings = frontmatter.displayMode === 'musings';

      const { placeholderText, restore } = protectMathSegments(body);
      contentHtml = md.render(placeholderText);
      contentHtml = restore(contentHtml);
      await tick();
      // Ensure all images inside the blog article are lazy
      if (typeof window !== 'undefined' && blogArticleEl) {
        blogArticleEl.querySelectorAll('img').forEach((img) => {
          if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
          if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        });
      }
      await typesetMath();
    } else if (htmlKey in pagesHtml) {
      // Raw HTML file – execute as-is
      contentRaw = (await (pagesHtml as any)[htmlKey]()) as string;
      frontmatter = {};
      isBlog = false;
      isMusings = false;
      contentHtml = contentRaw;
      await tick();
      // Apply lazy-loading to any native <img> in the injected HTML
      if (typeof window !== 'undefined' && htmlContainer) {
        htmlContainer.querySelectorAll('img').forEach((img) => {
          if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
          if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        });
      }
      // Execute inline scripts so that browser games work
      if (typeof window !== 'undefined' && htmlContainer) {
        htmlContainer.querySelectorAll('script').forEach((oldScript) => {
          const newScript = document.createElement('script');
          [...oldScript.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.replaceWith(newScript);
        });
      }
      await typesetMath();
    } else {
      contentRaw = `# 404\nPath not found: ${path}`;
      frontmatter = {};
      isBlog = false;
      isMusings = false;
      const { placeholderText, restore } = protectMathSegments(contentRaw);
      contentHtml = md.render(placeholderText);
      contentHtml = restore(contentHtml);
      await tick();
      await typesetMath();
    }
  }

  // Wait for MathJax to be ready and typeset the page content.
  async function typesetMath() {
    if (typeof window === 'undefined') return;
    const w = window as any;
    // Lazily load MathJax v4 if not already present
    if (!w.MathJax) {
      w.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          processEscapes: true
        },
        options: {
          skipHtmlTags: ['script','noscript','style','textarea','pre','code']
        },
        // MathJax v4: enable automatic line breaking and prevent wide-expression overflow
        output: {
          displayOverflow: 'linebreak',
          linebreaks: { inline: true, width: '100%', lineleading: .2 }
        }
      };
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load MathJax'));
        document.head.appendChild(s);
      });
      if (w.MathJax?.startup?.promise?.then) {
        await w.MathJax.startup.promise;
      }
    }
    try {
      if (w.MathJax?.typesetClear) w.MathJax.typesetClear();
      if (w.MathJax?.typesetPromise) await w.MathJax.typesetPromise();
    } catch (e) {
      console.warn('MathJax typeset failed:', e);
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
    <article bind:this={blogArticleEl} class={`${skin.classes.contentPane} max-w-none`}>
      {@html contentHtml}
    </article>
  </section>
{:else}
  {#if showMusings}
    <div class={`${skin.classes.contentPane} p-4 max-w-4xl mx-auto bg-surface text-text transition-colors duration-150 ease-retro`}>
      {#if MusingsStreamComp}
        <svelte:component this={MusingsStreamComp} />
      {/if}
    </div>
  {:else if isHomeWithBackground}
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
