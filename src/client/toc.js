// The blog contents tree (see contentsTree in src/build/templates.js): marks
// the section being read and opens the path down to it, as main scrolls.
// main persists across navigations, so one scroll listener serves every page.
export function startToc() {
  const main = document.querySelector('main');
  let queued = false;
  const update = () => {
    queued = false;
    const toc = main.querySelector('.toc');
    // no tree, or hidden (terminal open / narrow window)
    if (!toc || getComputedStyle(toc).display === 'none' || !document.documentElement.hasAttribute('data-term-collapsed')) return;
    // The current section: the last heading above a line a quarter down the
    // pane, or the last heading once scrolled to the bottom.
    const line = main.getBoundingClientRect().top + main.clientHeight / 4;
    const atEnd = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
    let current = null;
    for (const a of toc.querySelectorAll('a')) {
      const h = document.getElementById(a.hash.slice(1));
      if (!h?.offsetParent) continue;
      if (atEnd || h.getBoundingClientRect().top <= line) current = a.parentElement;
      else break;
    }
    for (const li of toc.querySelectorAll('li.open, li.active')) li.classList.remove('open', 'active');
    if (!current) return;
    current.classList.add('active');
    for (let li = current; li && li !== toc; li = li.parentElement) {
      if (li.tagName === 'LI') li.classList.add('open');
    }
  };
  const schedule = () => {
    if (!queued) requestAnimationFrame(update);
    queued = true;
  };
  main.addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('site:load', schedule);
  // The tree appears when the terminal collapses.
  new MutationObserver(schedule).observe(document.documentElement, { attributeFilter: ['data-term-collapsed'] });
  schedule();

  // Entries scroll to their heading without touching the URL.
  main.addEventListener('click', (e) => {
    const a = e.target.closest('.toc a');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  });
}
