<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { get } from 'svelte/store';
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
export let isFocused = true;
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

// --- Date index (prebuilt at build-time) ---
let DATE_INDEX: Record<string, number> = {};

// --- Loading state ---
let isLoading = false;
let loadingSpinnerInterval: number | null = null;
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerFrame = 0;
let unsubLoading: (() => void) | null = null;
let hasShownInitialBanner = false;

// --- Date helpers ---
// All dates are precomputed at build time and provided as epoch millis.
function dateForHtml(htmlPath: string): number {
  return DATE_INDEX[htmlPath] ?? Infinity;
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

// No getRaw/RAW_FILES anymore – dates come from DATE_INDEX

function startLoadingSpinner() {
  if (loadingSpinnerInterval || !termInstance) return; // Already running or no terminal
  
  // Draw spinner on the current prompt line (do not add a new line)
  // Clear the current line, then render the spinner+label
  termInstance.write('\r\x1b[2K');
  termInstance.write(`${spinnerFrames[0]} Loading...`);
  
  loadingSpinnerInterval = setInterval(() => {
    spinnerFrame = (spinnerFrame + 1) % spinnerFrames.length;
    // Update spinner in-place on the same line
    termInstance?.write(`\r\x1b[2K${spinnerFrames[spinnerFrame]} Loading...`);
  }, 100) as any;
}

function stopLoadingSpinner(promptFn?: () => void) {
  if (loadingSpinnerInterval) {
    clearInterval(loadingSpinnerInterval);
    loadingSpinnerInterval = null;
  }
  
  // Clear the loading line and show success message
  if (termInstance) {
    termInstance.write('\r\x1b[K'); // Clear current line
    termInstance.write(`${FILE_COLOR}✓ Page loaded successfully\x1b[0m\r\n`);
    termInstance.write('\r\n'); // extra newline as requested
    // Call prompt function if provided
    if (promptFn) {
      promptFn();
    }
  }
}

onMount(async () => {
  isFocused = true; // Ensure border is active on mount
  
  // Preload date index
  try {
    // In dev, bypass stale caches so new/edited content dates show up immediately.
    const cacheMode: RequestCache = import.meta.env.DEV ? 'reload' : 'force-cache';
    const url = import.meta.env.DEV ? `/vfs-date-index.json?ts=${Date.now()}` : '/vfs-date-index.json';
    const res = await fetch(url, { cache: cacheMode });
    if (res.ok) {
      DATE_INDEX = await res.json();
    }
  } catch {}
  const { Terminal } = await import('xterm');
  const { FitAddon } = await import('@xterm/addon-fit');
  const term = new Terminal({
    theme: {
      background: '#0a0a0a',
      foreground: '#e0e0e0',
      cursor: '#64ffda',
      cursorAccent: '#0a0a0a',
      selectionBackground: 'rgba(100, 255, 218, 0.2)',
      selectionForeground: '#e0e0e0',
      black: '#0a0a0a',
      red: '#ff6b6b',
      green: '#51cf66',
      yellow: '#ffd43b',
      blue: '#339af0',
      magenta: '#f06595',
      cyan: '#64ffda',
      white: '#e0e0e0',
      brightBlack: '#495057',
      brightRed: '#ff8787',
      brightGreen: '#69db7c',
      brightYellow: '#ffe066',
      brightBlue: '#4dabf7',
      brightMagenta: '#f783ac',
      brightCyan: '#7fecec',
      brightWhite: '#f8f9fa'
    },
    cursorBlink: false,
    fontFamily: 'IBM Plex Mono, SF Mono, Menlo, Monaco, Consolas, monospace',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
    cols: 80,
    rows: 24,
    convertEol: true,
    allowProposedApi: true,
    smoothScrollDuration: 120,
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
  let cursorPos = 0; // cursor position within the buffer
  // --- Autocomplete state ---
  const COMMANDS = ['ls', 'cd', 'open', 'pop', 'clear', 'help', 'skin', 'skins'];
  let completions: string[] = [];
  let compIndex = 0;
  let ghostActive = false;
  let ghostText = '';

  const prompt = () => {
    const path = '/' + cwd.join('/');
    term.write(`${PATH_COLOR}${path}\x1b[0m $ `);
  };

  function exec(command: string): boolean {
    if (!command) return false;
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
          return false;
        }
        const fullPath = '/' + pathArr.join('/');
        if (isFile(fullPath)) {
          const color = '\x1b[37m';
          term.writeln(`${(isDir(fullPath)?DIR_COLOR:FILE_COLOR)}${targetArg}\x1b[0m`);
          return false;
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
        return false;
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
        return false;
      }
      case 'open': {
        const file = args[0];
        if (!file) {
          term.writeln('open: missing file');
          return false;
        }
        const pathArr = resolvePath(cwd, file);
        if (pathArr && isFile('/' + pathArr.join('/'))) {
          const fullPath = '/' + pathArr.join('/');
          
          // Check if we're already on this path
          const currentPathValue = get(currentPath);
          
          if (currentPathValue === fullPath) {
            term.writeln(`Already viewing: ${file}`);
            return false; // no navigation needed
          }
          
          history.push(fullPath);
          currentPath.push(fullPath);
          return true; // navigation triggered
        } else {
          term.writeln(`open: file not found: ${file}`);
          return false;
        }
      }
      case 'pop': {
        if (history.length > 1) {
          history.pop();
          const last = history[history.length - 1];
          currentPath.push(last);
          return true; // navigation triggered
        } else {
          term.writeln('pop: history empty');
          return false;
        }
      }
      case 'clear':
        term.clear();
        return false;
      case 'skins': {
        const names = listSkins();
        names.forEach((name, idx) => {
          const branch = idx === names.length - 1 ? '└─ ' : '├─ ';
          term.writeln(branch + name);
        });
        return false;
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
        return false;
      }
      // removed: grep
      case 'help': {
        // Color and align command list
        const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n-s.length));
        const entries = [
          { cmd: 'ls [-r] [-d|-dl|-de] [-v] [path]', desc: 'list directory (tree with -r, date sort, verbose dates)' },
          { cmd: 'cd <dir>', desc: 'change directory' },
          { cmd: 'open <file>', desc: 'open file in content pane' },
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
          { key: 'Shift+Tab', desc: 'cycle suggestions' },
          { key: '← / →', desc: 'move cursor left/right' },
          { key: 'Shift+→', desc: 'collapse terminal' },
          { key: 'Shift+←', desc: 'expand / focus terminal' },
          { key: 'Shift+↑', desc: 'focus content pane' },
          { key: 'h/j/k/l', desc: 'scroll content pane (when terminal unfocused)' },
        ];
        for (const {key, desc} of sc) {
          term.writeln(`${FILE_COLOR}${pad(key, 14)}\x1b[0m  ${desc}`);
        }
        return false;
      }
      default:
        term.writeln(`unknown command: ${cmd}`);
        term.write('\r');
        return false;
    }
    return false; // fallback return for TypeScript
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
    // Save cursor, move to end of buffer, show ghost, restore cursor
    term.write('\x1b[s');
    const moveToEnd = cursorPos < buffer.length ? `\x1b[${buffer.length - cursorPos}C` : '';
    term.write(moveToEnd);
    term.write(`\x1b[90m${text}\x1b[0m`); // dim grey ghost text
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
    } else if (['cd', 'ls', 'open'].includes(first)) {
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
    // Insert completion at cursor position
    buffer = buffer.slice(0, cursorPos) + ghostText + buffer.slice(cursorPos);
    cursorPos += ghostText.length;
    
    // Optimize: only redraw if cursor wasn't at end (avoids flicker)
    if (cursorPos === buffer.length) {
      // Simple case: cursor at end, just write the ghost text
      term.write(ghostText);
    } else {
      // Complex case: cursor in middle, need to redraw
      redrawInputLine();
    }
    clearGhost();
  }

  function cycleCompletion() {
    if (!ghostActive || completions.length < 2) return;
    compIndex = (compIndex + 1) % completions.length;
    const tokens = buffer.split(/\s+/);
    const current = tokens[tokens.length - 1] || '';
    const candidate = completions[compIndex];
    const suffix = candidate.slice(current.length);
    showGhost(suffix);
  }

  function redrawInputLine() {
    // Clear the current line and redraw buffer with cursor at correct position
    term.write('\x1b[2K\r'); // clear line and return to start
    prompt();
    term.write(buffer);
    // Move cursor to correct position
    if (cursorPos < buffer.length) {
      term.write(`\x1b[${buffer.length - cursorPos}D`);
    }
  }

  function moveCursor(dir: 'left' | 'right') {
    if (dir === 'left' && cursorPos > 0) {
      cursorPos--;
      term.write('\x1b[D'); // move cursor left
    } else if (dir === 'right' && cursorPos < buffer.length) {
      cursorPos++;
      term.write('\x1b[C'); // move cursor right
    }
  }

  function insertChar(char: string) {
    buffer = buffer.slice(0, cursorPos) + char + buffer.slice(cursorPos);
    cursorPos++;
    
    if (cursorPos === buffer.length) {
      // At end of buffer, simple write
      term.write(char);
    } else {
      // In middle, need to redraw from cursor position
      const remaining = buffer.slice(cursorPos - 1);
      term.write(remaining);
      // Move cursor back to correct position
      term.write(`\x1b[${remaining.length - 1}D`);
    }
  }

  function deleteChar() {
    if (cursorPos === 0) return;
    
    buffer = buffer.slice(0, cursorPos - 1) + buffer.slice(cursorPos);
    cursorPos--;
    
    // Redraw from cursor position
    term.write('\x1b[D'); // move left
    const remaining = buffer.slice(cursorPos) + ' '; // add space to clear last char
    term.write(remaining);
    // Move cursor back to correct position
    term.write(`\x1b[${remaining.length}D`);
  }

  let escSeq = '';
  const writeChar = (data: string) => {
    // Disable input during loading
    if (isLoading) return;
    
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
          const didNav = exec(cmdText);
          if (cmdText) {
            cmdHistory.push(cmdText);
          }
          histIndex = cmdHistory.length; // reset to after last
          buffer = '';
          cursorPos = 0;
          if (cmdText === 'clear') {
            // For a clear, the screen has just been wiped and the cursor is already at (0,0).
            // Emit the prompt without a leading newline so it appears on the very first line.
            prompt();
          } else {
            // If a navigation was triggered, the spinner subscription will
            // manage the loading line and print the prompt on completion.
            if (!didNav) {
              // For non-navigation commands insert a blank line before next prompt.
              term.write('\r\n');
              prompt();
            }
          }
          break;
        }
        case 127: { // Backspace
          deleteChar();
          triggerCompletion();
          break;
        }
        default:
          // Filter out non-printable characters to prevent free cursor movement
          if (code >= 32 && code < 127) {
            clearGhost();
            insertChar(char);
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
    // Disable keyboard input during loading
    if (isLoading) {
      domEvent.preventDefault();
      return;
    }
    
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
      buffer = newBuf;
      cursorPos = buffer.length; // place cursor at end
      redrawInputLine();
      clearGhost();
      triggerCompletion();
      return; // handled
    }
    // Shift+Tab cycles through completions
    if (domEvent.key === 'Tab' && domEvent.shiftKey && ghostActive) {
      domEvent.preventDefault();
      cycleCompletion();
      return;
    }
    
    // Arrow keys for cursor movement
    if (domEvent.key === 'ArrowLeft') {
      domEvent.preventDefault();
      moveCursor('left');
      return;
    }
    
    if (domEvent.key === 'ArrowRight') {
      domEvent.preventDefault();
      moveCursor('right');
      return;
    }
    
    if (ghostActive && !['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(domEvent.key)) {
      // Any other key cancels ghost
      clearGhost();
    }
  });

  // Initial banner and prompt
  term.writeln('Type help for command list.');
  term.writeln('');
  prompt();
  hasShownInitialBanner = true;

  // Set up loading state subscription now that initial banner is shown
  unsubLoading = currentPath.loading.subscribe((loading) => {
    isLoading = loading;
    if (loading) {
      startLoadingSpinner();
    } else {
      // Avoid printing the ack before we've shown the initial banner
      if (!hasShownInitialBanner) return;
      stopLoadingSpinner(prompt);
    }
  });
  
});

onDestroy(() => {
  if (unsubLoading) {
    unsubLoading();
  }
  if (loadingSpinnerInterval) {
    clearInterval(loadingSpinnerInterval);
  }
});
</script>

<style>
  .terminal-shell {
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
    position: relative;
    padding: 8px;
  }
  
  
  /* Modern scrollbar */
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-track) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-thumb) {
    background: linear-gradient(180deg, rgba(100, 255, 218, 0.3), rgba(100, 255, 218, 0.1));
    border-radius: 4px;
    border: 1px solid rgba(100, 255, 218, 0.1);
    transition: background 0.2s ease;
  }
  
  :global(.terminal-shell .xterm-viewport::-webkit-scrollbar-thumb:hover) {
    background: linear-gradient(180deg, rgba(100, 255, 218, 0.5), rgba(100, 255, 218, 0.2));
  }
  
  /* Do not pad internal xterm layers; padding here breaks selection alignment */
  /* Intentionally empty: keep .xterm-screen without custom padding */
  
  /* Cursor styling */
  :global(.terminal-shell .xterm-cursor-layer .xterm-cursor-bar) {
    background-color: #64ffda !important;
    width: 2px !important;
  }
  
  :global(.terminal-shell .xterm-cursor-layer .xterm-cursor-block) {
    background-color: rgba(100, 255, 218, 0.8) !important;
    border: 1px solid #64ffda !important;
  }
  
  /* Selection styling */
  :global(.terminal-shell .xterm-selection div) {
    background-color: rgba(100, 255, 218, 0.2) !important;
    /* Borders on selection blocks cause visual offsets; keep clean fill only */
    border: none !important;
  }
  
  /* Terminal text enhancements */
  :global(.terminal-shell .xterm-rows) {
    font-variant-ligatures: normal;
    text-rendering: optimizeLegibility;
  }
</style>

<div bind:this={container} class="terminal-shell h-full w-full" class:focused={isFocused}></div>
