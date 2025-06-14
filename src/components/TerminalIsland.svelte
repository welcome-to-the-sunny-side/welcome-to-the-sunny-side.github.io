<script lang="ts">
import { onMount } from 'svelte';
import { currentPath } from '../stores/router';
import { list, isFile, isDir, resolvePath } from '../lib/virtualFs';

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

export function focusTerminal() {
  termInstance?.focus();
}

onMount(async () => {
  isFocused = true; // Ensure border is active on mount
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
  let buffer = '';

  const prompt = () => {
    const path = '/' + cwd.join('/');
    term.write(`${PATH_COLOR}${path}\x1b[0m $ `);
  };

  function exec(command: string) {
    if (!command) return;
    const [cmd, ...args] = command.split(/\s+/);
    switch (cmd) {
      case 'ls': {
                // Detect recursive flag (-R or -r)
        const flags = args.filter(a => a.startsWith('-'));
        const recursive = flags.includes('-R') || flags.includes('-r');
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

        if (!recursive) {
          const children = list(fullPath) || [];
          children.forEach((name, idx) => {
            const isLast = idx === children.length - 1;
            const branch = isLast ? '└─ ' : '├─ ';
            const col = isDir(`${fullPath}/${name}`) ? DIR_COLOR : FILE_COLOR;
            term.writeln(`${branch}${col}${name}\x1b[0m`);
          });
        } else {
          // Recursive tree view
          const lines: string[] = [];
          const buildLines = (seg: string[], prefix = '') => {
            const children = list('/' + seg.join('/')) || [];
            children.forEach((name, idx) => {
              const isLast = idx === children.length - 1;
              const branch = isLast ? '└─ ' : '├─ ';
              const childSegs = [...seg, name];
              const childFull = '/' + childSegs.join('/');
              const dir = isDir(childFull);
              const color = dir ? DIR_COLOR : FILE_COLOR;
              lines.push(`${prefix}${branch}${color}${name}\x1b[0m`);
              if (dir) {
                const newPrefix = prefix + (isLast ? '   ' : '│  ');
                buildLines(childSegs, newPrefix);
              }
            });
          };
          buildLines(pathArr);
          for (const l of lines) term.writeln(l);
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
      case 'help': {
        // Color and align command list
        const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n-s.length));
        const entries = [
          { cmd: 'ls [-R] [path]', desc: 'list directory (recursive with -R)' },
          { cmd: 'cd <dir>', desc: 'change directory' },
          { cmd: 'open <file>', desc: 'open file in content pane' },
          { cmd: 'pop', desc: 'go back' },
          { cmd: 'clear', desc: 'clear terminal' },
          { cmd: 'help', desc: '-' },
        ];
        term.writeln(`${PATH_COLOR}COMMAND         DESCRIPTION\x1b[0m`);
        for (const {cmd, desc} of entries) {
          term.writeln(`${FILE_COLOR}${pad(cmd, 14)}\x1b[0m  ${desc}`);
        }
        break;
      }
      default:
        term.writeln(`unknown command: ${cmd}`);
    }
  }

  const writeChar = (data: string) => {
    for (const char of data) {
      const code = char.charCodeAt(0);
      switch (code) {
        case 13: { // Enter
          term.write('\r\n');
          exec(buffer.trim());
          buffer = '';
          prompt();
          break;
        }
        case 127: { // Backspace
          if (buffer.length) {
            buffer = buffer.slice(0, -1);
            term.write('\b \b');
          }
          break;
        }
        default:
          // Filter out non-printable characters to prevent free cursor movement
          if (code >= 32 && code < 127) {
            buffer += char;
            term.write(char);
          }
      }
    }
  };

  term.onData(writeChar);

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
