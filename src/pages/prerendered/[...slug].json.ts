// Build-time render of each markdown page (HTML with math already typeset),
// served as /prerendered/<path>.json. ContentPane fetches this on client-side
// navigation so it shows the same output as a direct page load, without
// running markdown-it or MathJax in the browser.
import type { APIRoute } from 'astro';
import { getVirtualFs, type FsNode } from '../../lib/virtualFs';
import { prerenderPath } from '../../lib/prerender';

export const prerender = true;

export async function getStaticPaths() {
  const paths: { params: { slug: string } }[] = [];
  const walk = (node: FsNode) => {
    if (node.type === 'file') {
      if (node.path.endsWith('.html')) paths.push({ params: { slug: node.path.slice(1, -'.html'.length) } });
    } else if (node.children) {
      for (const child of Object.values(node.children)) walk(child);
    }
  };
  walk(getVirtualFs());
  const md: typeof paths = [];
  for (const p of paths) {
    if ((await prerenderPath('/' + p.params.slug + '.html')).kind === 'md') md.push(p);
  }
  return md;
}

export const GET: APIRoute = async ({ params }) => {
  const initial = await prerenderPath('/' + params.slug + '.html');
  return new Response(JSON.stringify(initial), { headers: { 'Content-Type': 'application/json' } });
};
