// Static sitemap listing every VFS page so crawlers can discover content
// without driving the terminal. Musings (/misc/void.html) is included as a
// page, though its posts are fetched client-side and stay invisible to bots.
import type { APIRoute } from 'astro';
import { getVirtualFs, type FsNode } from '../lib/virtualFs';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? '').replace(/\/$/, '');
  const urls: string[] = ['/'];
  const walk = (node: FsNode) => {
    if (node.type === 'file') {
      if (node.path !== '/home.html') urls.push(node.path);
    } else if (node.children) {
      if (node.path !== '/') urls.push(node.path + '/index.html');
      for (const child of Object.values(node.children)) walk(child);
    }
  };
  walk(getVirtualFs());

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
