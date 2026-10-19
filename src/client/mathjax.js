// MathJax in the browser (from the CDN), loaded only when a page needs it.
// Markdown pages are typeset at build time (src/build/typesetMath.js); the
// browser only re-breaks display equations that overflow, and typesets raw
// HTML pages that contain math and the musings page.

let mathjax = null;

function loadMathJax() {
  return (mathjax ??= new Promise((resolve, reject) => {
    // Keep in step with the build's config in src/build/typesetMath.js.
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        // MathJax 4 defaults to semantic enrichment + speech + braille for
        // every expression. On math-heavy posts (SA-IS: ~500 expressions)
        // that took typesetting from ~0.4s to ~5.6s and blocked the main
        // thread long enough to make mobile scrolling stutter. Hidden
        // MathML (assistiveMml) keeps the math readable by screen readers.
        menuOptions: {
          settings: { enrich: false, speech: false, braille: false, assistiveMml: true, inTabOrder: false },
        },
      },
      // Only typeset what we hand it.
      startup: { typeset: false },
      output: {
        displayOverflow: 'linebreak',
        linebreaks: { inline: true, width: '100%', lineleading: 0.2 },
      },
    };
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js';
    s.onload = () => window.MathJax.startup.promise.then(() => resolve(window.MathJax));
    s.onerror = () => reject(new Error('Failed to load MathJax'));
    document.head.appendChild(s);
  }));
}

export async function typeset(elements) {
  try {
    const MJ = await loadMathJax();
    MJ.typesetClear(elements);
    await MJ.typesetPromise(elements);
  } catch (e) {
    console.warn('MathJax typeset failed:', e);
  }
}

// Build-time math can't break long display equations (no column width at
// build time), so they carry their TeX in data-tex. Re-typeset only the
// ones that overflow here; pages where everything fits never load MathJax.
export async function rebreakDisplayMath() {
  const wide = [...document.querySelectorAll('mjx-container[display="true"][data-tex]')]
    .filter((el) => !el.dataset.rebreak && el.scrollWidth > el.clientWidth + 1);
  if (!wide.length) return;
  wide.forEach((el) => (el.dataset.rebreak = '1'));
  try {
    const MJ = await loadMathJax();
    const fresh = wide.map((el) => {
      const span = document.createElement('span');
      span.textContent = '\\[' + el.dataset.tex + '\\]';
      el.replaceWith(span);
      return span;
    });
    await MJ.typesetPromise(fresh);
  } catch (e) {
    console.warn('MathJax re-break failed:', e);
  }
}
