<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import MarkdownIt from 'markdown-it';
  import hljsCore from 'highlight.js/lib/core';
  import cpp from 'highlight.js/lib/languages/cpp';
  import { currentSkin } from '../stores/skin';

  // Register only the C++ language to keep bundle size small
  const hljs: any = hljsCore as any;
  hljs.registerLanguage('cpp', cpp as any);

  type Tier = 'public' | 'master';
  type ManifestEntry = {
    id: string;
    ts: string; // UTC ISO 8601
    tier: Tier;
    path: string; // relative path to blob under ../content/musings/data
    size?: number;
    hash?: string;
  };

  type PublicBlob = {
    v: number;
    id: string;
    ts: string;
    tier: 'public';
    md: string; // raw markdown
    meta?: { title?: string; tags?: string[] };
  };

  type PrivateBlob = {
    v: number;
    id: string;
    ts: string;
    tier: 'master';
    kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
    alg: 'AES-256-GCM';
    iv: string; // base64
    ad: string; // additional authenticated data
    ct: string; // base64 (ciphertext+tag)
  };

  const md = new MarkdownIt({
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

  // Load manifest from public directory at runtime
  let entries: ManifestEntry[] = [];
  let manifestLoaded = false;

  // We'll fetch blobs directly from public/musings/data/ at runtime

  let blobCache: Record<string, PublicBlob | PrivateBlob> = {};
  let decryptedMd: Record<string, { md: string }> = {};
  let unlockingPosts: Set<string> = new Set();
  let unlockErrors: Record<string, string> = {};
  // Single global passphrase kept in-memory only
  let globalPassphrase: string = '';
  // Decrypt worker (lazy)
  let worker: Worker | null = null;
  function ensureWorker(): Worker {
    if (!worker) {
      worker = new Worker(new URL('../lib/musingsWorker.ts', import.meta.url), { type: 'module' });
    }
    return worker;
  }
  
  // Animated decrypt button
  let animatedTexts: Record<string, string> = {};
  const animationIntervals: Record<string, number> = {};
  
  function shuffleString(str: string): string {
    const chars = str.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }
  
  function startDecryptAnimation(postId: string) {
    const originalText = 'decrypt';
    animatedTexts[postId] = originalText;
    
    animationIntervals[postId] = window.setInterval(() => {
      animatedTexts[postId] = shuffleString(originalText);
      // force Svelte reactivity on nested object mutation by replacing reference
      animatedTexts = { ...animatedTexts };
    }, 80); // 80ms intervals for quick animation
  }
  
  function stopDecryptAnimation(postId: string) {
    if (animationIntervals[postId]) {
      window.clearInterval(animationIntervals[postId]);
      delete animationIntervals[postId];
      delete animatedTexts[postId];
    }
  }

  function b64ToBytes(b64: string): Uint8Array {
    if (typeof atob === 'undefined') {
      // Node (SSR) safety, though this runs on client
      return Uint8Array.from(Buffer.from(b64, 'base64'));
    }
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function tsToLocal(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleString();
  }

  // Call MathJax to typeset any inline/display math that appears in the newly-rendered markdown
  function typesetMath() {
    if (typeof window !== 'undefined') {
      const mj = (window as any).MathJax;
      if (mj?.typesetPromise) {
        mj.typesetPromise();
      }
    }
  }

  const PAGE_SIZE = 12;
  let visibleCount = PAGE_SIZE;

  // Svelte action: invoke callback when node enters viewport (once)
  function visibleOnce(node: Element, callback: () => void) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            try {
              callback?.();
            } catch {}
            io.unobserve(node);
          }
        }
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(node);
    return {
      destroy() {
        io.disconnect();
      },
    };
  }

  // Svelte action: infinite scroll sentinel (keeps observing)
  function infiniteSentinel(node: Element, callback: () => void) {
    let pending = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !pending) {
            pending = true;
            // Stop observing to force a future re-evaluation after DOM grows
            io.unobserve(node);
            try {
              callback?.();
            } finally {
              // Re-observe on next frame after layout settles so we can trigger again
              requestAnimationFrame(() => {
                setTimeout(() => {
                  pending = false;
                  io.observe(node);
                }, 50);
              });
            }
          }
        }
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(node);
    return {
      destroy() {
        io.disconnect();
      },
    };
  }

  // Ensure a post's data is loaded when it becomes visible
  function ensureLoaded(entry: ManifestEntry) {
    if (entry.tier === 'public') {
      if (!decryptedMd[entry.id]) {
        loadBlob(entry).then(async (b) => {
          const pb = b as PublicBlob | null;
          if (pb && (pb as any).md) {
            decryptedMd[entry.id] = { md: (pb as any).md };
            // trigger reactivity on nested object mutation
            decryptedMd = { ...decryptedMd };
            // Ensure DOM is updated before asking MathJax to typeset
            await tick();
            typesetMath();
          }
        });
      }
    } else {
      // For private posts, prefetch the blob to show ciphertext preview
      if (!blobCache[entry.id]) {
        loadBlob(entry);
      }
    }
  }

  async function loadBlob(entry: ManifestEntry): Promise<PublicBlob | PrivateBlob | null> {
    if (blobCache[entry.id]) return blobCache[entry.id];
    try {
      const response = await fetch(`/musings/${entry.path}`);
      if (!response.ok) return null;
      const data = await response.json();
      blobCache[entry.id] = data;
      // trigger reactivity on nested object mutation
      blobCache = { ...blobCache };
      return data as PublicBlob | PrivateBlob;
    } catch {
      return null;
    }
  }

  // Removed unused decryptBlob() and scrypt-js main-thread dependency; decryption is handled in the worker.

  async function unlockPost(postId: string, passphrase: string) {
    if (!passphrase.trim()) return;
    
    unlockingPosts.add(postId);
    // reassign to trigger Svelte reactivity for Set mutation
    unlockingPosts = new Set(unlockingPosts);
    delete unlockErrors[postId];
    unlockErrors = { ...unlockErrors };
    startDecryptAnimation(postId);
    await tick();
    
    try {
      const entry = entries.find(e => e.id === postId);
      if (!entry || entry.tier === 'public') return;
      
      const blob = (await loadBlob(entry)) as PrivateBlob | null;
      if (!blob) throw new Error('Failed to load blob');

      // Offload to worker so the UI (animation) remains responsive
      await new Promise<void>((resolve) => {
        const w = ensureWorker();
        const handler = (ev: MessageEvent) => {
          const data = ev.data as { id: string; ok: boolean; md?: string; error?: string };
          if (!data || data.id !== postId) return;
          w.removeEventListener('message', handler);
          if (data.ok) {
            decryptedMd[postId] = { md: data.md! };
            decryptedMd = { ...decryptedMd };
          } else {
            unlockErrors[postId] = data.error || 'Failed to decrypt';
            unlockErrors = { ...unlockErrors };
          }
          resolve();
        };
        w.addEventListener('message', handler);
        w.postMessage({ id: postId, blob, pass: passphrase });
      });
      // After decrypted markdown is injected, typeset math
      await tick();
      typesetMath();
    } catch (err: any) {
      unlockErrors[postId] = err?.message ?? String(err);
      unlockErrors = { ...unlockErrors };
    } finally {
      unlockingPosts.delete(postId);
      // reassign to trigger Svelte reactivity for Set mutation
      unlockingPosts = new Set(unlockingPosts);
      stopDecryptAnimation(postId);
    }
  }

  function lockPost(postId: string) {
    delete decryptedMd[postId];
    decryptedMd = { ...decryptedMd };
    delete unlockErrors[postId];
    unlockErrors = { ...unlockErrors };
  }

  onMount(async () => {
    // Load manifest from public directory
    try {
      const response = await fetch('/musings/manifest.json');
      if (response.ok) {
        entries = await response.json();
        manifestLoaded = true;
      }
    } catch (err) {
      console.error('Failed to load musings manifest:', err);
    }
  });

  onDestroy(() => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });
</script>

{#if !manifestLoaded}
  <div class="text-text-muted text-sm">Your connection is rather slow, peasant...</div>
{:else if entries.length === 0}
  <div class="text-text-muted text-sm">No musings found.</div>
{/if}

{#if manifestLoaded && entries.length > 0}
  <div class="rounded-sm border border-text-muted p-3 mb-4 bg-[color:var(--el-surface)]">
    <div class="flex items-center gap-2">
      <input
        type="password"
        class="px-2 py-1 rounded-sm bg-[color:var(--el-surface)] border border-text-muted text-xs flex-1 text-text placeholder:text-text transition-colors"
        placeholder="Key"
        bind:value={globalPassphrase}
        id="global-passphrase"
      />
      <button
        class="px-2 py-1 text-xs border border-accent-subtle rounded hover:bg-accent-subtle/20 disabled:opacity-50 text-text hover:text-accent transition-colors"
        on:click={() => (globalPassphrase = '')}
        disabled={!globalPassphrase}
      >
        Clear
      </button>
    </div>
  </div>
{/if}

<ul class="list-none p-0 m-0 space-y-6">
  {#each entries.slice(0, visibleCount) as e (e.id)}
    <li use:visibleOnce={() => ensureLoaded(e)} class="rounded-sm border border-text-muted bg-[color:var(--el-surface)] p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs text-text-muted">{tsToLocal(e.ts)}</div>
        {#if e.tier !== 'public' && !decryptedMd[e.id]}
          <button
            class="text-xs text-accent hover:text-accent/80 disabled:opacity-50"
            disabled={unlockingPosts.has(e.id) || !globalPassphrase.trim()}
            on:click={() => unlockPost(e.id, globalPassphrase)}
          >
            {unlockingPosts.has(e.id) ? (animatedTexts[e.id] || 'decrypting...') : 'decrypt'}
          </button>
        {/if}
      </div>

      {#if e.tier !== 'public' && !decryptedMd[e.id]}
        <div class="mt-1">
          {#if blobCache[e.id]}
            <div class="break-all">{(blobCache[e.id] as PrivateBlob).ct.slice(0, 160)}{(blobCache[e.id] as PrivateBlob).ct.length > 160 ? '…' : ''}</div>
          {:else}
            <div class="text-xs text-text-muted">Loading preview…</div>
          {/if}
          {#if unlockErrors[e.id]}
            <div class="text-xs text-accent mt-1">{unlockErrors[e.id]}</div>
          {/if}
        </div>
      {:else if decryptedMd[e.id]}
        <div class="mt-1">
          <article class="{$currentSkin.classes.contentPane} max-w-none">
            {@html md.render(decryptedMd[e.id].md)}
          </article>
        </div>
      {:else if e.tier === 'public'}
        <div class="mt-1 text-xs text-text-muted">Loading…</div>
      {/if}
    </li>
  {/each}
</ul>
{#if manifestLoaded && visibleCount < entries.length}
  <div use:infiniteSentinel={() => (visibleCount = Math.min(entries.length, visibleCount + PAGE_SIZE))} class="h-10"></div>
{/if}
