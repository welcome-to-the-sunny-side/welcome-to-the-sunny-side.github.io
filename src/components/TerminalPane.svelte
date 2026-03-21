<script lang="ts">
  import { onMount } from 'svelte';
  import TerminalIsland from './TerminalIsland.svelte';
  import { writable } from 'svelte/store';

  // Simple collapsed state – persisted in sessionStorage so it stays while navigating.
  const collapsed = writable<boolean>(false);

  onMount(() => {
    const saved = sessionStorage.getItem('terminalCollapsed');
    if (saved) {
      collapsed.set(saved === 'true');
    }
  });

  let isCollapsed = false;
  collapsed.subscribe(v => (isCollapsed = v));

  function toggle() {
    collapsed.update(v => {
      const newVal = !v;
      sessionStorage.setItem('terminalCollapsed', newVal.toString());
      if (!newVal) {
        setTimeout(() => {
          islandComp?.resizeTerminal();
          islandComp?.focusTerminal();
        }, 300);
      }
      return newVal;
    });
  }

  let islandComp: any;
  // Track focus state from TerminalIsland
  let isFocused = false;

  onMount(() => {
    const onResize = () => {
      if (!isCollapsed) {
        setTimeout(() => {
          islandComp?.resizeTerminal();
        }, 100);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if (e.key === 'ArrowRight' && !isCollapsed) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggle();
      } else if (e.key === 'ArrowLeft') {
        if (isCollapsed) {
          e.preventDefault();
          e.stopImmediatePropagation();
          toggle();
        } else {
          e.preventDefault();
          e.stopImmediatePropagation();
          islandComp?.focusTerminal();
        }
      } else if (e.key === 'ArrowUp') {
        if (!isCollapsed) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const active = document.activeElement as HTMLElement | null;
          if (active) active.blur();
        }
      }
    };

    const handleVim = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tagName = active.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || active.isContentEditable ||
            active.classList.contains('xterm-helper-textarea')) {
          return;
        }
      }
      const pane = document.querySelector('main');
      const step = 60;
      switch (e.key) {
        case 'j':
          (pane ?? window).scrollBy({ top: 2*step, behavior: 'smooth' });
          break;
        case 'k':
          (pane ?? window).scrollBy({ top: -2*step, behavior: 'smooth' });
          break;
        case 'h':
          (pane ?? window).scrollBy({ left: -step, behavior: 'smooth' });
          break;
        case 'l':
          (pane ?? window).scrollBy({ left: step, behavior: 'smooth' });
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('keydown', handleVim);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('keydown', handleVim);
    };
  });
</script>

<style>
  /* Desktop collapse (horizontal) */
  .desktop-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(135deg, #0a0a0a 0%, #0d0d0d 100%);
    border: 1px solid rgba(100, 255, 218, 0.15);
    border-radius: 12px;
    overflow: hidden;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(100, 255, 218, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: clamp(320px, 30vw, 600px);
  }

  .desktop-collapsed {
    width: 32px !important;
  }

  .desktop-wrapper.focused {
    border-color: rgba(100, 255, 218, 0.4);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(100, 255, 218, 0.2),
      inset 0 1px 0 rgba(100, 255, 218, 0.1);
  }

  .desktop-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(100, 255, 218, 0.3), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .desktop-wrapper.focused::before {
    opacity: 1;
  }

  /* Terminal content container */
  .terminal-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Hide terminal contents when collapsed */
  .desktop-collapsed .terminal-content {
    display: none;
  }

  /* Collapsed placeholder label */
  .collapsed-label {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(100, 255, 218, 0.6);
    user-select: none;
    pointer-events: none;
    letter-spacing: 0.15em;
    text-shadow: 0 0 8px rgba(100, 255, 218, 0.3);
  }

  /* Desktop collapse toggle button */
  .desktop-toggle {
    position: absolute;
    left: -22px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 64px;
    background: linear-gradient(135deg, #0d0d0d 0%, #161616 100%);
    border: 1px solid rgba(100, 255, 218, 0.2);
    border-right: none;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(100, 255, 218, 0.7);
    z-index: 10;
    font-size: 10px;
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(100, 255, 218, 0.1);
  }

  .desktop-toggle:hover {
    background: linear-gradient(135deg, #161616 0%, #1a1a1a 100%);
    color: #64ffda;
    border-color: rgba(100, 255, 218, 0.4);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(100, 255, 218, 0.3),
      inset 0 1px 0 rgba(100, 255, 218, 0.2);
  }
</style>

<div class="h-full flex flex-col desktop-wrapper"
     class:desktop-collapsed={isCollapsed}
     class:focused={isFocused}
>
  {#if isCollapsed}
    <button
      class="desktop-toggle flex"
      on:click={toggle}
      aria-label="Expand terminal"
    >
      ◀
    </button>
    <span class="collapsed-label">terminal</span>
  {:else}
    <button
      class="desktop-toggle flex"
      on:click={toggle}
      aria-label="Collapse terminal"
    >
      ▶
    </button>
  {/if}

  <div class="flex-1 overflow-hidden">
    <div class="terminal-content">
      <TerminalIsland bind:this={islandComp} bind:isFocused />
    </div>
  </div>
</div>
