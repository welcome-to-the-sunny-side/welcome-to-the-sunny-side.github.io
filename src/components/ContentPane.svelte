<script lang="ts">
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { get } from 'svelte/store';
  import { currentSkin } from '../stores/skin';
  import { currentPath } from '../stores/router';
  import { list as vfsList, isDir } from '../lib/virtualFs';
  import { getRenderer } from '../lib/markdown';

  // We import .md as raw text and parse the small frontmatter ourselves.
  // (Letting Astro compile the markdown bundles ~2.5x more JS per page since
  // each module would also include compiled HTML + a Content component we
  // don't use.) HTML files are imported raw too.
  const pagesMd = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default' });
  const pagesHtml = import.meta.glob('../content/**/*.html', { query: '?raw', import: 'default' });

  // Strip-and-parse a minimal YAML front matter. Supports:
  //   key: value
  //   key: "value" or 'value'   (quotes stripped if matched pair)
  //   key: [a, "b", 'c']        (one-line list, comma-separated)
  function parseFrontmatter(raw: string): { fm: Record<string, any>; body: string } {
    if (!raw.startsWith('---')) return { fm: {}, body: raw };
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return { fm: {}, body: raw };
    const yaml = raw.slice(3, end).trim();
    const body = raw.slice(end + 4);
    const fm: Record<string, any> = {};
    const stripQuotes = (s: string) => s.replace(/^(['"])(.*)\1$/, '$2');
    for (const line of yaml.split(/\r?\n/)) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        fm[key] = val.slice(1, -1).split(',').map((s) => stripQuotes(s.trim()));
      } else {
        fm[key] = stripQuotes(val);
      }
    }
    return { fm, body };
  }

  let md: any = null;
  let mathjaxLoading: Promise<void> | null = null;

  let MusingsStreamComponent: any = null;
  let musingsLoadPromise: Promise<any> | null = null;

  async function ensureRenderer() {
    if (!md) md = await getRenderer();
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

const initialPath = typeof window !== 'undefined' ? get(currentPath) : '/';
let path = initialPath;
let displayPath = initialPath;
let frontmatter: Record<string, any> = {};
let isBlog = false;
let isMusings = false;
let isNavView = false;
type NavEntry = { name: string; path: string; isDir: boolean };
let navViewEntries: NavEntry[] = [];
let navViewDir = '';
let contentHtml: string = '';
let previousContentHtml: string = '';
let isLoading = false;
let pendingTypeset = false;
let pendingScriptExec = false;
type Device = 'pc' | 'mobile';
// Home background image URLs are listed in /home-bg-index.json (built by
// tools/build-home-bg-index.mjs). We fetch the manifest on first home view
// instead of bundling every URL into this component's chunk. Reassigning
// `imagesBySkin` after the fetch triggers the reactive block below.
let imagesBySkin: Record<string, Record<Device, string[]>> = {};
let imagesBySkinPromise: Promise<void> | null = null;
function ensureHomeBgIndex() {
  imagesBySkinPromise ??= fetch('/home-bg-index.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => { imagesBySkin = data ?? {}; })
    .catch(() => { /* leave imagesBySkin empty */ });
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
      ensureHomeBgIndex();
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
    let filePath = path;
    if (filePath === '/') filePath = '/home.html'; // default landing page
    const isHome = (filePath === '/home.html' || filePath === '/');

    // Check for nav-view directory pages (e.g. /algo/index.html)
    if (filePath.endsWith('/index.html')) {
      const dirPath = filePath === '/index.html' ? '/' : filePath.replace(/\/index\.html$/, '');
      if (isDir(dirPath)) {
        const children = vfsList(dirPath) || [];
        navViewEntries = children.map(name => {
          const childPath = dirPath === '/' ? '/' + name : dirPath + '/' + name;
          const dir = isDir(childPath);
          return {
            name,
            path: dir ? childPath + '/index.html' : childPath,
            isDir: dir,
          };
        });
        navViewDir = dirPath;
        isNavView = true;
        isBlog = false;
        isMusings = false;
        frontmatter = {};
        contentHtml = '';
        if (isLoading) {
          isLoading = false;
          previousContentHtml = '';
          displayPath = path;
          currentPath.setLoadingComplete();
        }
        return true;
      }
    }

    isNavView = false;

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
      await ensureRenderer();
      await ensureMathJaxLoaded();
      const raw = (await (pagesMd as any)[mdKey]()) as string;
      const { fm, body } = parseFrontmatter(raw);
      frontmatter = fm;
      isBlog = frontmatter.displayMode === 'blog';
      isMusings = frontmatter.displayMode === 'musings';
      if (isMusings) { await ensureMusingsLoaded(); }
      contentHtml = md.render(body);
      await tick();
      if (isLoading) {
        pendingTypeset = true;
      } else {
        await typesetMath();
      }
      contentFound = true;
    } else if (htmlKey in pagesHtml) {
      const raw = (await (pagesHtml as any)[htmlKey]()) as string;
      frontmatter = {};
      isBlog = false;
      isMusings = false;
      contentHtml = raw;
      await tick();
      if (isLoading) {
        pendingScriptExec = true;
      } else {
        await executeScripts();
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
      if (!isLoading) {
        await ensureRenderer();
        await ensureMathJaxLoaded();
        frontmatter = {};
        isBlog = false;
        isMusings = false;
        contentHtml = md.render(`# 404\nPath not found: ${path}`);
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
      // Now that the new content is visible, execute pending scripts and typeset math
      if (pendingScriptExec) {
        await tick();
        try { await executeScripts(); } catch {}
        pendingScriptExec = false;
      }
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

  // Execute inline scripts in HTML content (for games and interactive pages)
  async function executeScripts() {
    if (typeof window === 'undefined') return;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const container = document.getElementById('content-html-container');
    if (container) {
      container.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        [...oldScript.attributes].forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
    }
  }
</script>

{#if isNavView}
  <div class="mx-auto max-w-2xl px-4 py-8 bg-surface text-text transition-colors duration-150 ease-retro">
    <h1 class="font-mono text-accent text-lg mb-6">{navViewDir === '/' ? '~' : navViewDir}</h1>
    <ul class="list-none p-0 m-0 font-mono text-sm">
      {#each navViewEntries as entry, i (entry.path)}
        {@const isLast = i === navViewEntries.length - 1}
        <li class="m-0 p-0">
          <button
            class="w-full text-left px-2 py-2 rounded-sm transition-colors duration-150 hover:bg-accent-subtle flex items-center gap-2"
            on:click={() => currentPath.push(entry.path)}
          >
            <span class="text-text-muted select-none">{isLast ? '└─' : '├─'}</span>
            <span class={entry.isDir ? 'text-text' : 'text-accent'}>{entry.name}{entry.isDir ? '/' : ''}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{:else if isBlog}
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
