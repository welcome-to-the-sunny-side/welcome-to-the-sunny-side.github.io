# Welcome to the Sunny Side – Site Reference

A static, terminal-driven personal website built with Astro + Svelte + Tailwind. Deployed to GitHub Pages.

This file documents how the site is organized today. For prescriptive rules Claude Code should follow when editing the codebase, see `CLAUDE.md`.

---

## 1. Overview

Four moving pieces:

1. **Virtual File System (VFS)** — `src/lib/virtualFs.ts` mirrors `src/content/**/*.{md,html}` into a tree where `.md` is mapped to `.html`. The VFS drives static path generation, terminal listings, and path resolution.
2. **Catch-all Astro route** — `src/pages/[...slug].astro` pre-renders every `.html` path the VFS exposes, including `<dir>/index.html` directory pages. It always renders `BaseLayout`, and since 2026-09 it also renders the page's markdown to HTML at build time (`src/lib/prerender.ts`) so the static file carries the article body, a per-page `<title>`, a meta description, and a canonical URL. Agents, crawlers, and link previews read the content without running JavaScript.
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
│  │   ├─ contentTypes.ts             InitialContent type shared by prerender + ContentPane
│  │   ├─ figures.ts                  build-time inlining of src/figures/**/*.svg (server-only)
│  │   ├─ frontmatter.ts              tiny YAML front-matter parser (build + client)
│  │   ├─ markdown.ts                 shared markdown-it singleton renderer
│  │   ├─ musingsWorker.ts            scrypt + AES-GCM decryption (off-thread)
│  │   ├─ pageTitle.ts                <title> format shared by build + client
│  │   ├─ prerender.ts                build-time markdown → HTML (server-only)
│  │   ├─ typesetMath.ts              build-time MathJax → CHTML (server-only)
│  │   └─ virtualFs.ts                VFS construction + helpers
│  ├─ pages/
│  │   ├─ index.astro                 "/" → BaseLayout (home)
│  │   ├─ [...slug].astro             catch-all → prerenderPath() → BaseLayout
│  │   ├─ prerendered/[...slug].json.ts  same render as JSON, for client-side navigation
│  │   └─ sitemap.xml.ts              static sitemap of every VFS page
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
│  ├─ fix-html-filenames.mjs          postbuild: dist/*.html.html → *.html
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
- **Pre-render.** Every page renders the same shell: `BaseLayout.astro`. `BaseLayout` mounts `MobileNav` (wrapped in `md:hidden`), `ContentPane`, and `TerminalPane` (`hidden md:block`). Layout choices (blog header, nav-view, musings) happen inside `ContentPane` based on frontmatter — but the *content* is now rendered at build time too: `[...slug].astro` calls `prerenderPath()` from `src/lib/prerender.ts`, which resolves the slug against the VFS and returns an `InitialContent` value:
  - `md` — markdown rendered to HTML with the same `getRenderer()` singleton the client uses, plus parsed frontmatter;
  - `nav` — the directory listing entries for `<dir>/index.html`;
  - `home` — `/`, `/index.html`, `/home.html` (the router maps `/` to `/home.html`, so the root `index.html` file is pre-rendered as home, not as the root listing);
  - `client` — left empty for the browser: `displayMode: musings` pages and raw `.html` content (whose inline scripts would otherwise run twice).
  `BaseLayout` passes `initial` into `ContentPane` as a prop and sets `<title>` (`src/lib/pageTitle.ts`), `<meta name="description">` (first substantial paragraph), and `<link rel="canonical">` (built from `site` in `astro.config.mjs`, the custom domain). `prerender.ts` holds an *eager* raw glob of all markdown; it is only imported from the Astro route, so it never enters a client chunk — keep it that way.
- **SVG figures are inlined at build time.** Post figures are SVG files in `src/figures/` (e.g. `src/figures/sais/slope-view.svg`), not images under `public/`. A markdown page places one with an empty placeholder inside a `<figure>`: `<div class="svg-figure" data-svg="sais/slope-view.svg" role="img" aria-label="..."></div>`. After math typesetting, `prerender.ts` calls `inlineFigures()` (`src/lib/figures.ts`), which pastes the file's contents into the placeholder; a missing file fails the build. The ordering matters, because MathJax would otherwise treat the `$` in figure text (e.g. the sentinel in `baacbcbacbccdaa$`) as math delimiters. Inline SVG (unlike `<img>`) is styled by the page. Each folder of `src/figures/` is one figure set with its own `palette.css`, which sets that set's `--fig-*` colours and text font per skin, keyed on `<html data-skin="...">` (set by `applySkin()`). `inlineFigures()` inlines it as a `<style>` once, before the page's first figure from that folder; a missing palette fails the build. So figure colours never touch the skin files, they recolour instantly on `cskin`, and pages without figures get no extra CSS. A new skin needs a block in each figure set's palette, or its figures render with browser defaults (black, no fills). Mono figure text uses the skin's `--font-mono`. They have no background, so the content pane shows through. `.svg-figure svg` in `global.css` scales them to the column width. Only build-rendered markdown pages get this; musings and raw `.html` pages would show an empty placeholder. The SVGs are generated by Python scripts in `bs/sais/claude/` (`*_view.py`, sharing `fig.py`). `bs/` is gitignored, so the scripts are local only. Run e.g. `python3 bs/sais/claude/slope_view.py src/figures/sais/slope-view.svg [preview-dir]`; the optional second argument also writes sunny and dark preview PNGs, coloured from `src/figures/sais/palette.css` itself.
- **Math is typeset at build time.** `prerender.ts` passes markdown-it's output through `typesetMath()` (`src/lib/typesetMath.ts`), which runs MathJax 4 in Node (`@mathjax/src` + `@mathjax/mathjax-newcm-font`, liteDOM, assistive MathML) and returns a `<style>` block with that page's CHTML rules, followed by the typeset HTML. Fonts load from jsDelivr, pinned to the installed font package version. The browser never runs MathJax for markdown pages. This was done because client-side typesetting of the SA-IS post (~500 expressions) showed raw TeX for seconds and made mobile scrolling lag. The meta description is still built from the untypeset HTML, so it reads `$...$` rather than MathML text.
- **Display math re-breaking.** Inline line breaks are width-independent, so they survive the build. Display-equation breaks need the real column width, so each display `mjx-container` carries its TeX in `data-tex`. `ContentPane.rebreakDisplayMath()` re-typesets client-side only the display equations that overflow, at load and when a `<details>` spoiler opens. Pages where everything fits never load MathJax.
- **Hydration.** `ContentPane` adopts `initial` as its starting state when `initial.path` matches the browser URL, so Svelte hydrates over the static markup without re-rendering. `[...slug].astro` makes `initial.html` non-enumerable: Astro skips it when serializing island props (otherwise the typeset article ships twice, ~1 MB for SA-IS), while the server render still reads it. On the client, `ContentPane` reads the HTML back from the server-rendered `main article` / `#content-html-container`.
- **Client-side navigation** to a markdown page fetches `/prerendered/<path>.json` (`src/pages/prerendered/[...slug].json.ts`, the same memoized `prerenderPath()` output), so it matches a direct load and needs neither markdown-it nor MathJax. Musings have no JSON, so they 404 there and fall back to the client markdown-it + MathJax path, as do raw `.html` pages and the 404 page.
- **Client.** After first paint, navigation goes through `currentPath` in `src/stores/router.ts`. Terminal commands, mobile breadcrumb taps, and nav-view clicks all call `currentPath.push(path)`, which updates the URL via `pushState` and triggers `ContentPane.loadContent()`, which also updates `document.title`. Nav-view entries are real `<a href>` links (click is intercepted with `preventDefault`) so crawlers can follow them.

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
- **Mobile scrolling.** Below `md` the *document* scrolls. The grid is `min-h-[100dvh]` and `main` grows (`overflow-x-clip`, no `overflow-y`). The breadcrumb wrapper is `sticky top-0`. From `md` up the grid is `h-screen` and `main` is the scroll container beside the terminal. Why: on iOS WebKit, scrolling a math-heavy `main` that also holds nested horizontal scroll areas (code blocks, spoilers) lagged badly on SA-IS, while Android/Blink was fine. Any one of these fixed it in on-device tests: document scroll, removing the nested scrollers, removing the math, or `content-visibility: auto`. The hidden assistive MathML was not the cause. The scrollbar styles in `global.css` target both `main` and `html` for this reason.

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
- **Frontmatter parsing.** A small custom YAML parser in `src/lib/frontmatter.ts` (`parseFrontmatter`, shared by `ContentPane` and `prerender.ts`) handles `key: value`, quoted strings, and one-line `[a, b]` lists. That's the entire surface we use; no need for a YAML library.
- **Build-time vs runtime rendering.** The same `getRenderer()` runs in Node at build time (`prerender.ts`) and in the browser after client-side navigation, so output is identical and hydration is a no-op. Only markdown pages are pre-rendered; musings and raw `.html` pages stay client-only (see §4).
- **Renderer.** `src/lib/markdown.ts` exports a single async `getRenderer()` that lazily builds a `markdown-it` instance with:
  - `highlight.js` (core only, C++ language registered — aliases `cpp`, `c++`, `cc`, `cxx`, `hpp`, `hxx`). Other code blocks are escaped, not highlighted, to keep the bundle small. The exception is pseudocode fences (`pseudo`): no grammar is loaded, but `#` comments up to end of line are wrapped in `<span class="pseudo-comment">` and coloured green in `global.css`.
  - A small inline-rule plugin that wraps `$...$`, `$$...$$`, `\(...\)`, `\[...\]` segments as `html_inline` tokens. This stops markdown-it from interpreting `_` inside math as emphasis.
- **Client MathJax.** Markdown pages are typeset at build time (above). The CDN copy (`cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js`) is still loaded on demand for musings, raw `.html` pages, the 404 page, and display-equation re-breaking. It uses `startup: { typeset: false }` (it must not rescan already-typeset pages) and is configured with `displayOverflow: 'linebreak'` and `linebreaks: { inline: true, width: '100%' }` so long equations wrap on mobile. MathJax 4's default semantic enrichment, speech and braille generation are switched off via `options.menuOptions.settings` (`enrich/speech/braille: false`, `assistiveMml: true` as the screen-reader fallback, `inTabOrder: false`). With them on, the SA-IS post (~500 expressions) took ~5.6 s to typeset instead of ~0.4 s, and mobile scrolling lagged while that ran. The top-level `enableSpeech`/`enableEnrichment` options do *not* override these menu settings, so set them here.
- **Inline `<script>` execution.** For raw `.html` pages, `ContentPane.executeScripts()` clones each `<script>` element into a fresh node so the browser actually runs it (otherwise `innerHTML`-injected scripts are inert).

---

## 9. Skins & terminal themes

Two independent theming systems. The split exists because a real terminal window and content pane on a desktop are independent — light terminal + dark editor is a normal combination.

### Content skins (`cskins` / `cskin`)

- Defined in `src/skins/{dark,sunny,types}.ts`.
- A skin has `name`, `classes` (string class names applied to body / content pane / blog headings), and `cssVars` (a map of CSS custom properties).
- `src/stores/skin.ts` is the single source of DOM side effects: `applySkin()` writes the classes and CSS variables to `<html>` / `<body>`, and the skin's name to `<html data-skin>` so that CSS can target a skin (used by figure palettes, §8). Do not duplicate this logic elsewhere (in particular, `BaseLayout.astro` should never have an inline skin script).
- Tailwind tokens (color, font, spacing, radius, easing) reference these CSS variables, so a skin can override every visual token without rebuilding.
- Selection persists in `localStorage` under `wtss-skin`.
- Prose colours come from the skin, not the typography plugin's greys: `tailwind.config.js` maps `--tw-prose-{body,headings,bold,code,bullets,counters}` (and their `-invert-` twins) to `--text`, `--title`, `--text-muted`. Every skin must define `--title`.
- Font sizes `fs-{xs,sm,base,lg,xl,2xl}` are per-skin (sunny = dark ×1.11, same as prose); their line heights are unitless and shared, set in `tailwind.config.js`.
- `classes.proseBody` is added only to the blog `<article>` and musings articles (not raw `.html` pages). The dark skin uses it to set headings, paragraphs, list items, blockquotes and table cells in IBM Plex Sans (Tailwind `font-sans`, loaded in `global.css`; the dark `blogTitle` uses it too) while code, the post date/tags and the terminal stay in IBM Plex Mono. Plex Sans runs larger than sunny's serif at the same size, so sunny's `prose-font-size` (`1.11rem`) is set ~1/0.9× dark's (`1rem`) to keep the two skins visually matched. Sunny sets it to `''`.

### Parked: sunny recolour of the dark home image

Tried 2026-10-16 and frozen; sunny still uses its own home image (`active/sunny/`). Script kept at `tools/experiments/home-bg-tritone.py` (usage in its docstring).

- **Goal:** give the sunny skin a version of the dark home image (`expoutput-1500w.webp`) in the sunny palette. Two directions: a "vanilla" port (same light/dark layout) and an inverted, "dark heaven cyberpunk" port.
- **Key finding:** the dark image is a *tritone*: solid black, bright teal, and scanlines that are a dark shade of the teal, not black. A two-colour (duotone) map sends scanlines and solids to the same dark, and the scanline areas average into mud. Mapping the three luminance stops (about 0 / 37 / 230) to three colours keeps the original's clean look.
- **Best result:** "v4", vanilla: solid `#2A1A0A`, scanlines `#D9A441`, light `#FAF8F4`. Inverted favourites were "i1" (solid `#F6F2EC`, scanlines `#8A520F`, dark `#121110`) and "i4" (`#F6F2EC`, `#6A3C08`, `#0B0907`).
- **Why it stalled:** v4's light areas average out to tan (about `#EAD09F`), clearly darker than the blog background `#F6F2EC`. Lightening it (paler scanline colour, and/or reaching cream earlier in the luminance ramp so the lines thin out) made the image look rough and patchy in places, already at "v4c" (scanlines `#E6BF73`, cream reached at L150). Untested guess: the steep ramp is amplifying compression noise in the source webp's teal fields.
- **Ideas if resumed:** start from a less-compressed or higher-resolution master; smooth or denoise the luminance before mapping; or keep v4's colours and lighten with a cream overlay in CSS instead of changing the ramp. The mobile image (`mobileoutput1.jpg`) was never converted.

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
- **Idempotent re-encryption.** Private posts are randomized (fresh salt+IV each encryption), which would otherwise make every blob — and the manifest's `size`/`hash` — change on every rebuild, polluting git history. `try_reuse_private_blob()` avoids this: before encrypting, it decrypts the existing committed blob and, if the plaintext is unchanged, reuses the stored ciphertext (refreshing only the cleartext `ts`). So a blob's bytes change only when its content actually changes. This is safe — the same key+IV only ever re-encrypts the *same* plaintext (no GCM nonce reuse); a missing/corrupted/tampered blob or a rotated passphrase fails to decrypt and falls back to a fresh encrypt.

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

**Output filenames.** `build.format: 'file'` plus slugs that already end in `.html` makes Astro write `dist/foo.html.html`. The `postbuild` hook runs `tools/fix-html-filenames.mjs`, which renames those to `foo.html` (and drops the root `index.html.html`, a duplicate of the `index.astro` output) so `dist/` matches the site's URLs without relying on GitHub Pages' append-`.html` fallback. `astro preview` therefore serves article URLs correctly.

**Crawler surface.** `src/pages/sitemap.xml.ts` emits `dist/sitemap.xml` listing every VFS page (using `site` from `astro.config.mjs`), and `public/robots.txt` points at it. The live domain's `robots.txt` is fronted by Cloudflare's managed content-signals block; our file is appended after it.

---

## 13. Troubleshooting

| Symptom | Likely cause |
|---|---|
| 404 on a `.html` page | Missing source file under `src/content/`, or wrong extension |
| Terminal `open` says "not a file" | Path typo, or path resolves to a directory |
| Inline math like `$a_{i}$` shows underscores as italics | The math-protection plugin in `src/lib/markdown.ts` should handle this. If it doesn't, the source is probably outside a math delimiter the plugin recognizes (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) |
| Long math overflows horizontally on mobile | Display math: `rebreakDisplayMath()` in `ContentPane` should re-typeset it from `data-tex` with `displayOverflow: 'linebreak'`. Inline math: breaks come from the build-time render (`typesetMath.ts`). If a single un-breakable token is causing overflow, wrap it differently in source |
| Math renders as raw TeX / errors on a markdown page | It is typeset at build time: check the `npm run build` output, and that `typesetMath.ts` loads the TeX package the macro needs (it mirrors the CDN build's default + autoloaded packages) |
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

- **2026-10-16 — Mobile document scroll.** Below `md` the page scrolls instead of `main`, fixing iOS scroll lag on math-heavy posts (see §Mobile scrolling).
- **2026-10-16 — Inline SVG figures.** The SA-IS post's figures moved from PNGs in `public/assets/sais/` to SVGs in `src/figures/`, which are inlined at build time (`src/lib/figures.ts`) and coloured per skin by a palette for each figure set (`src/figures/sais/palette.css`). `<html>` now carries `data-skin`.
- **2026-10-16 — Build-time math.** Markdown pages ship with math already typeset (`src/lib/typesetMath.ts`). Client navigation uses `/prerendered/*.json`. Display equations that overflow are re-broken client-side from `data-tex`. Article HTML is no longer duplicated in island props.
- **2026-09-07 — Build-time content rendering.** `[...slug].astro` now renders each markdown page to HTML at build (`src/lib/prerender.ts`) and passes it to `ContentPane` as `initial`; static pages carry the article body, per-page `<title>`, description, and canonical. Fixes AI agents / crawlers seeing only the empty shell. Added `sitemap.xml`, `robots.txt`, real `<a>` links in nav-view, `document.title` updates on navigation; `site` switched to the custom domain; `postbuild` renames `*.html.html` → `*.html`. Musings (`/misc/void.html`) and raw `.html` pages intentionally remain client-rendered.
- **2026-05-05 — Refactor sweep.** Three-stage cleanup tracked in `refactor-progress.md`: (1) deletions of unused files / dead code, (2) markdown-renderer consolidation into `src/lib/markdown.ts`, skin/CSS dedup, `TerminalPane` simplification, eager home-bg glob → fetched manifest, (3) `MusingsStream` interval cleanup on destroy.
- **2026-03-22 — Independent terminal themes.** `tskins` / `tskin` commands; renamed previous `skins` / `skin` to `cskins` / `cskin`.
- **2026-03-21 — Mobile navigation.** Removed terminal on mobile; added `MobileNav` breadcrumb and `<dir>/index.html` nav-view pages.
- **2025-09 — Bundle splitting.** `MusingsStream` lazy-loaded; `highlight.js` reduced to C++ only; `scrypt-js` confined to the worker.
- **2025-08 — Musings.** Encrypted-posts feature with scrypt + AES-GCM, off-thread decryption.
- **2025-06 — Skin system.** Tailwind tokens moved onto CSS custom properties; dark + sunny skins.

Enjoy hacking on _Welcome to the Sunny Side_!
