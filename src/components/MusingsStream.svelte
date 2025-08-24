<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import MarkdownIt from 'markdown-it';
  import hljs from 'highlight.js';
  import scryptPkg from 'scrypt-js';
  const { scrypt } = scryptPkg as any;

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
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
        } catch {}
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  // Load manifest from public directory at runtime
  let entries: ManifestEntry[] = [];
  let manifestLoaded = false;

  // We'll fetch blobs directly from public/musings/data/ at runtime

  const blobCache: Record<string, PublicBlob | PrivateBlob> = {};
  const decryptedMd: Record<string, { md: string }> = {};
  let unlockingPosts: Set<string> = new Set();
  const unlockErrors: Record<string, string> = {};
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

  async function loadBlob(entry: ManifestEntry): Promise<PublicBlob | PrivateBlob | null> {
    if (blobCache[entry.id]) return blobCache[entry.id];
    try {
      const response = await fetch(`/musings/${entry.path}`);
      if (!response.ok) return null;
      const data = await response.json();
      blobCache[entry.id] = data;
      return data as PublicBlob | PrivateBlob;
    } catch {
      return null;
    }
  }

  async function decryptBlob(blob: PrivateBlob, pass: string): Promise<{ md: string }> {
    if (!pass) throw new Error('Empty passphrase');
    const enc = new TextEncoder();
    const passBytes = enc.encode(pass);
    const salt = b64ToBytes(blob.kdf.salt);
    const dkLen = 32;
    const derived = await scrypt(
      passBytes,
      salt,
      blob.kdf.N,
      blob.kdf.r,
      blob.kdf.p,
      dkLen,
      // Provide progress callback so scrypt-js yields to the event loop, allowing UI to update
      (_progress: number) => {}
    );
    const key = await crypto.subtle.importKey('raw', derived, { name: 'AES-GCM' } as any, false, ['decrypt']);
    const iv = b64ToBytes(blob.iv);
    const ct = b64ToBytes(blob.ct);
    const ad = enc.encode(blob.ad ?? `musings:${blob.id}:v${blob.v ?? 1}`);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: ad } as any, key, ct);
    const json = new TextDecoder().decode(plaintext);
    const obj = JSON.parse(json);
    return { md: obj.md };
  }

  async function unlockPost(postId: string, passphrase: string) {
    if (!passphrase.trim()) return;
    
    unlockingPosts.add(postId);
    // reassign to trigger Svelte reactivity for Set mutation
    unlockingPosts = new Set(unlockingPosts);
    delete unlockErrors[postId];
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
          } else {
            unlockErrors[postId] = data.error || 'Failed to decrypt';
          }
          resolve();
        };
        w.addEventListener('message', handler);
        w.postMessage({ id: postId, blob, pass: passphrase });
      });
    } catch (err: any) {
      unlockErrors[postId] = err?.message ?? String(err);
    } finally {
      unlockingPosts.delete(postId);
      // reassign to trigger Svelte reactivity for Set mutation
      unlockingPosts = new Set(unlockingPosts);
      stopDecryptAnimation(postId);
    }
  }

  function lockPost(postId: string) {
    delete decryptedMd[postId];
    delete unlockErrors[postId];
  }

  onMount(async () => {
    // Load manifest from public directory
    try {
      const response = await fetch('/musings/manifest.json');
      if (response.ok) {
        entries = await response.json();
        manifestLoaded = true;
        
        // Auto-load public posts
        for (const e of entries) {
          if (e.tier === 'public') {
            const b = (await loadBlob(e)) as PublicBlob | null;
            if (b && (b as any).md) {
              decryptedMd[e.id] = { md: (b as any).md };
            }
          }
        }
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
  <div class="text-text-muted text-sm">Loading musings...</div>
{:else if entries.length === 0}
  <div class="text-text-muted text-sm">No musings found.</div>
{/if}

{#if manifestLoaded && entries.length > 0}
  <div class="rounded-sm border border-text-muted p-3 mb-4 bg-[color:var(--el-surface)]">
    <div class="flex items-center gap-2">
      <input
        type="password"
        class="px-2 py-1 rounded-sm bg-[color:var(--el-surface)] border border-text-muted text-xs flex-1"
        placeholder="Passphrase"
        bind:value={globalPassphrase}
        id="global-passphrase"
      />
      <button
        class="px-2 py-1 text-xs border border-accent-subtle rounded hover:bg-accent-subtle/20 disabled:opacity-50"
        on:click={() => (globalPassphrase = '')}
        disabled={!globalPassphrase}
      >
        Clear
      </button>
    </div>
  </div>
{/if}

<ul class="list-none p-0 m-0 space-y-6">
  {#each entries as e}
    <li class="rounded-sm border border-text-muted bg-[color:var(--el-surface)] p-3">
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
        {#await loadBlob(e) then b}
          {#if b}
            <div class="mt-1">
              <div class="break-all">{(b as PrivateBlob).ct.slice(0, 160)}{(b as PrivateBlob).ct.length > 160 ? '…' : ''}</div>
              {#if unlockErrors[e.id]}
                <div class="text-xs text-accent mt-1">{unlockErrors[e.id]}</div>
              {/if}
            </div>
          {/if}
        {/await}
      {:else if decryptedMd[e.id]}
        <div class="mt-1">
          <article class="max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-pre:my-0">
            {@html md.render(decryptedMd[e.id].md)}
          </article>
        </div>
      {/if}
    </li>
  {/each}
</ul>
