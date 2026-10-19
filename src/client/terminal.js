// The terminal: an xterm.js shell over the VFS (ls, cd, open, pop, skins, ...)
// with its own line editor: history, ghost-text completion, cursor movement
// and line wrapping are all handled here, since xterm.js only draws.
//
// Loaded on demand by src/client/pane.js, which owns the pane around it.
//
// xterm.js gotchas (both load-bearing below):
//   - cursor-movement escapes (\x1b[D, \x1b[C) don't wrap across visual rows;
//     fix bugs at line boundaries by handling the boundary case, not by
//     rewriting the editing functions.
//   - onKey and onData fire alongside each other, not as alternatives:
//     preventDefault() in onKey only stops browser defaults, and escape
//     sequences (arrows, Shift+Tab) still reach writeChar as data, where the
//     escSeq parser swallows them.
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { list, isFile, isDir, resolvePath, DATES } from './vfs.js';
import { currentPath, push, isLoading as navigating } from './router.js';
import { SKINS, wearSkin } from './skin.js';
import { THEMES, DEFAULT_THEME, STORAGE_KEY } from './terminalThemes.js';

// Dynamic color helpers — updated when theme changes
let ttheme = savedTheme();
let PATH_COLOR = `\x1b[38;2;${ttheme.ui.pathRgb}m`;
let FILE_COLOR = `\x1b[38;2;${ttheme.ui.fileRgb}m`;
let DIR_COLOR = ttheme.ui.dirColor;

function updateColors(t) {
  ttheme = t;
  PATH_COLOR = `\x1b[38;2;${t.ui.pathRgb}m`;
  FILE_COLOR = `\x1b[38;2;${t.ui.fileRgb}m`;
  DIR_COLOR = t.ui.dirColor;
}

function savedTheme() {
  try {
    return THEMES[localStorage.getItem(STORAGE_KEY)] ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// `tskin`: the pane's colours follow <html data-tskin> (CSS generated from
// terminalThemes.js); xterm's palette is set here. Old output is cleared so
// stale colours don't linger.
function setTerminalTheme(name) {
  const theme = THEMES[name];
  if (!theme) throw new Error(`Terminal theme not found: ${name}`);
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {}
  document.documentElement.dataset.tskin = name;
  updateColors(theme);
  termInstance.options.theme = theme.xterm;
  termInstance.clear();
}

let container;
let termInstance;
let fitAddon;
// Called after a successful resize to redraw the current input line
let afterResizeCallback = null;

// Fit terminal but reserve one row at the bottom for visual breathing room
function fitWithPadding() {
  if (!fitAddon || !termInstance) return;
  // Don't resize if the container is hidden (e.g., collapsed pane)
  if (container && (container.offsetHeight === 0 || container.offsetWidth === 0)) return;
  const dims = fitAddon.proposeDimensions();
  if (dims && dims.cols > 2 && dims.rows > 1) {
    termInstance.resize(dims.cols, dims.rows);
    afterResizeCallback?.();
  }
}

// --- Loading state (a navigation is in progress) ---
let isLoading = false;
let loadingSpinnerInterval = null;
const spinnerFrames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
let spinnerFrame = 0;

// --- Date helpers ---
// All dates are precomputed at build time and provided as epoch millis.
function dateForHtml(htmlPath) {
  return DATES[htmlPath] ?? Infinity;
}

// Cache directory min / max dates to avoid recomputation during a single ls.
const dirDateCache = {};

// Recursively obtain the minimum / maximum date of any markdown file in a directory subtree.
function getDirDate(dirPath, wantMax) {
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
    let ts;
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
function sortNamesByDate(dirPath, names, mode) {
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
  }, 100);
}

function stopLoadingSpinner(promptFn) {
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

/**
 * Mount the terminal in `el`. `onFocusChange(focused)` is told when it gains
 * or loses keyboard focus. Returns { focus, resize }.
 */
export async function mountTerminal(el, onFocusChange) {
  container = el;
  // xterm measures its cell size once, at open: wait for the webfont or the
  // grid is sized for the fallback font (line spacing then varies by load).
  try {
    await document.fonts.load('16px "IBM Plex Mono"');
  } catch {}
  // xterm fontSize is a JS number, so it can't follow the clamp() on :root directly — read it once at mount.
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const term = new Terminal({
    theme: ttheme.xterm,
    cursorBlink: false,
    fontFamily: 'IBM Plex Mono, SF Mono, Menlo, Monaco, Consolas, monospace',
    fontSize: Math.round(rootPx), // 1rem, same as dark-skin body text
    fontWeight: '400',
    letterSpacing: 0,
    cols: 80,
    rows: 24,
    convertEol: true,
    allowProposedApi: true,
    smoothScrollDuration: 120,
  });
  const fit = new FitAddon();
  fitAddon = fit;
  term.loadAddon(fit);
  // Let browser-native shortcuts pass through instead of being captured by xterm
  term.attachCustomKeyEventHandler((e) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Backspace: delete the previous word in our input buffer instead
      // of letting the browser handle it (xterm's hidden textarea makes the
      // browser default a no-op anyway).
      if (e.type === 'keydown' && e.ctrlKey && !e.metaKey && e.key === 'Backspace') {
        e.preventDefault();
        if (!isLoading) deleteWord();
      }
      return false;
    }
    return true;
  });
  term.open(container);
  termInstance = term;
  fitWithPadding();
  term.focus();

  onFocusChange(true);
  term.textarea?.addEventListener('focus', () => onFocusChange(true));
  term.textarea?.addEventListener('blur', () => onFocusChange(false));

  let cwd = [];
  let history = ['/'];
  // In-terminal command history (↑ / ↓)
  let cmdHistory = [];
  // Index into cmdHistory. 0 .. length-1 = stored commands, length = current typing
  let histIndex = 0;
  let savedBuffer = '';
  let buffer = '';
  let cursorPos = 0; // cursor position within the buffer
  // --- Autocomplete state ---
  const COMMANDS = ['ls', 'cd', 'open', 'pop', 'clear', 'help', 'cskin', 'cskins', 'tskin', 'tskins'];
  let completions = [];
  let compIndex = 0;
  let ghostActive = false;
  let ghostText = '';

  const prompt = () => {
    const path = '/' + cwd.join('/');
    term.write(`${PATH_COLOR}${path}\x1b[0m $ `);
  };

  function exec(command) {
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
        const dateMode = dateDesc ? 'desc' : (dateAsc ? 'asc' : null);

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
          const lines = [];
          const buildLines = (seg, prefix = '') => {
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
          const currentPathValue = currentPath();
          
          if (currentPathValue === fullPath) {
            term.writeln(`Already viewing: ${file}`);
            return false; // no navigation needed
          }
          
          history.push(fullPath);
          push(fullPath);
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
          push(last);
          return true; // navigation triggered
        } else {
          term.writeln('pop: history empty');
          return false;
        }
      }
      case 'clear':
        term.clear();
        return false;
      case 'cskins': {
        const names = SKINS;
        names.forEach((name, idx) => {
          const branch = idx === names.length - 1 ? '└─ ' : '├─ ';
          term.writeln(branch + name);
        });
        return false;
      }
      case 'cskin': {
        const name = args[0];
        if (!name) {
          term.writeln('Usage: cskin <name>');
        } else {
          try {
            wearSkin(name);
            term.writeln(`Content skin: ${name}`);
          } catch (e) {
            term.writeln(String(e));
          }
        }
        return false;
      }
      case 'tskins': {
        const names = Object.keys(THEMES);
        names.forEach((name, idx) => {
          const branch = idx === names.length - 1 ? '└─ ' : '├─ ';
          term.writeln(branch + name);
        });
        return false;
      }
      case 'tskin': {
        const name = args[0];
        if (!name) {
          term.writeln('Usage: tskin <name>');
        } else {
          try {
            setTerminalTheme(name);
            term.writeln(`Terminal theme: ${name}`);
          } catch (e) {
            term.writeln(String(e));
          }
        }
        return false;
      }
      case 'help': {
        const entries = [
          { cmd: 'ls [-r] [-d|-dl|-de] [-v] [path]', desc: 'list directory' },
          { cmd: 'cd <dir>', desc: 'change directory' },
          { cmd: 'open <file>', desc: 'open file in content pane' },
          { cmd: 'cskins / cskin <name>', desc: 'list / set content pane skin' },
          { cmd: 'tskins / tskin <name>', desc: 'list / set terminal theme' },
          { cmd: 'pop', desc: 'go back' },
          { cmd: 'clear', desc: 'clear terminal' },
          { cmd: 'help', desc: 'this message' },
        ];
        term.writeln(`${PATH_COLOR}COMMANDS\x1b[0m`);
        for (const {cmd, desc} of entries) {
          term.writeln(`  ${FILE_COLOR}${cmd}\x1b[0m`);
          term.writeln(`\x1b[2m    ${desc}\x1b[0m`);
        }
        term.writeln('');
        const sc = [
          { key: 'Tab', desc: 'accept autocomplete' },
          { key: 'Shift+Tab', desc: 'cycle suggestions' },
          { key: '← / →', desc: 'move cursor left/right' },
          { key: 'Shift+→', desc: 'collapse terminal' },
          { key: 'Shift+←', desc: 'expand / focus terminal' },
          { key: 'Shift+↑', desc: 'focus content pane' },
          { key: 'h/j/k/l', desc: 'scroll focused content pane' },
        ];
        term.writeln(`${PATH_COLOR}SHORTCUTS\x1b[0m`);
        for (const {key, desc} of sc) {
          term.writeln(`  ${FILE_COLOR}${key}\x1b[0m`);
          term.writeln(`\x1b[2m    ${desc}\x1b[0m`);
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

  // Helper to clear ghost suggestion. The ghost sits after the end of the
  // buffer and can wrap onto the rows below, so erase from the buffer's end
  // to the end of the screen (`\x1b[K` alone left the wrapped part behind).
  function clearGhost() {
    if (!ghostActive) return;
    term.write('\x1b[s');        // save cursor
    if (cursorPos < buffer.length) term.write(`\x1b[${buffer.length - cursorPos}C`); // to end of buffer, as in showGhost
    term.write('\x1b[J');        // erase to end of screen
    term.write('\x1b[u');        // restore cursor
    ghostActive = false;
    ghostText = '';
  }

  function showGhost(text) {
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

  function buildCommandCompletions(prefix) {
    return COMMANDS.filter(c => c.startsWith(prefix));
  }

  function buildPathCompletions(prefix) {
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
    let cands = [];
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

  function moveCursor(dir) {
    if (dir === 'left' && cursorPos > 0) {
      cursorPos--;
      term.write('\x1b[D'); // move cursor left
    } else if (dir === 'right' && cursorPos < buffer.length) {
      cursorPos++;
      term.write('\x1b[C'); // move cursor right
    }
  }

  function insertChar(char) {
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

  // Ctrl+Backspace: delete the previous word. Walk back over trailing
  // whitespace, then one contiguous run of either word-chars (\w) or
  // separator-chars — whichever class precedes the cursor. Matches the
  // segmented behavior of typical browser textboxes (e.g. typing
  // `cd /algo/problems/cf-2056f1.html` and hitting Ctrl+Backspace four
  // times eats `html`, `.`, `2056f1`, `-`).
  //
  // We can't loop deleteChar() here: deleteChar's wrap branch uses
  // `\x1b[J` (erase to end of screen), which is fine when the cursor is
  // at the visual end of the buffer (single-backspace case), but when
  // the buffer wraps across multiple rows and we're peeling chars off
  // the end, the second wrap-up walks into the row above — eventually
  // chewing into prior terminal output. So we compute the new state and
  // do one full redraw from the prompt's start row.
  function deleteWord() {
    if (cursorPos === 0) return;
    let target = cursorPos;
    const isSpace = (c) => /\s/.test(c);
    const isWord = (c) => /\w/.test(c);
    while (target > 0 && isSpace(buffer[target - 1])) target--;
    if (target > 0) {
      const wordRun = isWord(buffer[target - 1]);
      while (target > 0 && !isSpace(buffer[target - 1]) && isWord(buffer[target - 1]) === wordRun) {
        target--;
      }
    }
    if (target === cursorPos) target = cursorPos - 1; // safety: always make progress

    const cols = termInstance?.cols ?? 80;
    const promptLen = ('/' + cwd.join('/')).length + 3; // path + " $ "
    const rowsUp = Math.floor((promptLen + cursorPos) / cols);

    buffer = buffer.slice(0, target) + buffer.slice(cursorPos);
    cursorPos = target;

    if (rowsUp > 0) term.write(`\x1b[${rowsUp}A`);
    term.write('\r');         // to col 0 of prompt's row
    term.write('\x1b[J');     // clear from prompt-start to end of screen
    prompt();
    term.write(buffer);
    if (cursorPos < buffer.length) {
      // Cursor sits at end of buffer after deletion; if the buffer has
      // tail chars (from when cursor was mid-buffer), back up to its
      // logical position. Use absolute column + row moves so we don't
      // hit the no-wrap-on-\x1b[D xterm gotcha.
      const tailRows = Math.floor((promptLen + buffer.length) / cols) - Math.floor((promptLen + cursorPos) / cols);
      const targetCol = (promptLen + cursorPos) % cols;
      if (tailRows > 0) term.write(`\x1b[${tailRows}A`);
      term.write(`\x1b[${targetCol + 1}G`);
    }
    triggerCompletion();
  }

  function deleteChar() {
    if (cursorPos === 0) return;

    const cursorX = termInstance?.buffer?.active?.cursorX ?? 1;

    buffer = buffer.slice(0, cursorPos - 1) + buffer.slice(cursorPos);
    cursorPos--;

    if (cursorX === 0) {
      // We're at column 0 of a wrapped row — move up and to end of previous row
      const cols = termInstance?.cols ?? 80;
      term.write('\x1b[A');        // move up one row
      term.write(`\x1b[${cols}G`); // move to last column
      term.write('\x1b[J');        // clear everything from here down
    } else {
      // Normal case — same row
      term.write('\x1b[D'); // move left
      const remaining = buffer.slice(cursorPos) + ' ';
      term.write(remaining);
      term.write(`\x1b[${remaining.length}D`);
    }
  }

  let escSeq = '';
  const writeChar = (data) => {
    // Disable input during loading
    if (isLoading) return;

    for (const char of data) {
      const code = char.charCodeAt(0);
      // xterm fires onData alongside onKey, so escape sequences for arrow keys
      // and Shift+Tab still arrive here. Swallow them so they don't get
      // inserted as literal text — the actual handling is done in term.onKey.
      if (escSeq) {
        escSeq += char;
        if (escSeq.length >= 3) escSeq = '';
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

  // Redraw current input after terminal resize to keep cursor in sync
  afterResizeCallback = () => {
    if (buffer.length > 0 || cursorPos > 0) {
      redrawInputLine();
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

  // Navigations (from here, links, breadcrumbs) show a spinner and lock input.
  if (navigating()) {
    isLoading = true;
    startLoadingSpinner();
  } else {
    stopLoadingSpinner(prompt);
  }
  addEventListener('site:navstart', () => {
    isLoading = true;
    startLoadingSpinner();
  });
  addEventListener('site:navend', () => {
    isLoading = false;
    stopLoadingSpinner(prompt);
  });

  return { focus: () => term.focus(), resize: fitWithPadding };
}
