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
  // Initialize mobile detection immediately to prevent layout shift
  let isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  // Track focus state from TerminalIsland
  let isFocused = false;
  // Desktop width is now driven purely by CSS (width: clamp(320px, 30vw, 600px))
  // to avoid SSR/hydration mismatches and initial flicker.
  
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768; // Match Tailwind's md breakpoint
      // Trigger a fit after potential breakpoint/size changes; width is CSS-driven.
      setTimeout(() => {
        islandComp?.resizeTerminal();
      }, 100);
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
      } else if (e.key === 'ArrowUp') {
        if (!isCollapsed) {
          e.preventDefault();
          e.stopImmediatePropagation();
          // Blur terminal textarea and let focus return to main content
          const active = document.activeElement as HTMLElement | null;
          if (active) active.blur();
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  }
  
  /* Desktop (md+) specific widths - removed fixed width, now using dynamic width */
  @media (min-width: 768px) {
    .desktop-wrapper {
      /* Drive desktop width purely via CSS to avoid SSR/CSR mismatch */
      width: clamp(320px, 30vw, 600px);
    }
    .desktop-collapsed {
      width: 32px !important;
    }
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
  
  /* Mobile collapse */
  .mobile-collapsed {
    max-height: 0;
    overflow: hidden;
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
  
  /* Mobile header styling */
  .mobile-header {
    background: linear-gradient(90deg, #0d0d0d 0%, #161616 100%);
    border-bottom: 1px solid rgba(100, 255, 218, 0.2);
    backdrop-filter: blur(8px);
  }
  
  .mobile-toggle {
    color: rgba(100, 255, 218, 0.8);
    transition: color 0.2s ease;
    font-size: 12px;
  }
  
  .mobile-toggle:hover {
    color: #64ffda;
  }
  
  .mobile-title {
    color: rgba(100, 255, 218, 0.7);
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: lowercase;
  }
</style>

<!-- Wrapper adapts layout via Tailwind breakpoints -->
<div class="h-full flex flex-col desktop-wrapper"
     class:desktop-collapsed={!isMobile && isCollapsed}
     class:focused={isFocused}
>
  <!-- Header bar only visible on small screens -->
  <div class="md:hidden flex items-center justify-between px-4 py-3 mobile-header">
    <span class="mobile-title text-xs">terminal</span>
    <button class="mobile-toggle" on:click={toggle} aria-label="Toggle terminal">
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
      <TerminalIsland bind:this={islandComp} bind:isFocused />
    </div>
  </div>
</div>
