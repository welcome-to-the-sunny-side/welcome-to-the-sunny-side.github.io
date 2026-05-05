# Welcome to the Sunny Side – Site Reference

A static, terminal-driven personal website built with Astro + Svelte + Tailwind. Deployed to GitHub Pages.

This file documents how the site is organized today. For prescriptive rules Claude Code should follow when editing the codebase, see `CLAUDE.md`.

---

## 1. Overview

Four moving pieces:

1. **Virtual File System (VFS)** — `src/lib/virtualFs.ts` mirrors `src/content/**/*.{md,html}` into a tree where `.md` is mapped to `.html`. The VFS drives static path generation, terminal listings, and path resolution.
2. **Catch-all Astro route** — `src/pages/[...slug].astro` pre-renders every `.html` path the VFS exposes, including `<dir>/index.html` directory pages. It always renders `BaseLayout`.
3. **Two-pane Svelte app** — `BaseLayout.astro` mounts `MobileNav` (mobile only), `ContentPane` (markdown/HTML viewer), and `TerminalPane` (xterm.js CLI, desktop only).
4. **Client-side router** — `src/stores/router.ts` is a Svelte store + `pushState`. After the first page load, navigation never reloads the page.

`/` resolves to `/home.html`. Build output goes to `dist/`.

---

## 2. Directory layout

```
/                                     project root
├─ src/
│  ├─ components/
│  │   ├─ ContentPane.svelte          markdown/HTML viewer + nav-view directory listings
│  │   ├─ MobileNav.svelte            breadcrumb bar (mobile only)
│  │   ├─ MusingsStream.svelte        encrypted-posts UI (lazy-loaded)
│  │   ├─ TerminalIsland.svelte       xterm.js terminal + command logic
│  │   └─ TerminalPane.svelte         desktop terminal frame (collapse/expand)
│  ├─ layouts/
│  │   └─ BaseLayout.astro            the only layout
│  ├─ lib/
│  │   ├─ markdown.ts                 shared markdown-it singleton renderer
│  │   ├─ musingsWorker.ts            scrypt + AES-GCM decryption (off-thread)
│  │   └─ virtualFs.ts                VFS construction + helpers
│  ├─ pages/
│  │   ├─ index.astro                 → BaseLayout
│  │   └─ [...slug].astro             catch-all → BaseLayout
│  ├─ skins/
│  │   ├─ types.ts                    Skin interface
│  │   ├─ dark.ts                     retro-dark palette
│  │   └─ sunny.ts                    warm-light palette
│  ├─ stores/
│  │   ├─ router.ts                   client-side path store
│  │   ├─ skin.ts                     content-pane skin (+ DOM side effects)
│  │   └─ terminalTheme.ts            terminal theme (independent from skins)
│  ├─ styles/
│  │   ├─ global.css                  Tailwind directives, font import, base styles
│  │   └─ custom-elements.css         spoiler / theorem-box styles
│  └─ content/                        all authored content (md + html)
├─ public/
│  ├─ vfs-date-index.json             generated; powers terminal date sorting
│  ├─ home-bg-index.json              generated; lists home background images
│  └─ musings/                        generated; manifest + encrypted blobs
├─ tools/
│  ├─ build-vfs-date-index.mjs        scans frontmatter dates → vfs-date-index.json
│  ├─ build-home-bg-index.mjs         scans home assets → home-bg-index.json
│  └─ musings/main.py                 encrypts musings sources → public/musings
├─ tailwind.config.js
├─ CLAUDE.md
├─ refactor-progress.md               living refactor tracker
└─ site-reference.md                  this file
```

---

## 3. Virtual File System

`src/lib/virtualFs.ts` builds a tree at module load time:

- Each node has `name`, `path`, `type` (`dir`/`file`), and `children`.
- File nodes map `/foo/bar.md` to `/foo/bar.html`; raw `.html` files keep their extension.
- The VFS powers static path generation in `[...slug].astro`, `ls` output in the terminal, mobile nav-view directory pages, and `cd`/`open`/`pop` resolution.
- **Do not create files named `index.md`** — they collide with auto-generated `<dir>/index.html` nav-view pages.

Two build-time helpers feed the VFS at runtime:

- `tools/build-vfs-date-index.mjs` extracts frontmatter dates into `public/vfs-date-index.json`. The terminal reads this for `ls -d`, `ls -dl`, `ls -de`, and `ls -v` instead of having to bundle markdown source on the client.
- `tools/build-home-bg-index.mjs` walks `public/assets/home/active/<skin>/<device>/` and writes `public/home-bg-index.json`. `ContentPane` fetches that file the first time the home page renders, so background image URLs are not bundled into the JS chunk.

Both scripts run via `predev` and `prebuild` hooks in `package.json`.

---

## 4. Routing & layouts

- **Build time.** `getStaticPaths` in `[...slug].astro` reads the VFS and emits every `.html` path, including a synthetic `<dir>/index.html` for each directory.
- **Pre-render.** Every page renders the same shell: `BaseLayout.astro`. `BaseLayout` mounts `MobileNav` (wrapped in `md:hidden`), `ContentPane`, and `TerminalPane` (`hidden md:block`). There is no per-page layout decision in Astro; layout choices happen inside `ContentPane` based on frontmatter.
- **Client.** After first paint, navigation goes through `currentPath` in `src/stores/router.ts`. Terminal commands, mobile breadcrumb taps, and nav-view clicks all call `currentPath.push(path)`, which updates the URL via `pushState` and triggers `ContentPane.loadContent()`.

`ContentPane` keeps a `displayPath` separate from `path` during loads so the previous page (and its background image) stays visible while the next one fetches. MathJax typeset and inline `<script>` execution are deferred until the new content is mounted.

---

## 5. Terminal

The terminal lives in `TerminalPane.svelte` (frame + collapse logic) and `TerminalIsland.svelte` (xterm.js instance, input handling, command dispatch). It is desktop-only.

### Commands

| Command | Description |
|---|---|
| `ls` | List items as a tree. Flags: `-r` recursive, `-d`/`-dl`/`-de` date sort, `-v` show dates |
| `cd <dir>` | Change directory (relative or absolute) |
| `open <file>` | Push file path to the router and render it |
| `pop` | Return to the previous path |
| `clear` | Clear terminal output |
| `cskins` / `cskin <name>` | List / set content-pane skin |
| `tskins` / `tskin <name>` | List / set terminal theme |
| `help` | Show built-in command help |

### Keyboard

| Shortcut | Purpose |
|---|---|
| `Tab` | Accept current autocomplete suggestion |
| `Shift + Tab` | Cycle through autocomplete suggestions |
| `← / →` | Move cursor within the input line |
| `Shift + ←` | Collapse terminal pane |
| `Shift + →` | Expand / focus terminal pane |
| `Shift + ↑` | Move focus to content pane |
| `h` / `j` / `k` / `l` | Scroll content pane (when terminal is unfocused) |

### xterm.js gotchas

A few things in `TerminalIsland.svelte` look like they could be simplified but cannot — note them before refactoring:

- **`onKey` and `onData` fire alongside each other**, not as alternatives. Calling `preventDefault()` in `onKey` only blocks the browser's default; the data callback still receives the keystroke. Escape sequences (`\x1b[Z` for Shift+Tab, `\x1b[A/B/C/D` for arrows) reach `writeChar` as data, so the `escSeq` parser there must consume them or they get inserted as literal text.
- **Cursor escapes do not wrap across visual rows.** `\x1b[D` and `\x1b[C` stop at column boundaries, not visual line boundaries. Backspace at column 0 of a wrapped row is handled specifically: move up one row and to the last column, then clear forward (`\x1b[A` + `\x1b[${cols}G` + `\x1b[J`).
- **Ctrl/Cmd passthrough.** `customKeyEventHandler` lets browser shortcuts (Ctrl+R, Ctrl+L, Ctrl+F) bypass xterm so the user can refresh, reload, find-in-page normally.
- **Bottom padding.** `fitWithPadding()` reserves one row at the bottom so the cursor doesn't hug the edge.

---

## 6. Mobile navigation

The terminal is hidden below 768px. In its place:

- **`MobileNav.svelte`** renders a horizontal breadcrumb derived from the current path. Each parent segment is a button that navigates to that directory's `<dir>/index.html` nav-view page; the last segment is plain text.
- **Nav-view pages.** `ContentPane` detects paths ending in `/index.html` and renders a tree-glyph directory listing using `vfsList()`. Tapping a directory navigates deeper; tapping a file opens it.
- **Layout.** `BaseLayout` puts `MobileNav` in a `md:hidden` div and uses `grid-rows-[auto_1fr]` so the breadcrumb takes only the height it needs.

---

## 7. Content authoring

1. Drop a Markdown file anywhere under `src/content/`.
2. Use frontmatter:

   ```yaml
   ---
   title: My Post
   date: 2025-06-14
   tags: [astro, svelte]
   displayMode: blog        # optional — enables blog styling
   ---
   ```

3. The file becomes available at the equivalent `.html` path, e.g. `src/content/foo/bar.md` → `/foo/bar.html`. No code or route changes required.

`displayMode` values:
- omitted — plain prose styling
- `blog` — blog header (title / date / tags) + blog body styling
- `musings` — lazy-loads `MusingsStream.svelte`; only used by `/void.html`

For raw `.html` files under `src/content/`, an optional `<meta name="wtss:date" content="YYYY-MM-DD">` in `<head>` feeds `ls -d`/`-v` the same way frontmatter does for markdown.

---

## 8. Markdown rendering pipeline

Worth its own section because the choices here are non-obvious.

- **Source loading.** `ContentPane` and `MusingsStream` both `import.meta.glob('...', { query: '?raw', import: 'default' })` to pull markdown as raw strings. We do *not* use Astro's compiled-frontmatter API — switching to it inflated per-page chunks ~2.5× because each module bundled compiled HTML and a Content component we don't render.
- **Frontmatter parsing.** A small custom YAML parser in `ContentPane.svelte` (`parseFrontmatter`) handles `key: value`, quoted strings, and one-line `[a, b]` lists. That's the entire surface we use; no need for a YAML library.
- **Renderer.** `src/lib/markdown.ts` exports a single async `getRenderer()` that lazily builds a `markdown-it` instance with:
  - `highlight.js` (core only, C++ language registered — aliases `cpp`, `c++`, `cc`, `cxx`, `hpp`, `hxx`). Other code blocks are escaped, not highlighted, to keep the bundle small.
  - A small inline-rule plugin that wraps `$...$`, `$$...$$`, `\(...\)`, `\[...\]` segments as `html_inline` tokens. This stops markdown-it from interpreting `_` inside math as emphasis.
- **MathJax.** Loaded on demand from the CDN (`cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js`) the first time a non-home page renders, configured with `displayOverflow: 'linebreak'` and `linebreaks: { inline: true, width: '100%' }` so long equations wrap on mobile.
- **Inline `<script>` execution.** For raw `.html` pages, `ContentPane.executeScripts()` clones each `<script>` element into a fresh node so the browser actually runs it (otherwise `innerHTML`-injected scripts are inert).

---

## 9. Skins & terminal themes

Two independent theming systems. The split exists because a real terminal window and content pane on a desktop are independent — light terminal + dark editor is a normal combination.

### Content skins (`cskins` / `cskin`)

- Defined in `src/skins/{dark,sunny,types}.ts`.
- A skin has `name`, `classes` (string class names applied to body / content pane / blog headings), and `cssVars` (a map of CSS custom properties).
- `src/stores/skin.ts` is the single source of DOM side effects: `applySkin()` writes the classes and CSS variables to `<html>` / `<body>`. Do not duplicate this logic elsewhere (in particular, `BaseLayout.astro` should never have an inline skin script).
- Tailwind tokens (color, font, spacing, radius, easing) reference these CSS variables, so a skin can override every visual token without rebuilding.
- Selection persists in `localStorage` under `wtss-skin`.

### Terminal themes (`tskins` / `tskin`)

- Defined in `src/stores/terminalTheme.ts`. Five themes: `classic`, `solarized`, `gruvbox`, `dracula`, `nord`.
- A theme has three sections:
  - `xterm` — full xterm.js color palette (background, foreground, cursor, 16 ANSI colors, selection).
  - `ui` — RGB triples for ANSI escape colors used by terminal output (path color, file color, directory color).
  - `wrapper` — colors for the `TerminalPane` border, glow, shadow, and toggle button. Bound via `style:--tw-*={theme.wrapper.*}` so the CSS in `TerminalPane.svelte` reads from custom properties.
- `TerminalIsland.svelte` subscribes to the theme store and updates xterm's `options.theme`, the ANSI-color string constants used for prompt/listing output, and CSS custom properties on the container (scrollbar, cursor, selection).
- Old text already rendered keeps its previous theme's colors. The `tskin` command output suggests `clear` if you want a clean look.
- Selection persists in `localStorage` under `wtss-terminal-theme`.

---

## 10. Musings (encrypted personal posts)

A page (`/void.html`) that displays a stream of posts; some are public markdown, others are AES-GCM encrypted blobs that decrypt client-side with a master passphrase.

### Pipeline

- **Sources** live in gitignored `misc_assets/musings_src/` (one `.md` per post, plus `key.txt` with the passphrase).
- **`tools/musings/main.py`** processes those sources and writes:
  - `public/musings/manifest.json` — list of entries (`id`, `ts`, `tier`, `path`).
  - `public/musings/data/*.json` — one blob per post. Public posts contain raw markdown; private posts contain `{ kdf, iv, ad, ct }` (scrypt N=32768/r=8/p=1, AES-256-GCM, AAD `musings:<id>:v1`).

### Frontend

- **`MusingsStream.svelte`** is loaded only when `displayMode: musings`, via dynamic import in `ContentPane.ensureMusingsLoaded()`. This keeps `scrypt-js` and the musings UI out of the first-paint chunk.
- The component fetches the manifest, then renders posts via `IntersectionObserver`-driven incremental pagination (`PAGE_SIZE = 12`). Each post fetches its own blob when it scrolls into view; private posts show a ciphertext preview until decrypted.
- **Decryption runs in `src/lib/musingsWorker.ts`** (scrypt → AES-GCM). Keeping it off the main thread is what lets the decrypt-button shuffle animation stay smooth.
- The passphrase lives in a single in-memory input at the top of the page; never persisted.

---

## 11. HTML content & games

`.html` files under `src/content` are mapped 1-to-1 in the VFS without markdown processing. They render through the same `ContentPane` path, inheriting skins automatically. Inline `<script>` tags are re-cloned at mount time so they actually run.

Current pages:

| Name | Path | Tech |
|---|---|---|
| Zetamac Arithmetic Sprint | `/games/zetamac.html` | Vanilla JS + Tailwind + Chart.js |
| Codeforces AC Archiver | `/misc/cf-archiver.html` | Vanilla JS + JSZip + Web Crypto |

---

## 12. Build & deploy

```bash
npm install
npm run dev      # http://localhost:4321 — predev runs both index builders first
npm run build    # → dist/
npm run preview
npm run deploy   # build + push dist/ to gh-pages
```

`predev` and `prebuild` both run `tools/build-vfs-date-index.mjs` and `tools/build-home-bg-index.mjs`. If you add or rename content (or home backgrounds) outside the dev server, restart it so the indexes regenerate.

---

## 13. Troubleshooting

| Symptom | Likely cause |
|---|---|
| 404 on a `.html` page | Missing source file under `src/content/`, or wrong extension |
| Terminal `open` says "not a file" | Path typo, or path resolves to a directory |
| Inline math like `$a_{i}$` shows underscores as italics | The math-protection plugin in `src/lib/markdown.ts` should handle this. If it doesn't, the source is probably outside a math delimiter the plugin recognizes (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) |
| Long math overflows horizontally on mobile | MathJax's `displayOverflow: 'linebreak'` config in `ContentPane` should break it. If a single un-breakable token is causing overflow, wrap it differently in source |
| `ContentPane.*.js` is unexpectedly large | Probably something heavy got imported statically. Musings, MathJax, and home-background URLs should all be loaded lazily — check that no `import` statement at module top accidentally pulled them back in |
| Terminal input misbehaves at line wrap | See §5 "xterm.js gotchas" — handle the boundary case specifically; don't rewrite the cursor logic |
| New file doesn't appear in `ls -d`/`-v` output | Restart dev server so `build-vfs-date-index.mjs` reruns |
| New home background doesn't appear | Restart dev server so `build-home-bg-index.mjs` reruns |

---

## 14. Extending the site

- **New terminal command** — add a `case` in the `exec()` switch in `TerminalIsland.svelte`. Update the `help` output and §5 of this file.
- **New skin** — add `src/skins/<name>.ts`, register it in `src/stores/skin.ts`, and make sure every CSS variable referenced by Tailwind tokens is defined. Test both `cskin <name>` and a fresh page load (the store reads `localStorage` on first load).
- **New terminal theme** — add an entry in `src/stores/terminalTheme.ts` covering all three sections (`xterm`, `ui`, `wrapper`).
- **Custom markdown elements** — use raw HTML with the styling hooks in `src/styles/custom-elements.css`:
  - `<details><summary class="spoiler-summary">…</summary><div class="spoiler-content">…</div></details>`
  - `<div class="theorem-box">…</div>`
  - `<ul class="outline-list">…</ul>`

  Long lines (e.g. LaTeX) scroll horizontally inside spoiler / theorem boxes rather than overflowing the page.

---

## 15. Recent overhauls (changelog summary)

- **2026-05-05 — Refactor sweep.** Three-stage cleanup tracked in `refactor-progress.md`: (1) deletions of unused files / dead code, (2) markdown-renderer consolidation into `src/lib/markdown.ts`, skin/CSS dedup, `TerminalPane` simplification, eager home-bg glob → fetched manifest, (3) `MusingsStream` interval cleanup on destroy.
- **2026-03-22 — Independent terminal themes.** `tskins` / `tskin` commands; renamed previous `skins` / `skin` to `cskins` / `cskin`.
- **2026-03-21 — Mobile navigation.** Removed terminal on mobile; added `MobileNav` breadcrumb and `<dir>/index.html` nav-view pages.
- **2025-09 — Bundle splitting.** `MusingsStream` lazy-loaded; `highlight.js` reduced to C++ only; `scrypt-js` confined to the worker.
- **2025-08 — Musings.** Encrypted-posts feature with scrypt + AES-GCM, off-thread decryption.
- **2025-06 — Skin system.** Tailwind tokens moved onto CSS custom properties; dark + sunny skins.

Enjoy hacking on _Welcome to the Sunny Side_!
