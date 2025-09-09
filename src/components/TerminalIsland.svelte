<script lang="ts">
import { onMount } from 'svelte';
import { currentPath } from '../stores/router';
import { list, isFile, isDir, resolvePath } from '../lib/virtualFs';
import { listSkins, wearSkin } from '../stores/skin';

const PATH_RGB = '100;255;218'; // old green for prompt path and '/'
const PATH_COLOR = `\x1b[38;2;${PATH_RGB}m`;
const FILE_RGB = '255;230;120'; // yellowish highlight for files
const FILE_COLOR = `\x1b[38;2;${FILE_RGB}m`;
const DIR_COLOR = '\x1b[37m'; // plain white for directories
import 'xterm/css/xterm.css';

let container: HTMLDivElement;
// reactive focus state for border highlight
let isFocused = true;
// Expose terminal instance for external focus control
let termInstance: any;
let fitAddon: any; // store FitAddon instance for external resizing

export function focusTerminal() {
  termInstance?.focus();
}

// Re-fit terminal when its container size increases (e.g., after mobile expand)
export function resizeTerminal() {
  fitAddon?.fit();
}

// --- On-demand content loaders (avoid bundling raw corpus on first load) ---
const RAW_MD = import.meta.glob('/src/content/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

// Build-time date index loaded at runtime: maps '/path.html' -> timestamp (ms) or null
let dateIndex: Record<string, number | null> = {};

// (legacy) retained for disabled branch; no longer used for live paths
function extractDate(_raw: string | null): number { return Infinity; }

// --- Date helpers ---
// Map an HTML virtual path (e.g. "/algo/blogs/foo.html") to its timestamp using the date index.
function dateForHtml(htmlPath: string): number {
  const v = dateIndex[htmlPath];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return Infinity;
}

// Cache directory min / max dates to avoid recomputation during a single ls.
type CacheRec = { min?: number; max?: number };
const dirDateCache: Record<string, CacheRec> = {};

// Recursively obtain the minimum / maximum date of any markdown file in a directory subtree.
function getDirDate(dirPath: string, wantMax: boolean): number {
  const cached = dirDateCache[dirPath];
  if (cached && (wantMax ? cached.max !== undefined : cached.min !== undefined)) {
    // Always return a number, never undefined
    if (wantMax) return typeof cached.max === 'number' ? cached.max : -Infinity;
    return typeof cached.min === 'number' ? cached.min : Infinity;
  }
  let best = wantMax ? -Infinity : Infinity;
  const children = list(dirPath) || [];
  for (const name of children) {
    const child = dirPath === '/' ? '/' + name : `${dirPath}/${name}`;
    let ts: number;
    if (isDir(child)) {
      ts = getDirDate(child, wantMax);
    } else if (child.endsWith('.html')) {
      ts = dateForHtml(child);
    } else {
      ts = wantMax ? -Infinity : Infinity;
    }
    best = wantMax ? Math.max(best, ts) : Math.min(best, ts);
  }
  if (!dirDateCache[dirPath]) dirDateCache[dirPath] = {};
  if (wantMax) dirDateCache[dirPath].max = best; else dirDateCache[dirPath].min = best;
  return best;
}

// Sort names inside a directory according to date ordering, keeping lexicographic tiebreak.
function sortNamesByDate(dirPath: string, names: string[], mode: 'asc' | 'desc'): string[] {
  const wantMax = mode === 'desc'; // newest first uses max date key
  return [...names].sort((a, b) => {
    const pathA = dirPath === '/' ? '/' + a : `${dirPath}/${a}`;
    const pathB = dirPath === '/' ? '/' + b : `${dirPath}/${b}`;
    let ta = isDir(pathA) ? getDirDate(pathA, wantMax) : dateForHtml(pathA);
    let tb = isDir(pathB) ? getDirDate(pathB, wantMax) : dateForHtml(pathB);
    // When date is missing use -Infinity for desc (-d/-dl) or +Infinity for asc (-de)
    if (!Number.isFinite(ta)) ta = wantMax ? -Infinity : Infinity;
    if (!Number.isFinite(tb)) tb = wantMax ? -Infinity : Infinity;
    const diff = wantMax ? tb - ta : ta - tb;
    return diff === 0 ? a.localeCompare(b) : diff;
  });
}

async function getRawMd(virtualPath: string): Promise<string | null> {
  // "/posts/foo.html" -> "/src/content/posts/foo.md"
  const rel = virtualPath.replace(/^\//, '').replace(/\.html$/, '.md');
  const loader = RAW_MD['/src/content/' + rel];
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

let FuseLib: any;

onMount(async () => {
  isFocused = true; // Ensure border is active on mount
  // Preload date index (non-blocking)
  fetch('/terminal-index.json')
    .then(r => (r.ok ? r.json() : {}))
    .then((idx) => { dateIndex = idx || {}; })
    .catch(() => { dateIndex = {}; });
  const { Terminal } = await import('xterm');
  const { FitAddon } = await import('@xterm/addon-fit');
  const term = new Terminal({
    theme: {
      background: '#0f0f0f',
      foreground: '#d0d0d0',
      cursor: 'rgb(100,255,218)'
    },
    // cursorBlink: true,
    fontFamily: 'IBM Plex Mono, Menlo, monospace',
    fontSize: 13,
    letterSpacing: 0.25,
    cols: 80,
    rows: 24,
    convertEol: true,
  });
  const fit = new FitAddon();
  fitAddon = fit;
  term.loadAddon(fit);
  term.open(container);
  termInstance = term;
  fit.fit();
  term.focus();

  function setFocusStyle(focused: boolean) {
    isFocused = focused;
  }
  term.textarea?.addEventListener('focus', () => setFocusStyle(true));
  term.textarea?.addEventListener('blur', () => setFocusStyle(false));

  let cwd: string[] = [];
  let history: string[] = ['/'];
  // In-terminal command history (↑ / ↓)
  let cmdHistory: string[] = [];
  // Index into cmdHistory. 0 .. length-1 = stored commands, length = current typing
  let histIndex = 0;
  let savedBuffer = '';
  let buffer = '';
  // --- Autocomplete state ---
  const COMMANDS = ['ls', 'cd', 'open', 'pop', 'clear', 'help', 'grep', 'skin', 'skins'];
  let completions: string[] = [];
  let compIndex = 0;
  let ghostActive = false;
  let ghostText = '';

  const prompt = () => {
    const path = '/' + cwd.join('/');
    term.write(`${PATH_COLOR}${path}\x1b[0m $ `);
  };

  async function exec(command: string) {
    if (!command) return;
    const [cmd, ...args] = command.split(/\s+/);
    switch (cmd) {
      case 'ls': {
                // Detect recursive flag (-R or -r)
        const flags = args.filter(a => a.startsWith('-'));
        const recursive = flags.includes('-R') || flags.includes('-r');
        const verbose = flags.includes('-v');
        const targetArg = args.find(a => !a.startsWith('-')) || '.';

        const pathArr = resolvePath(cwd, targetArg);
        if (!pathArr) {
          term.writeln(`ls: cannot access '${targetArg}': No such file or directory`);
          break;
        }
        const fullPath = '/' + pathArr.join('/');
        if (isFile(fullPath)) {
          const color = '\x1b[37m';
          term.writeln(`${(isDir(fullPath)?DIR_COLOR:FILE_COLOR)}${targetArg}\x1b[0m`);
          break;
        }

        const dateDesc = flags.includes('-d') || flags.includes('-dl');
        const dateAsc = flags.includes('-de');
        const dateMode: 'asc' | 'desc' | null = dateDesc ? 'desc' : (dateAsc ? 'asc' : null);

        if (!recursive) {
          let children = list(fullPath) || [];
          if (dateMode) {
            children = sortNamesByDate(fullPath, children, dateMode);
          }
          children.forEach((name, idx) => {
            const isLast = idx === children.length - 1;
            const branch = isLast ? '└─ ' : '├─ ';
            const pathChild = `${fullPath}/${name}`;
            const dir = isDir(pathChild);
            const col = dir ? DIR_COLOR : FILE_COLOR;
            let dateLabel = '';
            if (verbose && !dir) {
              const ts = dateForHtml(pathChild.replace(/\.md$/, '.html'));
              if (Number.isFinite(ts)) {
                const d = new Date(ts).toISOString().slice(0,10);
                dateLabel = `\x1b[2m[${d}]\x1b[0m `;
              }
            }
            term.writeln(`${branch}${dateLabel}${col}${name}\x1b[0m`);
          });
        } else {
          // Recursive tree view
          if (false /* legacy dateFlag branch disabled */) {
            // Flatten gather paths
            const items: { path: string; isDir: boolean; ts: number }[] = [];
            const collect = (p: string) => {
              if (isDir(p)) {
                items.push({ path: p, isDir: true, ts: Infinity });
                const cs = list(p) || [];
                cs.forEach(c => collect(p === '/' ? '/' + c : `${p}/${c}`));
              } else {
                // Legacy branch disabled: avoid referencing removed RAW_FILES; default to Infinity
                items.push({ path: p, isDir: false, ts: Infinity });
              }
            };
            collect(fullPath);
            const dirs = items.filter(i => i.isDir && i.path !== fullPath).sort((a,b)=>a.path.localeCompare(b.path));
            const files = items.filter(i => !i.isDir);
            const mdSorted = files.filter(f => f.ts !== Infinity).sort((a,b)=>a.ts - b.ts);
            const rest = files.filter(f => f.ts === Infinity).sort((a,b)=>a.path.localeCompare(b.path));
            const ordered = [...dirs, ...mdSorted, ...rest];
            ordered.forEach(i => {
              const col = i.isDir ? DIR_COLOR : FILE_COLOR;
              const rel = i.path.slice(fullPath.length + (fullPath.endsWith('/')?0:1));
              term.writeln(`${col}${rel}\x1b[0m`);
            });
          } else {
          const lines: string[] = [];
          const buildLines = (seg: string[], prefix = '') => {
            let dirPathCur = '/' + seg.join('/');
            let children = list(dirPathCur) || [];
            if (dateMode) {
              children = sortNamesByDate(dirPathCur, children, dateMode);
            }
            children.forEach((name, idx) => {
              const isLast = idx === children.length - 1;
              const branch = isLast ? '└─ ' : '├─ ';
              const childSegs = [...seg, name];
              const childFull = '/' + childSegs.join('/');
              const dir = isDir(childFull);
              const color = dir ? DIR_COLOR : FILE_COLOR;
              let dateLabel = '';
              if (verbose && !dir) {
                const ts = dateForHtml(childFull);
                if (Number.isFinite(ts)) {
                  const d = new Date(ts).toISOString().slice(0,10);
                  dateLabel = `\x1b[2m[${d}]\x1b[0m `;
                }
              }
              lines.push(`${prefix}${branch}${dateLabel}${color}${name}\x1b[0m`);
              if (dir) {
                const newPrefix = prefix + (isLast ? '   ' : '│  ');
                buildLines(childSegs, newPrefix);
              }
            });
          };
          buildLines(pathArr);
          for (const l of lines) term.writeln(l);
          }
        }
        break;
      }
      case 'cd': {
        const target = args[0] || '/';
        const resolved = resolvePath(cwd, target);
        if (!resolved) {
          term.writeln(`cd: no such directory: ${target}`);
          break;
        }
        const dirPath = '/' + resolved.join('/');
        if (!isDir(dirPath)) {
          term.writeln(`cd: not a directory: ${target}`);
          break;
        }
        cwd = resolved;
        break;
      }
      case 'open': {
        const file = args[0];
        if (!file) {
          term.writeln('open: missing file');
          break;
        }
        const pathArr = resolvePath(cwd, file);
        if (pathArr && isFile('/' + pathArr.join('/'))) {
          const fullPath = '/' + pathArr.join('/');
          history.push(fullPath);
          currentPath.push(fullPath);
        } else {
          term.writeln(`open: file not found: ${file}`);
        }
        break;
      }
      case 'pop': {
        if (history.length > 1) {
          history.pop();
          const last = history[history.length - 1];
          currentPath.push(last);
        } else {
          term.writeln('pop: history empty');
        }
        break;
      }
      case 'clear':
        term.clear();
        break;
      case 'skins': {
        const names = listSkins();
        names.forEach((name, idx) => {
          const branch = idx === names.length - 1 ? '└─ ' : '├─ ';
          term.writeln(branch + name);
        });
        break;
      }
      case 'skin': {
        const name = args[0];
        if (!name) {
          term.writeln('Usage: skin <name>');
        } else {
          try {
            wearSkin(name);
            term.writeln(`Now wearing ${name}`);
          } catch (e) {
            term.writeln(String(e));
          }
        }
        break;
      }
      case 'grep': {
        if (!args.length) {
          term.writeln('grep: usage: grep <pattern> [path]');
          break;
        }
        // Support multi-word pattern and optional path
        let pathArg: string | null = null;
        if (args.length > 1) {
          const maybePath = args[args.length - 1];
          const test = resolvePath(cwd, maybePath);
          if (test) {
            pathArg = maybePath;
            args.pop();
          }
        }
        const pattern = args.join(' ').replace(/^"|"$/g, ''); // strip surrounding quotes if any
        const target = pathArg ?? '.';
        const resolved = resolvePath(cwd, target);
        if (!resolved) {
          term.writeln(`grep: ${target}: No such file or directory`);
          break;
        }
        const searchRoot = '/' + resolved.join('/');
        const files: string[] = [];
        const collect = (p: string) => {
          if (isFile(p) && p.endsWith('.html')) {
            files.push(p);
            return;
          }
          if (isDir(p)) {
            const children = list(p) || [];
            children.forEach(c => {
              const next = p === '/' ? '/' + c : `${p}/${c}`; // avoid double // at root
              collect(next);
            });
          }
        };
        collect(searchRoot);
        // Build search corpus
        const records: { line: string; file: string; lineNum: number }[] = [];
        for (const file of files) {
          const raw = await getRawMd(file);
          if (!raw) continue;
          raw.split('\n').forEach((line, idx) => {
            records.push({ line, file, lineNum: idx + 1 });
          });
        }
        // Instantiate Fuse on-demand
        if (!FuseLib) {
          const { default: Fuse } = await import('fuse.js');
          FuseLib = Fuse;
        }
        const fuse = new FuseLib(records, {
          keys: ['line'],
          threshold: 0.4, // adjust to tweak fuzziness
          ignoreLocation: true,
          includeScore: false,
        });
        const results = fuse.search(pattern).slice(0, 100);
        if (!results.length) {
          term.writeln('grep: no matches');
        } else {
          results.forEach((r: any) => {
            const { file, lineNum, line } = r.item;
            term.writeln(`${FILE_COLOR}${file}\x1b[0m:${lineNum}:${line.trim()}`);
          });
          term.writeln(`${results.length} match${results.length === 1 ? '' : 'es'}`);
        }
        break;
      }
      case 'help': {
        // Color and align command list
        const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n-s.length));
        const entries = [
          { cmd: 'ls [-r] [-d|-dl|-de] [-v] [path]', desc: 'list directory (tree with -r, date sort, verbose dates)' },
          { cmd: 'cd <dir>', desc: 'change directory' },
          { cmd: 'open <file>', desc: 'open file in content pane' },
          { cmd: 'grep <pattern> [path]', desc: 'fuzzy search markdown files' },
          { cmd: 'skins', desc: 'list available skins' },
          { cmd: 'skin <name>', desc: 'wear skin' },
          { cmd: 'pop', desc: 'go back' },
          { cmd: 'clear', desc: 'clear terminal' },
          { cmd: 'help', desc: '-' },
        ];
        term.writeln(`${PATH_COLOR}COMMAND         DESCRIPTION\x1b[0m`);
        for (const {cmd, desc} of entries) {
          term.writeln(`${FILE_COLOR}${pad(cmd, 14)}\x1b[0m  ${desc}`);
        }
        // Extra blank line before shortcuts
        term.writeln('');
        term.writeln(`${PATH_COLOR}SHORTCUT        DESCRIPTION\x1b[0m`);
        const sc = [
          { key: 'Tab', desc: 'accept autocomplete' },
          { key: '← / →', desc: 'cycle suggestions' },
          { key: 'Shift+→', desc: 'collapse terminal' },
          { key: 'Shift+←', desc: 'expand / focus terminal' },
          { key: 'Shift+↑', desc: 'focus content pane' },
          { key: 'h/j/k/l', desc: 'scroll content pane (when terminal unfocused)' },
        ];
        for (const {key, desc} of sc) {
          term.writeln(`${FILE_COLOR}${pad(key, 14)}\x1b[0m  ${desc}`);
        }
        break;
      }
      default:
        term.writeln(`unknown command: ${cmd}`);
        term.write('\r');
    }
  }

  // Helper to clear ghost suggestion (erase to end of line)
  function clearGhost() {
    if (!ghostActive) return;
    term.write('\x1b[s');        // save cursor
    term.write('\x1b[K');        // erase to end of line
    term.write('\x1b[u');        // restore cursor
    ghostActive = false;
    ghostText = '';
  }

  function showGhost(text: string) {
    clearGhost();
    if (!text) return;
    term.write('\x1b[s');
    term.write(`\x1b[90m${text}\x1b[0m`); // dim grey text
    term.write('\x1b[u');
    ghostActive = true;
    ghostText = text;
  }

  function buildCommandCompletions(prefix: string): string[] {
    return COMMANDS.filter(c => c.startsWith(prefix));
  }

  function buildPathCompletions(prefix: string): string[] {
    // Split prefix into dir part + base part
    const lastSlash = prefix.lastIndexOf('/');
    const dirInput = lastSlash === -1 ? '' : prefix.slice(0, lastSlash + 1); // keep trailing '/'
    const basePart = lastSlash === -1 ? prefix : prefix.slice(lastSlash + 1);
    const dirResolved = resolvePath(cwd, dirInput || '.');
    if (!dirResolved) return [];
    const fullDirPath = '/' + dirResolved.join('/');
    const children = list(fullDirPath) || [];
    const matches = children.filter(name => name.startsWith(basePart));
    // append '/' to directories
    const mapped = matches.map(name => {
      const full = `${fullDirPath}/${name}`;
      return dirInput + (isDir(full) ? name + '/' : name);
    });
    // sort dirs first, then files
    mapped.sort((a, b) => {
      const aIsDir = a.endsWith('/');
      const bIsDir = b.endsWith('/');
      if (aIsDir === bIsDir) return a.localeCompare(b);
      return aIsDir ? -1 : 1;
    });
    return mapped.slice(0, 20); // cap to 20 as agreed
  }

  function triggerCompletion() {
    // Determine context
    const tokens = buffer.split(/\s+/);
    const first = tokens[0] || '';
    const current = tokens[tokens.length - 1] || '';
    let cands: string[] = [];
    if (tokens.length === 1) {
      cands = buildCommandCompletions(current);
    } else if (['cd', 'ls', 'open', 'grep'].includes(first)) {
      cands = buildPathCompletions(current);
    }
    completions = cands;
    compIndex = 0;
    if (completions.length) {
      const candidate = completions[0];
      const suffix = candidate.slice(current.length);
      showGhost(suffix);
    }
  }

  function acceptCompletion() {
    if (!ghostActive || !ghostText) return;
    buffer += ghostText;
    term.write(ghostText);
    clearGhost();
  }

  function cycleCompletion(dir: 1 | -1) {
    if (!ghostActive || completions.length < 2) return;
    compIndex = (compIndex + dir + completions.length) % completions.length;
    const tokens = buffer.split(/\s+/);
    const current = tokens[tokens.length - 1] || '';
    const candidate = completions[compIndex];
    const suffix = candidate.slice(current.length);
    showGhost(suffix);
  }

  let escSeq = '';
  const writeChar = async (data: string) => {
    for (const char of data) {
      const code = char.charCodeAt(0);
      // Handle ESC sequence for arrow keys (\x1b[C and \x1b[D)
      if (escSeq) {
        escSeq += char;
        if (escSeq === '\x1b[C' || escSeq === '\x1b[D') {
          // Arrow Right/Left handled in term.onKey; just reset sequence.
          escSeq = '';
          continue;
        } else if (escSeq.length >= 3) {
          // Unrecognized sequence, reset
          escSeq = '';
        }
        continue;
      }

      if (char === '\x1b') {
        escSeq = '\x1b';
        continue;
      }

      switch (code) {
        case 9: { // Tab (accept current suggestion)
          acceptCompletion();
          // After acceptance, recompute suggestions for new buffer state
          triggerCompletion();
          break;
        }
        case 13: { // Enter ↵
          term.write('\r\n');
          const cmdText = buffer.trim();
          await exec(cmdText);
          if (cmdText) {
            cmdHistory.push(cmdText);
          }
          histIndex = cmdHistory.length; // reset to after last
          buffer = '';
          if (cmdText === 'clear') {
            // For a clear, the screen has just been wiped and the cursor is already at (0,0).
            // Emit the prompt without a leading newline so it appears on the very first line.
            prompt();
          } else {
            // For all other commands insert a blank line before the next prompt for readability.
            term.write('\r\n');
            prompt();
          }
          break;
        }
        case 127: { // Backspace
          if (buffer.length) {
            buffer = buffer.slice(0, -1);
            term.write('\b \b');
          }
          triggerCompletion();
          break;
        }
        default:
          // Filter out non-printable characters to prevent free cursor movement
          if (code >= 32 && code < 127) {
            clearGhost();
            buffer += char;
            term.write(char);
            triggerCompletion();
          }
      }
    }
  };

  // Initially compute empty suggestion line
  triggerCompletion();
  term.onData(writeChar);

  // Handle arrow keys for cycling completions using onKey
  term.onKey(({ key, domEvent }) => {
    // History navigation (Up/Down) when at prompt
    if (domEvent.key === 'ArrowUp' || domEvent.key === 'ArrowDown') {
      domEvent.preventDefault();
      if (!cmdHistory.length) return;
      if (histIndex === cmdHistory.length) {
        savedBuffer = buffer; // save current edit before first jump
      }
      if (domEvent.key === 'ArrowUp' && histIndex > 0) {
        histIndex--;
      } else if (domEvent.key === 'ArrowDown' && histIndex < cmdHistory.length) {
        histIndex++;
      }
      const newBuf = histIndex === cmdHistory.length ? savedBuffer : cmdHistory[histIndex];
      // Clear current input line and rewrite prompt + buffer
      term.write('\x1b[2K\r');
      prompt();
      buffer = newBuf;
      term.write(buffer);
      clearGhost();
      triggerCompletion();
      return; // handled
    }
    if (ghostActive && (domEvent.key === 'ArrowRight' || domEvent.key === 'ArrowLeft')) {
      domEvent.preventDefault();
      cycleCompletion(domEvent.key === 'ArrowRight' ? 1 : -1);
    } else if (ghostActive && !['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'ArrowRight', 'ArrowLeft'].includes(domEvent.key)) {
      // Any other key cancels ghost
      clearGhost();
    }
  });

  // Initial prompt
  term.writeln('Type help for command list.');
  prompt();
});
</script>

<style>
  .terminal-shell {
    width: 100%;
    height: 100%;
    border: 1px solid #3f3f46;
    border-radius: 2px;
    background: #0f0f0f;
    box-shadow: inset 0 0 4px #000;
    overflow: hidden;
    transition: border-color 0.2s ease-out;
  }
  .terminal-shell.focused {
    border-color: #caffee99;
  }
  /* Scrollbar */
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar) {
    width: 6px;
  }
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-thumb) {
    background: rgba(63,167,255,0.3);
    border-radius: 3px;
  }
</style>

<div bind:this={container} class="terminal-shell h-full w-full" class:focused={isFocused}></div>
