# Welcome to the Sunny Side – Site Reference

_Last updated: 2025-06-14_

## 1 . High-level Overview
The site is a **static, terminal-driven blog & knowledge base** built with **Astro** for static generation and **Svelte** for the interactive UI.  All human-readable content lives in Markdown files under `src/content` and is presented at URLs that end in `.html`.

Key pillars:
1. **Virtual File System (VFS)** – mirrors `src/content` and maps `*.md` → `*.html`.
2. **Svelte App** – two panes:
   * `ContentPane.svelte` renders Markdown for the current route.
   * `TerminalPane.svelte` (+ `TerminalIsland.svelte`) provides a CLI (`ls`, `cd`, `open`, `pop`, `help`).
3. **Catch-all Astro Route** – `src/pages/[...slug].astro` pre-renders every `.html` path and decides at runtime which Astro/Svelte layout to use.
4. **Layouts**
   * `BaseLayout.astro` – always used, renders both the content pane and terminal.
   * Blog layout is now handled inside `ContentPane.svelte` when `layout: blog` is present in front-matter.

The site is published via GitHub Pages; Astro’s static output lives in `dist/`.

---

## 2 . Directory Cheat-Sheet
```
/                           project root
├─ src/
│  ├─ components/           shared Svelte components
│  │   ├─ ContentPane.svelte
│  │   └─ TerminalPane.svelte
│  ├─ layouts/              Astro page shells
│  │   └─ BaseLayout.astro
│  ├─ lib/
│  │   └─ virtualFs.ts      builds VFS & helpers
│  ├─ pages/
│  │   ├─ index.astro       homepage → BaseLayout
│  │   └─ [...slug].astro   catch-all for every other page
│  ├─ stores/               Svelte stores (client-side routing)
│  │   └─ router.ts
│  └─ content/              **all markdown lives here**
│      └─ ...
└─ site-reference.md        (this file)
```

---

## 3 . Virtual File System
`src/lib/virtualFs.ts` runs at build time to walk `src/content/**/*.md` and build a tree:
* Each node records `name`, `path`, `type` (`dir`/`file`) and any `children`.
* File nodes map `/foo/bar.md` → slug `foo/bar.html`.
* The VFS powers:
  * Static path generation in `[...slug].astro`.
  * Directory listings for the terminal `ls` command.
  * Path resolution for `cd`, `open`, `pop`.

---

## 4 . Routing Flow
```mermaid
graph TD
A(Terminal command or direct URL) -->|updates| S[router.ts store]
S --> C(ContentPane)
S --> T(TerminalPane)
A -->|build time| P[[...slug].astro → getStaticPaths]]
P -->|runtime| L{front-matter layout}
L --> B(BaseLayout)
B --> C[ContentPane]
C -->|layout: blog| Blog[Blog styling in ContentPane]
C -->|other| Prose[Prose styling in ContentPane]
B --> T[TerminalPane]
```

Explanation:
1. **Build time:** `[...slug].astro/getStaticPaths` reads the VFS to emit every `.html` path.
2. **Runtime (server-side render / pre-render):** `[...slug].astro` always renders `<BaseLayout>`, which includes both `ContentPane` and `TerminalPane`. `ContentPane.svelte` checks the markdown’s front-matter, and if `layout: blog`, applies blog styling to the content; otherwise, it renders with regular prose styling.
3. **Client side:** The embedded Svelte app controls navigation so the page never reloads after the first hit.

---

## 5 . Terminal Commands
| Command        | Description                                               |
|---------------|-----------------------------------------------------------|
| `ls`           | List items in current directory                           |
| `cd <dir>`     | Change directory (relative or absolute)                  |
| `open <file>`  | Push file path to router and render it                   |
| `pop`          | Return to previous path                                  |
| `help`         | Show built-in command help                               |

The terminal keeps history, supports arrow-key navigation, and can be collapsed with the **`Tab`** key.

---

## 6 . Adding Content
1. Create a Markdown file anywhere under `src/content`.
2. Use front-matter:
   ```yaml
   ---
   title: My Post
   date: 2025-06-14
   tags: [astro, svelte]
   layout: blog        # optional – enables blog styling in ContentPane
   ---
   ```
3. The file will be available at the equivalent `.html` path, e.g. `src/content/foo/bar.md` → `/foo/bar.html`.
4. No code changes or route files required.

---

## 7 . Dev & Build
```bash
npm install      # first time only
npm run dev      # hot-reload dev server at http://localhost:4321
npm run build    # static build to dist/
```

For GitHub Pages, push the `dist/` output (or let an action deploy).

---

## 8 . Troubleshooting
| Symptom                                   | Likely Cause & Fix                          |
|-------------------------------------------|---------------------------------------------|
| 404 on `.html` page                       | File missing under `src/content`, or wrong extension |
| Terminal `open` says “not a file”         | Path typo or points to directory            |
| New file not built                        | Ensure filename ends with `.md`; rerun build|
| Blog page shows prose, not blog styling | Front-matter lacks `layout: blog`           |

---

## 9 . Extending the Site
* **Custom commands:** add to `TerminalIsland.svelte`.
* **Styling:** Tailwind classes are sprinkled in layouts; edit them or add global CSS.
* **Components in Markdown:** Astro’s markdown supports `<Component />` usage if imported via front-matter.
* **Search:** hook into the VFS tree and a client-side fuzzy matcher.

Enjoy hacking on _Welcome to the Sunny Side_!
