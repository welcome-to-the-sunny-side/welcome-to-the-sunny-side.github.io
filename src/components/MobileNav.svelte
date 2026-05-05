<script lang="ts">
  import { currentPath } from '../stores/router';
  import { currentSkin, listSkins, wearSkin } from '../stores/skin';
  import { isDir } from '../lib/virtualFs';

  $: skin = $currentSkin;

  function cycleSkin() {
    const names = listSkins();
    if (names.length < 2) return;
    const idx = names.indexOf(skin.name);
    const next = names[(idx + 1) % names.length];
    wearSkin(next);
  }

  // Derive breadcrumb segments from the current path
  $: segments = buildSegments($currentPath);

  interface Segment {
    label: string;
    path: string;
    isLast: boolean;
  }

  function buildSegments(path: string): Segment[] {
    // Home page: show ~ / home.html with ~ clickable
    if (path === '/home.html' || path === '/') {
      return [
        { label: '~', path: '/index.html', isLast: false },
        { label: 'home.html', path: '/home.html', isLast: true },
      ];
    }

    const parts = path.replace(/^\//, '').split('/');
    const result: Segment[] = [];

    // Root segment
    result.push({ label: '~', path: '/index.html', isLast: false });

    // Directory segments
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const segPath = '/' + parts.slice(0, i + 1).join('/');

      if (isLast) {
        result.push({ label: parts[i], path: segPath, isLast: true });
      } else {
        result.push({ label: parts[i], path: segPath + '/index.html', isLast: false });
      }
    }

    return result;
  }

  function navigate(seg: Segment) {
    if (seg.isLast) return;
    currentPath.push(seg.path);
  }
</script>

<style>
  .crumb-link {
    text-decoration: underline;
    text-decoration-color: var(--accent);
    text-underline-offset: 3px;
    text-decoration-thickness: 0.5px;
  }
</style>

<nav class="md:hidden flex items-center px-3 py-2 bg-surface border-b border-accent-subtle font-mono text-sm">
  <div class="flex-1 flex items-center min-w-0 overflow-x-auto whitespace-nowrap">
    {#each segments as seg, i}
      {#if i > 0}
        <span class="text-accent mx-1 select-none">/</span>
      {/if}
      {#if seg.isLast}
        <span class="text-text font-medium">{seg.label}</span>
      {:else}
        <button
          class="crumb-link text-text-muted hover:text-accent transition-colors duration-150"
          on:click={() => navigate(seg)}
        >{seg.label}</button>
      {/if}
    {/each}
  </div>
  <button
    class="flex-shrink-0 ml-3 text-text-muted hover:text-accent transition-colors duration-150 text-base leading-none"
    on:click={cycleSkin}
    aria-label="Switch skin (current: {skin.name})"
  >{skin.name === 'sunny' ? '☀' : '☾'}</button>
</nav>
