# Refactor Progress

Living document tracking the cleanup of `welcome to the sunny side!`.

## Goal

Reduce bloat and remove sloppiness accumulated from earlier (2025) implementations. Aim for: fewer files, less duplication, simpler state, smaller bundles, clearer config — without changing user-facing behavior.

## Plan (three stages)

1. **Deletions** — pure removals of unused files, dead code, and config noise. Lowest risk.
2. **Consolidations** — merge duplicated logic (markdown setup, content globs, skin/theme overlap), simplify a few state machines.
3. **State-machine / boundary fixes** — loading state, terminal input edge cases, mobile detection.

---

## Stage 1 — Deletions

Status: **complete** (2026-05-05) — `npm run build` clean (42 pages, 4.4s).

### Files to delete

- `src/vomit.txt` — stale 408-line tree dump, references components that no longer exist.
- `src/types/` — empty directory.
- `src/components/SpoilerBox.svelte` — never imported; content uses raw `<details>` HTML.
- `src/components/TheoremBox.svelte` — never imported; content uses raw `<div class="theorem-box">`.
- `src/content.config.ts` — defines collections; `getCollection()` is never called anywhere.
- `site-issues.md` — empty file.
- `.DS_Store` (root) — already gitignored, but the working-tree file remains.

### In-file dead code to remove

- `src/pages/[...slug].astro` — drop `slug`, `getMarkdownModule()`, `mdMod`, `isBlog`, `BlogContent`, `fm`, and the eager `import.meta.glob('../content/**/*.md', { eager: true })`. The file becomes a thin wrapper that just runs `getStaticPaths` and renders `<BaseLayout />`.
- `src/components/ContentPane.svelte` — remove unused `isFile` import (line 7).
- `src/components/TerminalIsland.svelte` — remove the dead `escSeq` ESC-sequence parser inside `writeChar` (lines 606-630); arrow keys are handled in `term.onKey`. Also remove the unused `isInitialTheme` flag (lines 774, 781).
- `src/components/MusingsStream.svelte` — remove the leftover "Removed unused decryptBlob() and scrypt-js main-thread dependency" comment (line 236).

### Config noise

- `tailwind.config.js` — drop `./site-reference.md` from `content` (it's documentation, not shipped markup).
- `package.json` — remove `@types/highlight.js` from devDependencies (highlight.js ships its own types).

### Documentation

- `site-reference.md` — fix the duplicate `## 12` headers (rename second to `## 13`, renumber subsequent sections), and remove obvious stale references (`ContentPane.astro`, etc.). Full doc rewrite is out of scope for this stage; just stop the bleeding.

### Out of scope for stage 1

- Anything that requires consolidating two callers (e.g. shared markdown setup, glob unification, skin/theme overlap, mobile detection rework, loading-state simplification). Those are stage 2/3.

### Verification per change

- After file deletions: `npm run build` succeeds; `npm run dev` boots; spot-check home, a blog post, `/void.html` (musings), a directory nav-view.
- After in-file dead-code removal: same build/boot check; manually exercise the terminal (ls, cd, open, pop, arrow keys, tab completion) and theme switching.

---

## Stage 2 — Consolidations

Substages: A = shared markdown renderer, B = frontmatter parsing, C = math escaping, D = skin/custom-elements, E = TerminalPane simplify, F = home-bg eager glob.

### A–C — complete (2026-05-05)

- Created `src/lib/markdown.ts` (~70 lines): single async `getRenderer()` singleton with C++ highlight + a small inline-rule plugin for `$...$`, `$$...$$`, `\(...\)`, `\[...\]` math protection.
- `ContentPane.svelte` — dropped `ensureRenderEnginesLoaded` body, the 115-line `protectMathSegments`, and the buggy YAML parser. Replaced with `getRenderer()` and a tiny correct `parseFrontmatter`.
- `MusingsStream.svelte` — dropped its inline markdown-it/highlight.js setup; awaits `getRenderer()` in `onMount`, template guards on `md`.
- ContentPane went from 556 → 366 lines; MusingsStream 385 → 364; new shared lib 68 lines. Net ~−140 lines.
- Considered switching to Astro's `frontmatter`/`rawContent()` API but reverted: it inflates per-md chunks ~2.5× because each module also bundles compiled HTML + a Content component we don't use. Kept `?raw` + a small custom YAML parser instead. After revert, per-md chunk sizes are roughly 1:1 with source.

### D–F — complete (2026-05-05)

- D: dropped redundant `:root { --el-accent / --el-surface / --el-text / --el-radius }` from `custom-elements.css` (skins always set them). Kept `--el-time` since neither skin overrides it. Did not move `outline-list` — it's used by 3 markdown files, not 1, so a global rule is correct.
- E: `TerminalPane.svelte` 268 → 232 lines. Merged the two `onMount` blocks. Replaced the `writable` `collapsed` store + subscribe with a plain `let isCollapsed` + `setCollapsed()` helper that also writes sessionStorage. Collapsed the duplicated `{#if isCollapsed}/{:else}` toggle buttons into one button with reactive icon/aria-label.
- F: new `tools/build-home-bg-index.mjs` walks `public/assets/home/active/<skin>/<device>/` and emits `public/home-bg-index.json`; wired into `predev`/`prebuild`. `ContentPane.svelte` now fetches the manifest the first time the home page renders, instead of using an eager `import.meta.glob` that bundled every image URL into its JS chunk. ContentPane chunk: 14.2KB → 13.1KB. Saving scales linearly with the image count.

## Stage 3 — State-machine fixes

Status: **complete** (2026-05-05) — scoped down significantly from the original proposal.

Original draft listed six items (loading-state simplification, terminal `pop` ↔ browser back, MusingsStream interval cleanup, dir-date cache simplification, mobile detection via matchMedia, terminal `deleteChar` line-wrap rewrite). On review, only one was a real bug; the rest were polish or risky-without-cause.

### What we did

- **MusingsStream interval cleanup** — `animationIntervals` are normally cleared by `stopDecryptAnimation` in `unlockPost`'s `finally`, but if the user navigates away mid-decryption the interval keeps firing. Extended `onDestroy` to clear all outstanding intervals before terminating the worker.

### What we deliberately skipped

- **Loading-state simplification.** Original proposal: drop `previousContentHtml` / `pendingTypeset` / `pendingScriptExec` / the `path`-`displayPath` split, replace with CSS opacity fade. On second look, each piece exists for a real reason — `displayPath` keeps the home background stable during nav, `previousContentHtml` prevents a blank flash during the await chain, and `pending*` flags coordinate "run side effect on visible DOM." The savings were ~30 lines for non-trivial behavioral risk. Skipped.
- **Terminal `pop` ↔ `history.back`.** Real divergence between in-memory `pop` history and browser back stack, but narrow flow and touches two files. Low priority, deferred.
- **`getDirDate` cache, mobile-detection matchMedia, terminal `deleteChar` rewrite.** Pure polish or speculative; skipped. CLAUDE.md explicitly warns against rewriting the cursor function.

### Documentation

- Rewrote `site-reference.md` (~440 → ~300 lines): trimmed historical narrative, fixed stale references (`SpoilerBox`/`TheoremBox`, `pendingTypeset` troubleshooting row, removed `ContentPane.astro` mention, etc.), promoted xterm gotchas + markdown pipeline to their own sections.
- Lightly updated `CLAUDE.md`: added the `home-bg-index.json` build step, the markdown-renderer-singleton rule, the warning against Astro's compiled-frontmatter API, and the `onKey`/`onData` dual-dispatch footgun.

---

## Change log

_Entries appended as work completes. Format: date — what changed — why._

- **2026-05-05 — Stage 1 deletions complete.**
  - Removed unused files: `src/vomit.txt`, `src/types/`, `src/components/SpoilerBox.svelte`, `src/components/TheoremBox.svelte`, `src/content.config.ts`, `site-issues.md`, `.DS_Store`.
  - `src/pages/[...slug].astro` — stripped `getMarkdownModule()` and the eager `import.meta.glob('../content/**/*.md', { eager: true })` plus its dead `mdMod`/`isBlog`/`BlogContent`/`fm` locals. Should noticeably shrink per-page chunks.
  - `src/components/ContentPane.svelte` — dropped unused `isFile` import.
  - `src/components/TerminalIsland.svelte` — removed unused `isInitialTheme` flag. Initially also removed the `escSeq` ESC parser, but reverted (kept simplified): xterm's `onKey` fires *alongside* `onData`, so escape sequences (Shift+Tab `\x1b[Z`, arrow keys `\x1b[A/B/C/D`) still reach the data callback even though we `preventDefault` in `onKey`. The parser must swallow them or they get inserted as literal text. Kept a slimmer version (no special-case for arrows; just consume any 3-char ESC sequence).
  - `src/components/MusingsStream.svelte` — dropped stale "Removed unused decryptBlob…" comment.
  - `tailwind.config.js` — removed `./site-reference.md` from content glob (docs aren't shipped markup).
  - `package.json` — removed `@types/highlight.js` (unneeded since highlight.js v10+ ships its own types).
  - `site-reference.md` — renamed second `## 12` (Games & Utilities) to `## 12b` to fix duplicate header.
  - Verified: `npm run build` clean.

- **2026-05-05 — Stage 2 A–C complete.**
  - New `src/lib/markdown.ts`: lazy singleton `getRenderer()` with C++ hljs and an inline-rule math-protection plugin replacing the 115-line `protectMathSegments`.
  - `ContentPane.svelte` — dropped duplicated markdown-it/hljs setup, dropped `protectMathSegments`, replaced buggy hand-rolled YAML parser with a tiny correct one. 556 → 366 lines.
  - `MusingsStream.svelte` — dropped inline markdown-it/hljs setup; awaits `getRenderer()` in `onMount`. 385 → 364 lines.
  - Briefly tried Astro's `mod.frontmatter`/`mod.rawContent()` API for `.md` imports — reverted because Astro bundles compiled HTML + Content component into each module, inflating per-page chunks ~2.5× (e.g. icpc.md 82KB → 209KB). Kept `?raw` glob; chunk sizes now 1:1 with source.
  - Verified: `npm run build` clean (42 pages, 2.6s).

- **2026-05-05 — Stage 2 D–F complete.**
  - D: `src/styles/custom-elements.css` — dropped four `:root` `--el-*` defaults that skins always set (kept `--el-time` since neither skin overrides it). Single source of truth for skin-driven vars.
  - E: `src/components/TerminalPane.svelte` 268 → 232 lines. Merged two `onMount` blocks; replaced `writable` `collapsed` store with plain `let isCollapsed` + `setCollapsed()` helper; collapsed duplicated toggle button into one with reactive icon and aria-label.
  - F: new `tools/build-home-bg-index.mjs` enumerates `public/assets/home/active/<skin>/<device>/` and writes `public/home-bg-index.json`. Wired into `predev`/`prebuild`. `ContentPane.svelte` now fetches the manifest on first home view instead of bundling every URL via eager `import.meta.glob`. ContentPane chunk shrank 14.2KB → 13.1KB; the saving grows with the number of background images.
  - Verified: `npm run build` clean (42 pages, 3.0s).

- **2026-05-05 — Stage 3 + doc rewrite complete.**
  - `MusingsStream.svelte` `onDestroy` now clears all outstanding `animationIntervals` before terminating the worker. Fixes a leak where `setInterval`s started by `startDecryptAnimation` would survive component unmount if the user navigated away from `/void.html` mid-decryption.
  - Rewrote `site-reference.md` (~440 → ~300 lines). Fixed stale references, dropped historical narrative, added markdown-pipeline and xterm-gotchas sections.
  - Updated `CLAUDE.md` with `home-bg-index.json` step, markdown-singleton rule, Astro-compiled-frontmatter warning, and `onKey`/`onData` dual-dispatch note. Removed reference to `site-issues.md` (deleted in Stage 1).
  - Verified: `npm run build` clean (42 pages, 11.8s).
