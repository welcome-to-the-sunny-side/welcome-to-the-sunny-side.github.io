# Welcome to the Sunny Side – Site Reference

_Last updated: 2025-09-11_ (Terminal UX improvements: fixed 'open' command getting stuck on current page, dynamic terminal width (30% of window), responsive resizing; prior: Navigation UX improvements: fixed duplicate loading indicators, eliminated 404 flash during page transitions, deferred MathJax typesetting until content is visible, improved terminal spinner behavior; prior: Terminal UI overhaul: modern retrocomputing design, Shift+Tab suggestion cycling, left/right cursor movement, skin-dependent scrollbars, single border)

## 1 . High-level Overview
The site is a **static, terminal-driven blog & knowledge base** built with **Astro** for static generation and **Svelte** for the interactive UI. Styling is primarily handled by **Tailwind CSS** (integrated via `@astrojs/tailwind`), utilizing its utility classes and the `@tailwindcss/typography` plugin for Markdown rendering. All human-readable content lives in Markdown files under `src/content` and is presented at URLs that end in `.html`. Additionally, the site now supports rendering of HTML files, allowing for more diverse content presentation. A new Games section has also been added, providing a dedicated space for browser-game adjacent pages.

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
├─ src/styles/
│  └─ global.css            Tailwind directives, highlight.js theme import
├─ tailwind.config.js       Tailwind CSS configuration
├─ tools/
│  └─ build-vfs-date-index.mjs   build-time date indexer for terminal sorting
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
2. **Runtime (server-side render / pre-render):** `[...slug].astro` always renders `<BaseLayout>`, which includes both `ContentPane` and `TerminalPane`. `ContentPane.svelte` checks the markdown’s front-matter. It applies a `.prose` class (from Tailwind Typography) for general Markdown styling, and if `layout: blog` is present, it adds further blog-specific styling.
3. **Client side:** The embedded Svelte app controls navigation so the page never reloads after the first hit.

---

## 5 . Terminal Commands
| Command        | Description                                               |
|---------------|-----------------------------------------------------------|
| `ls`           | List items (tree **-r**). Extra flags: **-d / -dl / -de** for date sort, **-v** to show dates |
| `cd <dir>`     | Change directory (relative or absolute)                  |
| `open <file>`  | Push file path to router and render it                   |
| `pop`          | Return to previous path                                  |
| `clear`        | Clear the terminal output                                |
| `help`         | Show built-in command help (now formatted, colorized)    |

### Keyboard Shortcuts & UX Enhancements
| Shortcut | Purpose |
|----------|---------|
| `Tab` | Accept the current autocomplete suggestion |
| `Shift + Tab` | Cycle through autocomplete suggestions |
| `← / →` | Move cursor left/right within input line |
| `Shift + ←` | Collapse the terminal pane (desktop) |
| `Shift + →` | Expand / focus the terminal pane (desktop) |
| `Shift + ↑` | Focus on the content pane |
| `h / j / k / l` | Scroll content pane when terminal is not focused |

The terminal keeps history, shows inline autocomplete suggestions while you type, and supports full cursor movement within the input line. Suggestions cycle with **Shift + Tab**. On desktop widths you can collapse/expand it with **Shift + ← / Shift + →**.

### Terminal Navigation Changes (2025-09)
- **Suggestion cycling**: Changed from left/right arrows to **Shift + Tab** only
- **Cursor movement**: Left/right arrows now move cursor freely within input line
- **Text editing**: Full cursor position tracking with insertion/deletion at any position
- **Selection**: Fixed alignment issues - no phantom selections on click, proper text alignment

### Terminal UI Design (2025-09)
- **Modern retrocomputing aesthetic**: Dark gradient backgrounds with teal accent theme
- **Typography**: IBM Plex Mono, 14px, enhanced letter spacing
- **Visual elements**: Rounded corners (8px), sophisticated multi-layer box shadows, glowing focus states
- **Prompt path and `/`**: Teal (`#64ffda`)
- **Files**: Yellow (`#ffd43b`)
- **Directories**: Light gray (`#e0e0e0`)
- **Cursor**: Teal (`#64ffda`), non-blinking
- **Borders**: Single teal border with focus glow, no double-border effect
- **Scrollbars**: Modern gradient styling matching current skin theme
- **Selection**: Clean teal highlight without borders for proper text alignment


---

## 6 . Adding Content
1. Create a Markdown file anywhere under `src/content`.
2. Use front-matter:
   ```yaml
   ---
   title: My Post
   date: 2025-06-14
   tags: [astro, svelte]
   displayMode: blog        # optional – enables blog styling in ContentPane
   backgroundImagePC: /path/to/desktop-image.jpg  # optional – for home page full background (desktop)
   backgroundImageMobile: /path/to/mobile-image.jpg # optional – for home page full background (mobile)
   # For custom elements like spoilers or theorem boxes, use specific HTML structures:
   # <details><summary class="spoiler-summary">Title</summary><div class="spoiler-content">Content...</div></details>
   # <div class="theorem-box">Content...</div>
   # These are styled by src/styles/custom-elements.css
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
| Markdown content (headings, lists) unstyled | Ensure `tailwind.config.js` includes `@tailwindcss/typography` plugin and `content` paths are correct. Verify `src/styles/global.css` has `@tailwind base/components/utilities` directives. Check `ContentPane.svelte` applies `.prose` class to the content wrapper. |
| Inline math with underscores appears italic (e.g., `$a(t)_{i} = b(t)_{i}$`) | Markdown runs before MathJax and treats `_` as emphasis. `ContentPane.svelte` protects TeX segments via a small placeholder preprocessor so underscores inside `$...$`, `\(...\)`, and `\[...\]` are not styled as italics. If authoring raw `.html`, keep TeX outside Markdown or escape underscores as `\_`. |
| Horizontal page scroll on mobile when long math overflows | Use MathJax v4 with line breaking and clamp containers. MathJax is now loaded on-demand from `ContentPane.svelte` (first non-home page) with `output: { displayOverflow: 'linebreak', linebreaks: { inline: true, width: '100%' } }`. In `src/styles/global.css`: keep `body { overflow-x: hidden; }`, `mjx-container { max-width: 100%; }`, and optionally `mjx-container[display="true"] { overflow-x: auto; }`. The main content `<main>` uses `overflow-y-auto overflow-x-hidden` to avoid page wobble. |
| Raw TeX ($$...$$) shows briefly during navigation | MathJax typesetting was running on hidden content during page transitions. `ContentPane.svelte` now defers MathJax typesetting using a `pendingTypeset` flag until the new content is actually visible in the DOM (after `isLoading` completes and `displayPath` updates). |
| Duplicate "Loading..." lines in terminal during navigation | Fixed by making the loading spinner render in-place on the current prompt line using `\r\x1b[2K` (carriage return + clear line) instead of creating new lines. The spinner updates on the same line and clears properly on completion. |
| Multiple empty prompts after navigation commands | Terminal `exec()` function now returns a boolean indicating navigation occurred. When navigation is triggered (`open`, `pop`), the immediate prompt is suppressed and the loading spinner subscription handles printing the success message and new prompt after completion. |
| Terminal gets stuck when using `open` on current page | Fixed by checking if the requested file path matches the current path. If they match, the terminal shows "Already viewing: [filename]" instead of attempting navigation. This prevents the terminal from getting stuck in a loading state when trying to navigate to the current page. |
| Terminal width is fixed and doesn't adapt to window size | Terminal now dynamically resizes to 30% of window width on desktop (with min/max bounds of 320px-600px). The `terminalWidth` variable is updated on window resize and applied via inline style. Terminal content automatically reflows to fit the new dimensions. |
| Initial load downloads a very large `ContentPane.*.js` | Likely because `MusingsStream.svelte` was statically imported by `ContentPane.svelte`, which bundled heavy deps (full `highlight.js`, `scrypt-js`) into the first paint. Fix: lazy-load Musings with a dynamic import in `ContentPane.svelte` and render via `<svelte:component>`. Also ensure `MusingsStream.svelte` uses `highlight.js/lib/core` with only C++ registered, and that `scrypt-js` is only referenced inside the web worker (`src/lib/musingsWorker.ts`), not on the main thread. |

---

## 9 . Theme & Styling Overhaul (Retro Dark Minimal)
_Updated: 2025-06-14_

The site underwent a significant visual overhaul to implement a retro-dark, minimalistic theme with smaller fonts and smooth transitions.

**Key Changes & Files:**

*   **Overall Aesthetic:**
    *   **Theme:** Retro, dark, minimalistic.
    *   **Primary Font:** IBM Plex Mono (imported in `global.css`).
    *   **Base Font Size:** 14px for UI elements, 0.9rem (approx 14.4px) for Markdown prose content.
    *   **Transitions:** Smooth, custom cubic-bezier for UI interactions.

*   **`tailwind.config.js`:**
    *   `darkMode: 'class'` (the `dark` class is applied to the `<html>` element in `BaseLayout.astro`).
    *   **Custom Color Palette:**
        *   `bg`: charcoal (`#0d0d0d`)
        *   `surface`: slightly lighter charcoal (`#1a1a1a` for panels/cards, `#161616` for custom element surfaces)
        *   `accent`: neon teal (`#64ffda`)
        *   `accent-subtle`: muted teal (`#264d48`)
        *   `warning`: warm orange (`#ffb454`)
        *   `text`: light gray (`#e0e0e0`)
        *   `text-muted`: muted gray (`#9e9e9e`)
    *   **Font Sizes:** `fontSize` scale updated. `text-base` is 14px. Markdown content (`.prose`) defaults to `0.9rem` via typography plugin configuration.
    *   **Typography Plugin (`@tailwindcss/typography`):** Configured to set the base `DEFAULT` prose font size to `0.9rem`.

*   **`src/styles/global.css`:**
    *   Imports IBM Plex Mono.
    *   Applies global `body` styles: theme background, text color, and `font-mono`.
    *   Custom `::selection` styles using theme colors.
    *   Contains essential Tailwind directives: `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`.

*   **`src/styles/custom-elements.css`:**
    *   Uses CSS variables (e.g., `--el-accent`, `--el-surface`, `--el-text`) for consistent theming of custom Markdown elements.
    *   **Spoiler:** Styled with a custom caret. Content has a transparent background and a `var(--el-text)` border. **Now supports horizontal scrolling for long lines (e.g., LaTeX) inside the box.**
    *   **Theorem Box:** Styled with a transparent background and a `var(--el-text)` border. **Now supports horizontal scrolling for long lines (e.g., LaTeX) inside the box.**

*   **`src/layouts/BaseLayout.astro`:**
    *   Applies `dark` class to `<html>` tag.
    *   Sets theme background and text colors on the main content container.

*   **`src/components/TerminalPane.svelte`:**
    *   The main wrapper `div` has a conditional `border-b border-zinc-700` applied when in mobile view (`isMobile`) and the terminal is not collapsed (`!isCollapsed`).

*   **`src/components/ContentPane.svelte`:**
    *   Blog post titles, dates, and tags styled with theme colors and smaller font sizes.
    *   Markdown content uses `prose prose-invert`.
    *   Can now render conditional full-page background images on the home page (via `backgroundImagePC` and `backgroundImageMobile` frontmatter in `home.md`), adapting to desktop/mobile views.

This overhaul ensures a consistent visual identity across the site, aligning with the desired retro-dark aesthetic.

---

### Search (2025-09-10)
The previous Fuse.js-backed `grep` command has been removed to avoid bundling the entire Markdown corpus on first load. Use `ls -r` to explore and open files, or your browser's built-in find on a page.

---

## 10. Extending the Site
* **Custom commands:** add to `TerminalIsland.svelte`.
* **Styling:** Primarily use **Tailwind CSS utility classes** directly in your Svelte/Astro components. `src/styles/global.css` is used for Tailwind's base directives (`@tailwind base;`, etc.), importing external CSS (like `highlight.js` themes), and minimal global styles if absolutely necessary.
* **Custom Elements in Markdown:** For elements like spoilers or theorem boxes, use specific HTML structures that are styled by `src/styles/custom-elements.css`. For example:
  * **Spoiler:** `<details><summary class="spoiler-summary">Spoiler Title</summary><div class="spoiler-content">Hidden content...</div></details>`
    *Long lines (e.g., LaTeX) will not overflow but instead allow horizontal scrolling inside the spoiler box.*
  * **Theorem Box:** `<div class="theorem-box">Theorem content...</div>`
    *Long lines (e.g., LaTeX) will not overflow but instead allow horizontal scrolling inside the theorem box.*
  For other types of reusable UI, Astro's standard Svelte component integration in Markdown (via frontmatter imports) can be used if you adapt the content rendering pipeline away from the custom `ContentPane.svelte` raw Markdown processing.
* **Date Index for Terminal:** The terminal uses a tiny prebuilt index (`public/vfs-date-index.json`) to power `ls -d / -dl / -de` date sorting and `-v` verbose date labels. This index is generated by `tools/build-vfs-date-index.mjs` and removes the need to load all Markdown on the client.

## 11 . Dynamic Skins (Dark & Sunny)
Introduced a **skin system** that allows live switching between completely different theme tokens at runtime.

### Key pieces
* **`src/skins/types.ts`** – `Skin` interface (`name`, `classes`, `cssVars`, `inlineStyles`).
* **`src/skins/dark.ts`** – default retro-dark palette, now called _dark_.
* **`src/skins/sunny.ts`** – new warm light academic palette.
* **`src/stores/skin.ts`** – Svelte store now centralises DOM side-effects: applying classes to `<html>/<body>` and writing all `--css-vars` on every change (and on first load via `localStorage`).
* **Commands** in `TerminalIsland.svelte`:
  * `skins` – list available skins in a tree view (`├─`/`└─`).
  * `skin <name>` – activate a skin (no page reload needed).
* **Tailwind** refactor – all colour, typography, spacing, radius, easing tokens in `tailwind.config.js` reference CSS variables, so skins can override every visual token.
* **ContentPane** binds classes reactively to `$currentSkin.classes.contentPane`, so prose enters or leaves `prose-invert` automatically.

### Usage
```
> skins          # lists dark sunny
> skin sunny     # instant switch to light mode
> skin dark     # back to retro dark
```
Selection persists between sessions (key `wtss-skin` in localStorage).

---

## 12 . HTML Content Support
Historically, **all authored content lived in Markdown** and was compiled into `.html` at build-time. The router and terminal now fully understand *native* `.html` files in `src/content`:

* Any `.html` file under `src/content` is mapped 1-to-1 in the VFS (no markdown processing). If it includes `<meta name="wtss:date" content="YYYY-MM-DD">` in its `<head>`, that date is used by `ls -d/-v` just like markdown front-matter.
* Terminal commands (`ls`, `open`) treat `.html` the same as generated pages.
* This enables hand-crafted mini-apps or embedded widgets without a Markdown wrapper – see the new **Games** section below.

## 12 . Games (`/content/games`)
A lightweight playground for interactive HTML pages that live alongside blog posts.

| Game | Path | Tech | Notes |
|------|------|------|-------|
| **Zetamac Arithmetic Sprint** | `/games/zetamac.html` | Vanilla JS + Tailwind + Chart.js | Timed arithmetic quiz with detailed performance graphs, high-score tracking, keyboard shortcuts. |

Games load inside the same Svelte `ContentPane` via the catch-all route, inheriting the dark retro theme automatically.

---

## 13. Musings Feature (Encrypted Personal Posts)
_Added: 2025-08-25_

The site includes a **Musings** feature for encrypted personal posts that can be selectively unlocked with a master passphrase.

### Architecture
* **Sources**: Gitignored `misc_assets/musings_src/` directory containing:
  - Individual `.md` files for each post
  - `key.txt` file with the master passphrase
* **Build Output**: `public/musings/` directory with:
  - `manifest.json` listing all posts with metadata
  - `data/` subdirectory containing encrypted JSON blobs for private posts
* **Python CLI**: `tools/musings/main.py` processes source files and generates encrypted blobs

### Encryption Details
* **Algorithm**: scrypt(N=32768, r=8, p=1) for key derivation → AES-256-GCM for encryption
* **Per-post security**: Each post has unique salt + IV, with AAD `musings:<id>:v1`
* **Single passphrase**: One master passphrase encrypts all private posts
* **Client-side only**: Passphrase kept in memory, never persisted

### UI Features (2025-08-25 Refinements)
* **Minimalist design**: No post titles displayed (removed from both frontend and backend)
* **Global passphrase input**: Single input at top of page for all encrypted posts
* **Inline decrypt buttons**: Located next to timestamps, with animated letter permutation during decryption
* **Consistent spacing**: Encrypted and decrypted post bodies have matching padding and font sizes
* **Web Worker decryption**: Heavy cryptographic operations run off the main thread to keep UI responsive
* **Ciphertext preview**: Shows first 160 characters of encrypted content when locked

### Usage
1. Navigate to `/void.html` to access the Musings page
2. Enter the master passphrase in the global input field
3. Click "decrypt" next to any encrypted post to unlock it
4. The decrypt button animates (letter scrambling) while processing
5. Decrypted content renders with consistent styling

### Technical Implementation
* **Frontend**: `src/components/MusingsStream.svelte` handles UI and decryption
* **Worker**: `src/lib/musingsWorker.ts` performs scrypt + AES-GCM operations
* **Build tool**: `tools/musings/main.py` encrypts posts and generates manifest
* **Frontmatter**: Posts support `id`, `date`, `privacy` (public/master), `pinned` fields

### Performance Optimizations (Lazy Loading)
_Added: 2025-08-25_

The Musings component implements **lazy loading** to improve initial page load performance:

* **Incremental pagination**: Only renders first 12 posts initially (`PAGE_SIZE=12`)
* **Visibility-based fetching**: Uses `IntersectionObserver` to load post blobs only when items enter viewport
* **Infinite scroll**: Bottom sentinel automatically loads more posts as user scrolls
* **Prefetch strategy**: 
  - Public posts: fetch blob and render markdown when visible
  - Private posts: fetch blob for ciphertext preview when visible
* **Network optimization**: Eliminates eager loading of all posts on mount
* **Two-tier observer system**:
  - `visibleOnce()`: triggers once per post for blob loading
  - `infiniteSentinel()`: re-triggers for pagination as user scrolls

This reduces initial network requests from (1 manifest + N blobs) to just the manifest, with subsequent requests triggered by scroll position. Performance improvement is most noticeable with large post archives.

---

## 14 . Bundle Size & Code-Splitting (2025-09-17)

Large initial `ContentPane.*.js` chunks were traced to the Musings feature being statically imported by `ContentPane.svelte`, which pulled heavy libraries into the first paint.

What changed:

* **Lazy-load Musings component**
  * `ContentPane.svelte` now loads `./MusingsStream.svelte` on demand using a dynamic import inside `ensureMusingsLoaded()` and renders it with `<svelte:component this={MusingsStreamComponent} />` only when `displayMode: musings`.
* **Trim Highlight.js in Musings**
  * Switched to `highlight.js/lib/core` and registered only the C++ language (aliases supported: `cpp`, `c++`, `cc`, `cxx`, `hpp`, `hxx`).
  * Non-C++ code blocks are safely escaped (no generic auto-detect to avoid bundling languages).
* **Keep scrypt on the worker only**
  * Removed the main-thread `scrypt-js` import from `src/components/MusingsStream.svelte`.
  * Decryption continues exclusively in `src/lib/musingsWorker.ts` (scrypt → AES-256-GCM) to keep UI responsive and the main bundle small.

Outcome:

* Initial `ContentPane.*.js` size is significantly smaller on first visit (home/blog pages).
* Musings code loads as a separate async chunk only when visiting pages with `displayMode: musings` (e.g., `/void.html`).

Enjoy hacking on _Welcome to the Sunny Side_!
