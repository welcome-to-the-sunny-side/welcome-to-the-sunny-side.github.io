<script lang="ts">
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { currentSkin } from '../stores/skin';
  import { currentPath } from '../stores/router';
  // Musings is now lazy-loaded; see ensureMusingsLoaded() below

  // Import all markdown under src/content as raw strings
  // load all markdown as raw strings (Vite 5 syntax)
const pagesMd = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default' });
const pagesHtml = import.meta.glob('../content/**/*.html', { query: '?raw', import: 'default' });

  // Lazy singletons
  let md: any = null;
  let hljs: any = null;
  let enginesLoaded = false;
  let mathjaxLoading: Promise<void> | null = null;

  // Lazy-load Musings component only when needed
  let MusingsStreamComponent: any = null;
  let musingsLoadPromise: Promise<any> | null = null;

  async function ensureRenderEnginesLoaded() {
    if (enginesLoaded) return;
    const [MarkdownItMod, hljsCore, cppMod] = await Promise.all([
      import('markdown-it'),
      import('highlight.js/lib/core'),
      import('highlight.js/lib/languages/cpp'),
    ]);
    hljs = (hljsCore as any).default;
    hljs.registerLanguage('cpp', (cppMod as any).default);
    const { default: MarkdownIt } = MarkdownItMod as any;
    md = new MarkdownIt({
      html: true,
      linkify: true,
      highlight: (str: string, lang: string): string => {
        const norm = (lang || '').toLowerCase();
        const isCpp = ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'hxx'].includes(norm);
        if (isCpp) {
          try {
            return `<pre class="hljs"><code>${hljs.highlight(str, { language: 'cpp' }).value}</code></pre>`;
          } catch {}
        }
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
      },
    });
    enginesLoaded = true;
  }

  async function ensureMathJaxLoaded() {
    if (typeof window === 'undefined') return;
    const w = window as any;
    if (w.MathJax) return;
    if (mathjaxLoading) { await mathjaxLoading; return; }
    mathjaxLoading = new Promise<void>((resolve, reject) => {
      w.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          processEscapes: true,
        },
        options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] },
        output: {
          displayOverflow: 'linebreak',
          linebreaks: { inline: true, width: '100%', lineleading: .2 },
        },
      };
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js';
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load MathJax'));
      document.head.appendChild(s);
    });
    await mathjaxLoading;
  }

  async function ensureMusingsLoaded() {
    if (MusingsStreamComponent) return;
    try {
      const mod = await (musingsLoadPromise ??= import('./MusingsStream.svelte'));
      MusingsStreamComponent = (mod as any).default;
    } catch (e) {
      console.error('Failed to load Musings component', e);
    }
  }

let path = '/';
let displayPath = '/';
  let contentRaw: string = '';
let frontmatter: Record<string, any> = {};
let isBlog = false;
let isMusings = false;
let contentHtml: string = '';
let previousContentHtml: string = '';
let isLoading = false;
let pendingTypeset = false;
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

  // Reactive background image logic (use displayPath so old background stays during loading)
  $: {
    const isHome = displayPath === '/' || displayPath === '/home.html';
    if (isHome) {
      const device: Device = isMobileView ? 'mobile' : 'pc';
      const list = imagesBySkin[$currentSkin.name]?.[device] ?? [];
      currentBackgroundImage = list.length ? list[Math.floor(Math.random() * list.length)] : null;
    } else {
      currentBackgroundImage = null;
    }
  }
  $: isHomeWithBackground = (displayPath === '/' || displayPath === '/home.html') && currentBackgroundImage;

  // When musings mode is active, ensure its component is loaded
  $: if (isMusings) { ensureMusingsLoaded(); }

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
    // Always mark loading on path change so we don't flash 404 even from home
    if (path !== p) {
      isLoading = true;
      previousContentHtml = contentHtml;
      // Keep displayPath as-is until load completes (so old background/content stays)
    }
    path = p; // target path for loading
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
    const isHome = (filePath === '/home.html' || filePath === '/');
    // Try to resolve Markdown source first
    const mdPath = filePath.replace(/\.html$/, '.md');
    const mdKey = '../content' + mdPath;
    const htmlKey = '../content' + filePath;
    
    let contentFound = false;
    
    if (isHome) {
      // Home: show background (handled via isHomeWithBackground). No HTML body required.
      frontmatter = {};
      isBlog = false;
      isMusings = false;
      // Keep contentHtml as-is (previous page) until displayPath switches; then template shows background.
      contentFound = true;
    } else if (mdKey in pagesMd) {
      await ensureRenderEnginesLoaded();
      await ensureMathJaxLoaded();
      contentRaw = (await (pagesMd as any)[mdKey]()) as string;
      const { fm, body } = parseFrontmatter(contentRaw);
      frontmatter = fm;
      isBlog = frontmatter.displayMode === 'blog';
      isMusings = frontmatter.displayMode === 'musings';
      if (isMusings) { await ensureMusingsLoaded(); }
      
      // Protect math before Markdown parsing, then restore and let MathJax typeset
      const { placeholderText, restore } = protectMathSegments(body);
      contentHtml = md.render(placeholderText);
      contentHtml = restore(contentHtml);
      await tick();
      // Defer typesetting if we're in loading mode (page not yet swapped in DOM)
      if (isLoading) {
        pendingTypeset = true;
      } else {
        await typesetMath();
      }
      contentFound = true;
    } else if (htmlKey in pagesHtml) {
      // Raw HTML file – execute as-is
      contentRaw = (await (pagesHtml as any)[htmlKey]()) as string;
      frontmatter = {};
      isBlog = false;
      isMusings = false;
      
      
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
      if (!isHome) {
        await ensureMathJaxLoaded();
        if (isLoading) {
          pendingTypeset = true;
        } else {
          await typesetMath();
        }
      }
      contentFound = true;
    } else {
      // Only show 404 if we're not loading (to prevent flash)
      if (!isLoading) {
        await ensureRenderEnginesLoaded();
        await ensureMathJaxLoaded();
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
      contentFound = false;
    }
    
    // Mark loading as complete and notify router
    if (isLoading) {
      isLoading = false;
      previousContentHtml = '';
      // Update displayPath now that new content is ready
      displayPath = path;
      currentPath.setLoadingComplete();
      // Now that the new content is visible, typeset math if needed
      if (pendingTypeset) {
        await tick();
        try { await typesetMath(); } catch {}
        pendingTypeset = false;
      }
    }
    
    return contentFound;
  }

  // Wait for MathJax to be ready and typeset the page content.
  async function typesetMath() {
    if (typeof window === 'undefined') return;
    const waitForMJ = () => new Promise<any>((resolve) => {
      const check = () => {
        const MJ = (window as any).MathJax;
        if (!MJ) { setTimeout(check, 25); return; }
        const p = MJ.startup?.promise;
        if (p && typeof p.then === 'function') { p.then(() => resolve(MJ)); }
        else resolve(MJ);
      };
      check();
    });
    try {
      const MJ = await waitForMJ();
      if (MJ?.typesetClear) MJ.typesetClear();
      if (MJ?.typesetPromise) await MJ.typesetPromise();
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
    <article class={`${skin.classes.contentPane} max-w-none`}>
      {@html isLoading && previousContentHtml ? previousContentHtml : contentHtml}
    </article>
  </section>
{:else}
  {#if isMusings}
    <div class={`${skin.classes.contentPane} p-4 max-w-4xl mx-auto bg-surface text-text transition-colors duration-150 ease-retro`}>
      {#if MusingsStreamComponent}
        <svelte:component this={MusingsStreamComponent} />
      {:else}
        <div class="text-text-muted text-sm">Loading…</div>
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
      {@html isLoading && previousContentHtml ? previousContentHtml : contentHtml}
    </div>
  {/if}
{/if}
