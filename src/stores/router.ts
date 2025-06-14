import { writable } from 'svelte/store';

/**
 * Very lightweight client-side router.
 * The store holds the current path (pathname only).
 * Calling `push()` will update the browser history and the store.
 * Browser Back/Forward buttons update the store automatically via a popstate listener.
 */
function createRouter() {
  const getResolvedPath = (path: string) => (path === '/' ? '/home.md' : path);

  let initialBrowserPath = '/'; // Default for SSR or non-browser env
  if (typeof window !== 'undefined') {
    initialBrowserPath = window.location.pathname;
  }

  const initialStorePath = getResolvedPath(initialBrowserPath);
  const { subscribe, set } = writable<string>(initialStorePath);

  if (typeof window !== 'undefined' && initialBrowserPath === '/' && initialStorePath === '/home.md') {
    // If we landed on '/' and resolved to '/home.md', update browser URL to reflect the resolved path
    history.replaceState({}, '', initialStorePath);
  }

  function push(path: string) {
    if (typeof window === 'undefined') return;
    if (path === window.location.pathname) return;
    history.pushState({}, '', path);
    set(path);
  }

  function replace(path: string) {
    if (typeof window === 'undefined') return;
    history.replaceState({}, '', path);
    set(path);
  }

  // Keep store in sync with browser navigation
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      const newBrowserPath = window.location.pathname;
      const newStorePath = getResolvedPath(newBrowserPath);
      set(newStorePath);
      // If browser path was '/' and got resolved, update URL to match store's resolved path
      if (newBrowserPath === '/' && newStorePath === '/home.md') {
        history.replaceState({}, '', newStorePath);
      }
    });
  }

  return {
    subscribe,
    push,
    replace,
  };
}

export const currentPath = createRouter();
