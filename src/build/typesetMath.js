// Build-time MathJax: turns the $...$ / $$...$$ left in markdown-it's output
// into finished CHTML, so phones never download or run MathJax for normal
// posts (typesetting ~500 expressions client-side made the SA-IS post lag).
//
// Build-time only. The output is self-contained: a <style>
// block with the CHTML rules for the glyphs this page uses, followed by the
// typeset HTML. Fonts load from jsDelivr, pinned to the installed version.
//
// Display math keeps its TeX in `data-tex`. Breaking a long display equation
// needs the real column width, which only the browser knows, so the client
// re-typesets just the ones that overflow (rebreakDisplayMath in src/client/site.js).
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { CHTML } from '@mathjax/src/js/output/chtml.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { AssistiveMmlHandler } from '@mathjax/src/js/a11y/assistive-mml.js';
import '@mathjax/src/js/util/asyncLoad/esm.js';
import { MathJaxNewcmFont } from '@mathjax/mathjax-newcm-font/js/chtml.js';
import fontPkg from '@mathjax/mathjax-newcm-font/package.json' with { type: 'json' };

// The CDN build's default packages plus everything it would autoload.
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import '@mathjax/src/js/input/tex/configmacros/ConfigMacrosConfiguration.js';
import '@mathjax/src/js/input/tex/action/ActionConfiguration.js';
import '@mathjax/src/js/input/tex/amscd/AmsCdConfiguration.js';
import '@mathjax/src/js/input/tex/bbox/BboxConfiguration.js';
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import '@mathjax/src/js/input/tex/braket/BraketConfiguration.js';
import '@mathjax/src/js/input/tex/bussproofs/BussproofsConfiguration.js';
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js';
import '@mathjax/src/js/input/tex/color/ColorConfiguration.js';
import '@mathjax/src/js/input/tex/enclose/EncloseConfiguration.js';
import '@mathjax/src/js/input/tex/extpfeil/ExtpfeilConfiguration.js';
import '@mathjax/src/js/input/tex/html/HtmlConfiguration.js';
import '@mathjax/src/js/input/tex/mhchem/MhchemConfiguration.js';
import '@mathjax/src/js/input/tex/unicode/UnicodeConfiguration.js';
import '@mathjax/src/js/input/tex/verb/VerbConfiguration.js';

const PACKAGES = [
  'base', 'ams', 'newcommand', 'noundefined', 'configmacros', 'action', 'amscd', 'bbox',
  'boldsymbol', 'braket', 'bussproofs', 'cancel', 'color', 'enclose', 'extpfeil', 'html',
  'mhchem', 'unicode', 'verb',
];

// Keep in step with the client config in src/client/site.js.
const TEX_OPTIONS = {
  inlineMath: [['$', '$'], ['\\(', '\\)']],
  displayMath: [['$$', '$$'], ['\\[', '\\]']],
  processEscapes: true,
};
const FONT_URL = `https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font@${fontPkg.version}/chtml/woff2`;

const adaptor = liteAdaptor();
AssistiveMmlHandler(RegisterHTMLHandler(adaptor));

const hasMath = (html) => /\$|\\\(|\\\[/.test(html);

export async function typesetMath(html) {
  if (!hasMath(html)) return html;
  // Fresh jax per page so each page's stylesheet only covers its own glyphs.
  const chtml = new CHTML({
    fontData: MathJaxNewcmFont,
    fontURL: FONT_URL,
    linebreaks: { inline: true, width: '100%', lineleading: 0.2 },
  });
  const doc = mathjax.document(`<html><head></head><body>${html}</body></html>`, {
    InputJax: new TeX({ packages: PACKAGES, ...TEX_OPTIONS }),
    OutputJax: chtml,
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
  });
  await doc.renderPromise();
  const items = Array.from(doc.math);
  if (!items.length) return html;
  for (const item of items) {
    if (item.display) adaptor.setAttribute(item.typesetRoot, 'data-tex', item.math);
  }
  const css = adaptor.cssText(chtml.styleSheet(doc));
  return `<style>${css}</style>` + adaptor.innerHTML(adaptor.body(doc.document));
}
