<script lang="ts">
import { onMount } from 'svelte';
import { currentPath } from '../stores/router';
import { list, isFile, resolvePath } from '../lib/virtualFs';
import 'xterm/css/xterm.css';

let container: HTMLDivElement;
// Expose terminal instance for external focus control
let termInstance: any;

export function focusTerminal() {
  termInstance?.focus();
}

onMount(async () => {
  const { Terminal } = await import('xterm');
  const { FitAddon } = await import('@xterm/addon-fit');
  const term = new Terminal({
    theme: { background: '#18181b', foreground: '#e4e4e7', cursor: '#ffffff' },
    fontFamily: 'Menlo, monospace',
    fontSize: 14,
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

  let cwd: string[] = [];
  let history: string[] = ['/'];
  let buffer = '';

  const prompt = () => {
    const path = '/' + cwd.join('/');
    // Using ANSI escape codes for colors: cyan for path, green for '$'
    term.write(`\r\n\x1b[36m${path}\x1b[0m \x1b[32m$\x1b[0m `);
  };

  function exec(command: string) {
    if (!command) return;
    const [cmd, ...args] = command.split(/\s+/);
    switch (cmd) {
      case 'ls': {
        const entries = list('/' + cwd.join('/')) || [];
        term.writeln(entries.join('  '));
        break;
      }
      case 'cd': {
        const target = args[0] || '/';
        const resolved = resolvePath(cwd, target);
        if (resolved) {
          cwd = resolved;
        } else {
          term.writeln(`cd: no such directory: ${target}`);
        }
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
      case 'help':
        term.writeln('Commands: ls, cd <dir>, open <file>, pop, help');
        break;
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

<div bind:this={container} class="h-full w-full"></div>
