// Markdown source of each post, served as /<path>.md (e.g. /algo/theory/sais.md).
// For AI agents: clean TeX math and plain text at a fraction of the HTML's
// size. Not linked visibly; pages point here with <link rel="alternate"
// type="text/markdown"> and /llms.txt lists them. Musings are excluded.
import type { APIRoute } from 'astro';
import { markdownPagePaths, markdownSource } from '../lib/prerender';

export const prerender = true;

export async function getStaticPaths() {
  return (await markdownPagePaths()).map((p) => ({ params: { slug: p.slice(1, -'.html'.length) } }));
}

export const GET: APIRoute = async ({ params }) => {
  const src = await markdownSource('/' + params.slug + '.html');
  return new Response(src ?? '', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
