# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A static, terminal-driven personal website/blog built with Astro + Svelte + Tailwind CSS. Users navigate content via an in-browser terminal emulator (ls, cd, open, pop, help) alongside a content pane. Deployed to GitHub Pages at `welcome-to-the-sunny-side.github.io`.

## Commands

- `npm run dev` — start dev server (runs `build-vfs-date-index.mjs` first via predev hook)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build
- `npm run deploy` — build + deploy to GitHub Pages via gh-pages

## Architecture

**Virtual File System (VFS):** `src/lib/virtualFs.ts` maps `src/content/**/*.{md,html}` into a tree where `.md` → `.html`. This powers static path generation, terminal directory listings, and path resolution. Two build-time scripts feed the VFS at runtime: `tools/build-vfs-date-index.mjs` extracts frontmatter dates into `public/vfs-date-index.json` (terminal sorting), and `tools/build-home-bg-index.mjs` lists home background images into `public/home-bg-index.json` (so URLs are not bundled into the JS chunk). Both run via `predev`/`prebuild` hooks.

**Routing:** `src/pages/[...slug].astro` is a catch-all that pre-renders every VFS path. Client-side navigation is handled by `src/stores/router.ts` (Svelte writable store + pushState) so the page never reloads after initial load. `/` resolves to `/home.html`.

**Two-pane layout:** `BaseLayout.astro` renders `ContentPane.svelte` (markdown/HTML display with blog layout support via `layout: blog` frontmatter) and `TerminalPane.svelte` (xterm.js-based CLI).

**Skinning:** Two themes (dark, sunny) managed via `src/stores/skin.ts`. Skins define CSS variables and classes; Tailwind config maps semantic tokens (bg, surface, accent, text, etc.) to CSS custom properties.

**Content:** All content lives in `src/content/` as Markdown (with frontmatter) or HTML files. Sections: algo (problems, theory, contests, notes), life, lit, misc, games.

## Key Details

- Tailwind uses CSS custom properties for theming — colors, fonts, spacing are all `var(--*)` based (see `tailwind.config.js`)
- Markdown rendering uses markdown-it + MathJax (math, loaded from CDN) + highlight.js (code). The renderer is a shared singleton in `src/lib/markdown.ts` — do not build a second markdown-it instance elsewhere.
- Markdown source is loaded via `import.meta.glob('...', { query: '?raw' })` and parsed by a tiny custom YAML parser in `ContentPane.svelte`. Do *not* switch to Astro's compiled-frontmatter API — it inflates per-page chunks ~2.5×.
- The site uses xterm.js for the terminal UI
- `site-reference.md` contains comprehensive documentation about all components — consult it for detailed implementation questions. Keep it updated when making changes to the site.
- Skin system provides per-skin CSS variables including `--code-bg` and `--code-border` for inline code styling
- Skin application happens in `src/stores/skin.ts` via `applySkin()` — do not duplicate this logic in BaseLayout or elsewhere
- Global scale is set via `html { font-size }` in `global.css`; terminal font size is separate (`fontSize` in TerminalIsland.svelte xterm config)
- xterm.js cursor movement escapes (`\x1b[D`, `\x1b[C`) don't wrap across visual rows. When fixing terminal input bugs at line boundaries, handle the boundary case specifically rather than rewriting the whole function.
- xterm.js `onKey` and `onData` fire alongside each other, not as alternatives. `preventDefault()` in `onKey` only stops browser defaults; the data callback still receives the keystroke. Escape sequences (Shift+Tab `\x1b[Z`, arrows `\x1b[A/B/C/D`) reach `writeChar` as data — the `escSeq` parser there is load-bearing, not dead code.
