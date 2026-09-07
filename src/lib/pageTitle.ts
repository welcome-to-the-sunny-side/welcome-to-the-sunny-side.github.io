// Document <title> for a page. Used at build time (prerender.ts, for the static
// <title>) and at runtime (ContentPane, after client-side navigation) so both
// agree on the format.
export const SITE_NAME = 'Welcome to the Sunny Side!';

export function titleForPage(path: string, frontmatter?: Record<string, any> | null): string {
  if (path === '/' || path === '/home.html') return SITE_NAME;
  if (path.endsWith('/index.html')) {
    const dir = path.replace(/\/index\.html$/, '');
    return `${dir === '' ? '~' : dir} · ${SITE_NAME}`;
  }
  const name = frontmatter?.title || path.split('/').pop()?.replace(/\.html$/, '') || path;
  return `${name} · ${SITE_NAME}`;
}
