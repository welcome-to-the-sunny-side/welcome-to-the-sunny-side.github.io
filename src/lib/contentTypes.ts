// Shape of the build-time pre-rendered content handed from [...slug].astro to
// ContentPane.svelte. Kept in its own module (types only) so the client bundle
// never imports prerender.ts, which holds the server-only eager markdown glob.
export type NavEntry = { name: string; path: string; isDir: boolean };

export type InitialContent =
  | { kind: 'home'; path: string }
  | { kind: 'nav'; path: string; navDir: string; entries: NavEntry[] }
  | { kind: 'md'; path: string; html: string; frontmatter: Record<string, any> }
  | { kind: 'client'; path: string };
