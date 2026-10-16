// /llms.txt (llmstxt.org): an index of the site's posts for AI agents,
// pointing at their markdown sources (/<path>.md, see [...slug].md.ts).
import type { APIRoute } from 'astro';
import { markdownPagePaths, prerenderPath } from '../lib/prerender';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? '').replace(/\/$/, '');
  const lines: string[] = [];
  for (const path of await markdownPagePaths()) {
    const initial = await prerenderPath(path);
    const title = (initial.kind === 'md' && initial.frontmatter.title) || path.slice(1, -'.html'.length);
    lines.push(`- [${title}](${base}${path.replace(/\.html$/, '.md')})`);
  }
  const body =
    `# Welcome to the Sunny Side!\n\n` +
    `> Personal site and blog: algorithms (problems, theory, contests), literature, life and miscellany.\n\n` +
    `Each page at ${base}/<path>.html has its markdown source at ${base}/<path>.md; ` +
    `math is TeX between $...$ / $$...$$. Prefer the markdown when reading a post.\n\n` +
    `## Pages\n\n` + lines.join('\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
