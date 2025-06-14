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
    } else if (window.innerWidth < 768) {
      // Default to collapsed on mobile
      collapsed.set(true);
      sessionStorage.setItem('terminalCollapsed', 'true');
    }
  });

  let isCollapsed = false;
  collapsed.subscribe(v => (isCollapsed = v));

  function toggle() {
    collapsed.update(v => {
      const newVal = !v;
      sessionStorage.setItem('terminalCollapsed', newVal.toString());
      // When expanding (newVal false) focus terminal and refit on mobile
      if (!newVal) {
        // slight delay to allow DOM to render width
        setTimeout(() => {
          if (isMobile) islandComp?.resizeTerminal();
          islandComp?.focusTerminal();
        }, 300); // match CSS transition duration (250ms) + buffer
      }
      return newVal;
    });
  }
  
  let islandComp: any;
  // Determine if we're in mobile view based on window width
  let isMobile = false;
  
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768; // Match Tailwind's md breakpoint
    };

    const handleKey = (e: KeyboardEvent) => {
      if (isMobile || !e.shiftKey) return;
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
          // Focus terminal if already expanded
          e.preventDefault();
          e.stopImmediatePropagation();
          islandComp?.focusTerminal();
        }
      }
    };

    
    // Check initially and on resize
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('keydown', handleKey, true);

    const handleVim = (e: KeyboardEvent) => {
      if (isMobile) return;
      // Ignore if terminal textarea is focused
      const active = document.activeElement as HTMLElement | null;
      if (active && active.classList.contains('xterm-helper-textarea')) return;
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
          return; // do not prevent default
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handleVim);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('keydown', handleVim);
    };
  });
</script>

<style>
  /* Mobile collapse (vertical) */
  .body {
    transition: all 0.25s ease;
  }

  /* Limit height only on mobile to allow smooth slide animation */
  @media (max-width: 767px) {
    .body {
      max-height: 400px;
    }
  }
  
  /* Desktop collapse (horizontal) */
  .desktop-wrapper {
    position: relative;
    height: 100%;
    width: 100%; /* full width by default (mobile) */
    transition: width 0.25s ease;
  }
  
  /* Desktop (md+) specific widths */
  @media (min-width: 768px) {
    .desktop-wrapper {
      width: 475px;
    }
    .desktop-collapsed {
      width: 28px !important; /* Just enough for the toggle button */
    }
  }
  
  /* Mobile collapse */
  .mobile-collapsed {
    max-height: 0;
    overflow: hidden;
  }
  
  /* Desktop collapse toggle button */
  .desktop-toggle {
    position: absolute;
    left: -20px; /* position outside terminal towards content pane */
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 60px;
    background: #18181b; /* zinc-900 */
    border-left: 1px solid #3f3f46; /* zinc-700 */
    border-top: 1px solid #3f3f46;
    border-bottom: 1px solid #3f3f46;
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-right: 1px solid #3f3f46; /* vertical divider between button and pane */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #a1a1aa; /* zinc-400 */
    z-index: 10;
  }
  
  /* Terminal content container */
  .terminal-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  /* Hide terminal contents when collapsed on desktop */
  .desktop-collapsed .terminal-content {
    display: none;
  }

  /* Collapsed placeholder label */
  .collapsed-label {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-family: monospace;
    font-size: 0.75rem;
    color: #a1a1aa; /* zinc-400 */
    user-select: none;
    pointer-events: none;
    letter-spacing: 0.1em;
  }
</style>

<!-- Wrapper adapts layout via Tailwind breakpoints -->
<div class="h-full flex flex-col bg-zinc-900 desktop-wrapper"
     class:desktop-collapsed={!isMobile && isCollapsed}
     class:border-b={isMobile && !isCollapsed}
     class:border-zinc-700={isMobile && !isCollapsed}
>
  <!-- Header bar only visible on small screens -->
  <div class="md:hidden flex items-center justify-between px-3 py-2 border-b border-zinc-700">
    <span class="font-mono text-xs text-zinc-400">terminal</span>
    <button class="text-zinc-300" on:click={toggle} aria-label="Toggle terminal">
      {#if isCollapsed}
        ▼
      {:else}
        ▲
      {/if}
    </button>
  </div>

  <!-- Desktop collapse toggle button (only visible in desktop mode) -->
  {#if !isMobile && isCollapsed}
    <button 
      class="desktop-toggle hidden md:flex" 
      on:click={toggle} 
      aria-label="Expand terminal"
    >
      ◀
    </button>
    <span class="collapsed-label hidden md:block">terminal</span>
  {:else if !isMobile}
    <button 
      class="desktop-toggle hidden md:flex" 
      on:click={toggle} 
      aria-label="Collapse terminal"
    >
      ▶
    </button>
  {/if}

  <!-- Terminal body: hidden on mobile when collapsed -->
  <div class="flex-1 overflow-hidden">
    <div class="terminal-content body" class:mobile-collapsed={isMobile && isCollapsed}>
      <TerminalIsland bind:this={islandComp} />
    </div>
  </div>
</div>
