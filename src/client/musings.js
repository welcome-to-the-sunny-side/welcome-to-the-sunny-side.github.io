// The musings stream (/misc/void.html): short posts listed in
// /musings/manifest.json, each a JSON blob under /musings/data/. Public posts
// are markdown; private ones are encrypted (decrypted in musingsWorker.js with
// the key typed into the page, which never leaves memory).
//
// Mounts into #musings, on first load and on every client-side navigation
// back to the page (module scripts only run once; see src/client/router.js).
import { getRenderer } from '../lib/markdown.js';
import { typeset } from './mathjax.js';

const PAGE_SIZE = 12;

mount();
addEventListener('site:load', mount);

function h(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function shuffle(str) {
  const chars = str.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function mount() {
  const root = document.getElementById('musings');
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = '1';
  root.replaceChildren(h('div', 'text-text-muted text-sm', 'Your connection is rather slow, peasant...'));

  let entries;
  let md;
  try {
    [md, entries] = await Promise.all([getRenderer(), fetch('/musings/manifest.json').then((r) => r.json())]);
  } catch (err) {
    console.error('Failed to load musings manifest:', err);
    return;
  }
  if (!entries.length) {
    root.replaceChildren(h('div', 'text-text-muted text-sm', 'No musings found.'));
    return;
  }

  // Per-post state, keyed by id.
  const blobs = {};
  const decrypted = {};
  const errors = {};
  const unlocking = new Set();
  const renderers = {}; // id -> () => void, redraws that post
  let passphrase = '';
  let worker = null;

  // Leave nothing running once the page has been navigated away from.
  const stillMounted = () => {
    if (root.isConnected) return true;
    removeEventListener('site:load', stillMounted);
    worker?.terminate();
    worker = null;
    return false;
  };
  addEventListener('site:load', stillMounted);

  // --- key box ---
  const keyBox = h('div', 'rounded-sm border border-text-muted p-3 mb-4 bg-[color:var(--el-surface)]');
  const keyRow = h('div', 'flex items-center gap-2');
  const input = h('input', 'px-2 py-1 rounded-sm bg-[color:var(--el-surface)] border border-text-muted text-xs flex-1 text-text placeholder:text-text transition-colors');
  input.type = 'password';
  input.placeholder = 'Key';
  input.id = 'global-passphrase';
  const clear = h('button', 'px-2 py-1 text-xs border border-accent-subtle rounded hover:bg-accent-subtle/20 disabled:opacity-50 text-text hover:text-accent transition-colors', 'Clear');
  clear.disabled = true;
  const setPassphrase = (v) => {
    passphrase = v;
    input.value = v;
    clear.disabled = !v;
    Object.values(renderers).forEach((r) => r());
  };
  input.addEventListener('input', () => setPassphrase(input.value));
  clear.addEventListener('click', () => setPassphrase(''));
  keyRow.append(input, clear);
  keyBox.append(keyRow);

  const list = h('ul', 'list-none p-0 m-0 space-y-6');
  const sentinel = h('div', 'h-10');
  root.replaceChildren(keyBox, list, sentinel);

  async function loadBlob(e) {
    if (blobs[e.id]) return blobs[e.id];
    try {
      const res = await fetch(`/musings/${e.path}`);
      if (!res.ok) return null;
      blobs[e.id] = await res.json();
      renderers[e.id]?.();
      return blobs[e.id];
    } catch {
      return null;
    }
  }

  async function showDecrypted(id, text) {
    decrypted[id] = text;
    renderers[id]?.();
    await typeset([list.querySelector(`[data-id="${CSS.escape(id)}"]`)]);
  }

  // Public posts load (and private ones fetch their ciphertext preview) when scrolled near.
  function ensureLoaded(e) {
    if (e.tier === 'public') {
      if (!decrypted[e.id]) loadBlob(e).then((b) => b?.md && showDecrypted(e.id, b.md));
    } else {
      loadBlob(e);
    }
  }

  async function unlock(e) {
    if (!passphrase.trim()) return;
    unlocking.add(e.id);
    delete errors[e.id];
    const timer = setInterval(() => {
      if (!stillMounted()) return clearInterval(timer);
      renderers[e.id]?.(shuffle('decrypt'));
    }, 80); // quick shuffle of the button label while scrypt runs
    renderers[e.id]();
    try {
      const blob = await loadBlob(e);
      if (!blob) throw new Error('Failed to load blob');
      worker ??= new Worker('/js/musingsWorker.js', { type: 'module' });
      const result = await new Promise((resolve) => {
        const onMessage = (ev) => {
          if (ev.data?.id !== e.id) return;
          worker.removeEventListener('message', onMessage);
          resolve(ev.data);
        };
        worker.addEventListener('message', onMessage);
        worker.postMessage({ id: e.id, blob, pass: passphrase });
      });
      if (result.ok) await showDecrypted(e.id, result.md);
      else errors[e.id] = result.error || 'Failed to decrypt';
    } catch (err) {
      errors[e.id] = err?.message ?? String(err);
    } finally {
      clearInterval(timer);
      unlocking.delete(e.id);
      renderers[e.id]?.();
    }
  }

  function addPost(e) {
    const li = h('li', 'rounded-sm border border-text-muted bg-[color:var(--el-surface)] p-3');
    li.dataset.id = e.id;
    let button = null;
    renderers[e.id] = (label) => {
      const locked = e.tier !== 'public' && !decrypted[e.id];
      const header = h('div', 'flex items-center justify-between gap-2');
      header.append(h('div', 'text-xs text-text-muted', new Date(e.ts).toLocaleString()));
      if (locked) {
        button = h('button', 'text-xs text-accent hover:text-accent/80 disabled:opacity-50',
          unlocking.has(e.id) ? (label || 'decrypting...') : 'decrypt');
        button.disabled = unlocking.has(e.id) || !passphrase.trim();
        button.addEventListener('click', () => unlock(e));
        header.append(button);
      }
      const body = [];
      if (locked) {
        const box = h('div', 'mt-1');
        const ct = blobs[e.id]?.ct;
        box.append(ct ? h('div', 'break-all', ct.slice(0, 160) + (ct.length > 160 ? '…' : '')) : h('div', 'text-xs text-text-muted', 'Loading preview…'));
        if (errors[e.id]) box.append(h('div', 'text-xs text-accent mt-1', errors[e.id]));
        body.push(box);
      } else if (decrypted[e.id]) {
        // Same classes as a blog post's article (src/build/templates.js).
        const article = h('article', 'prose dark:prose-invert dark:prose-headings:font-sans dark:prose-p:font-sans dark:prose-li:font-sans dark:prose-blockquote:font-sans dark:prose-td:font-sans dark:prose-th:font-sans dark:prose-p:tracking-normal dark:prose-li:tracking-normal dark:prose-blockquote:tracking-normal dark:prose-td:tracking-normal dark:prose-th:tracking-normal max-w-none');
        article.innerHTML = md.render(decrypted[e.id]);
        const box = h('div', 'mt-1');
        box.append(article);
        body.push(box);
      } else {
        body.push(h('div', 'mt-1 text-xs text-text-muted', 'Loading…'));
      }
      // While the label animates, only the button changes.
      if (label && button && li.firstChild) {
        li.firstChild.replaceWith(header);
        return;
      }
      li.replaceChildren(header, ...body);
    };
    renderers[e.id]();
    const io = new IntersectionObserver((seen) => {
      if (seen.some((s) => s.isIntersecting)) {
        io.disconnect();
        ensureLoaded(e);
      }
    }, { rootMargin: '400px 0px' });
    io.observe(li);
    list.append(li);
  }

  // Infinite scroll: show PAGE_SIZE more posts whenever the sentinel nears the viewport.
  let shown = 0;
  const showMore = () => {
    entries.slice(shown, shown + PAGE_SIZE).forEach(addPost);
    shown = Math.min(entries.length, shown + PAGE_SIZE);
    if (shown >= entries.length) sentinel.remove();
  };
  showMore();
  const more = new IntersectionObserver((seen) => {
    if (!seen.some((s) => s.isIntersecting)) return;
    // Re-observe after layout settles so a still-visible sentinel triggers again.
    more.unobserve(sentinel);
    showMore();
    requestAnimationFrame(() => setTimeout(() => sentinel.isConnected && more.observe(sentinel), 50));
  }, { rootMargin: '200px 0px' });
  if (sentinel.isConnected) more.observe(sentinel);
}
