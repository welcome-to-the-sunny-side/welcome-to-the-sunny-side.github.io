// Shared markdown-it renderer: lazy singleton with C++ highlight.js support
// and a small inline-rule plugin that protects $...$, $$...$$, \(...\), \[...\]
// from markdown-it's emphasis/strong rules so MathJax can typeset them later.

const HLJS_CPP_ALIASES = ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'hxx'];

let cached: Promise<any> | null = null;

export function getRenderer(): Promise<any> {
  return (cached ??= build());
}

async function build(): Promise<any> {
  const [MarkdownItMod, hljsCoreMod, cppMod] = await Promise.all([
    import('markdown-it'),
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/cpp'),
  ]);
  const MarkdownIt = (MarkdownItMod as any).default;
  const hljs = (hljsCoreMod as any).default;
  hljs.registerLanguage('cpp', (cppMod as any).default);
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    highlight: (str: string, lang: string): string => {
      const norm = (lang || '').toLowerCase();
      if (HLJS_CPP_ALIASES.includes(norm)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(str, { language: 'cpp' }).value}</code></pre>`;
        } catch {}
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });
  md.use(mathProtectionPlugin);
  return md;
}

// Register four inline rules — one per math delimiter pair — that match before
// emphasis runs and emit the math span as a raw html_inline token. Net effect:
// markdown-it leaves the math untouched, MathJax picks it up at typeset time.
function mathProtectionPlugin(md: any) {
  const make = (open: string, close: string, allowEscape: boolean) => (state: any, silent: boolean) => {
    if (state.src.slice(state.pos, state.pos + open.length) !== open) return false;
    let end = state.pos + open.length;
    while (true) {
      end = state.src.indexOf(close, end);
      if (end === -1) return false;
      if (!allowEscape) break;
      // Count preceding backslashes; if odd, the close was escaped.
      let bs = 0;
      for (let i = end - 1; i >= 0 && state.src[i] === '\\'; i--) bs++;
      if (bs % 2 === 0) break;
      end += close.length;
    }
    if (!silent) {
      const token = state.push('html_inline', '', 0);
      token.content = state.src.slice(state.pos, end + close.length);
    }
    state.pos = end + close.length;
    return true;
  };
  // Match $$ before $ so the longer fence wins.
  md.inline.ruler.before('emphasis', 'math_block', make('$$', '$$', false));
  md.inline.ruler.before('emphasis', 'math_inline', make('$', '$', true));
  md.inline.ruler.before('emphasis', 'math_paren', make('\\(', '\\)', false));
  md.inline.ruler.before('emphasis', 'math_bracket', make('\\[', '\\]', false));
}
