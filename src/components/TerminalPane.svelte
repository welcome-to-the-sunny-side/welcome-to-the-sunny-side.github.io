<script lang="ts">
  import { onMount } from 'svelte';
  import TerminalIsland from './TerminalIsland.svelte';
  import { writable } from 'svelte/store';
  import { currentTerminalTheme } from '../stores/terminalTheme';

  $: theme = $currentTerminalTheme;

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
    background: linear-gradient(135deg, var(--tw-bg) 0%, var(--tw-bg-end) 100%);
    border: 1px solid var(--tw-border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow:
      0 8px 32px var(--tw-shadow),
      inset 0 1px 0 var(--tw-glow);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: clamp(320px, 30vw, 600px);
  }

  .desktop-collapsed {
    width: 32px !important;
  }

  .desktop-wrapper.focused {
    border-color: var(--tw-border-focus);
    box-shadow:
      0 8px 32px var(--tw-shadow),
      0 0 0 1px var(--tw-glow),
      inset 0 1px 0 var(--tw-glow);
  }

  .desktop-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--tw-glow-strong), transparent);
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
    color: var(--tw-accent-muted);
    user-select: none;
    pointer-events: none;
    letter-spacing: 0.15em;
  }

  /* Desktop collapse toggle button */
  .desktop-toggle {
    position: absolute;
    left: -22px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 64px;
    background: linear-gradient(135deg, var(--tw-bg) 0%, var(--tw-bg-end) 100%);
    border: 1px solid var(--tw-border);
    border-right: none;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--tw-accent-muted);
    z-index: 10;
    font-size: 10px;
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
    box-shadow:
      0 4px 16px var(--tw-shadow),
      inset 0 1px 0 var(--tw-glow);
  }

  .desktop-toggle:hover {
    color: var(--tw-accent);
    border-color: var(--tw-border-focus);
    box-shadow:
      0 6px 20px var(--tw-shadow),
      0 0 0 1px var(--tw-glow-strong),
      inset 0 1px 0 var(--tw-glow);
  }
</style>

<div class="h-full flex flex-col desktop-wrapper"
     class:desktop-collapsed={isCollapsed}
     class:focused={isFocused}
     style:--tw-bg={theme.wrapper.bg}
     style:--tw-bg-end={theme.wrapper.bgEnd}
     style:--tw-border={theme.wrapper.border}
     style:--tw-border-focus={theme.wrapper.borderFocus}
     style:--tw-glow={theme.wrapper.glow}
     style:--tw-glow-strong={theme.wrapper.glowStrong}
     style:--tw-accent={theme.wrapper.accent}
     style:--tw-accent-muted={theme.wrapper.accentMuted}
     style:--tw-shadow={theme.wrapper.shadow}
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
