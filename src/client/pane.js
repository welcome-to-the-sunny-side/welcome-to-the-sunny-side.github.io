// The desktop terminal pane around xterm.js: collapse/expand, the global
// keyboard shortcuts, and loading the terminal itself (only once the pane is
// visible, i.e. not on phones). Collapsing is keyboard-only (Shift+→ / Shift+←).
const root = document.documentElement;

export function startPane() {
  const wrapper = document.querySelector('.desktop-wrapper');
  let terminal = null; // { focus, resize } once loaded
  const isCollapsed = () => root.hasAttribute('data-term-collapsed');

  function setCollapsed(v) {
    root.toggleAttribute('data-term-collapsed', v);
    try {
      sessionStorage.setItem('terminalCollapsed', String(v));
    } catch {}
    if (!v) {
      setTimeout(() => {
        terminal?.resize?.();
        terminal?.focus?.();
      }, 300);
    }
  }
  const toggle = () => setCollapsed(!isCollapsed());

  const desktop = matchMedia('(min-width: 768px)');
  const mount = async () => {
    if (!desktop.matches || terminal) return;
    terminal = {};
    const { mountTerminal } = await import('./terminal.js');
    terminal = await mountTerminal(document.querySelector('.terminal-shell'), (focused) => wrapper.classList.toggle('focused', focused));
    onResize();
  };
  desktop.addEventListener('change', mount);
  mount();

  function onResize() {
    if (!isCollapsed()) setTimeout(() => terminal?.resize?.(), 100);
  }
  addEventListener('resize', onResize);

  // Shift+→ collapse, Shift+← expand / focus the terminal, Shift+↑ leave it.
  addEventListener('keydown', (e) => {
    if (!e.shiftKey) return;
    if (e.key === 'ArrowRight' && !isCollapsed()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      toggle();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isCollapsed()) toggle();
      else terminal?.focus?.();
    } else if (e.key === 'ArrowUp' && !isCollapsed()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      document.activeElement?.blur();
    }
  }, true);

  // h/j/k/l scroll the content pane when nothing editable has focus.
  addEventListener('keydown', (e) => {
    // leave browser shortcuts alone (Ctrl+L address bar, Ctrl+H history, ...)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const active = document.activeElement;
    if (active) {
      const tag = active.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || active.isContentEditable ||
          active.classList.contains('xterm-helper-textarea')) return;
    }
    const pane = document.querySelector('main') ?? window;
    const step = 60;
    switch (e.key) {
      case 'j': pane.scrollBy({ top: 2 * step, behavior: 'smooth' }); break;
      case 'k': pane.scrollBy({ top: -2 * step, behavior: 'smooth' }); break;
      case 'h': pane.scrollBy({ left: -step, behavior: 'smooth' }); break;
      case 'l': pane.scrollBy({ left: step, behavior: 'smooth' }); break;
      default: return;
    }
    e.preventDefault();
  });
}
