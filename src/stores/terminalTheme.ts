import { writable } from 'svelte/store';

export interface TerminalTheme {
  name: string;
  // xterm.js theme object
  xterm: {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent: string;
    selectionBackground: string;
    selectionForeground: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
  // Colors used by terminal output (prompt, files, dirs) as RGB triples for ANSI escapes
  ui: {
    pathRgb: string;      // prompt path color
    fileRgb: string;      // file listing color
    dirColor: string;     // ANSI escape for directory color
  };
  // Wrapper styling (TerminalPane.svelte border, glow, toggle)
  wrapper: {
    bg: string;           // background gradient start
    bgEnd: string;        // background gradient end
    border: string;       // border color
    borderFocus: string;  // border color when focused
    glow: string;         // accent color for glows/shadows (rgba)
    glowStrong: string;   // stronger glow variant
    accent: string;       // solid accent (toggle icon, label)
    accentMuted: string;  // muted accent (toggle border, label)
    shadow: string;       // outer box-shadow color (dark for dark themes, subtle for light)
  };
}

const classic: TerminalTheme = {
  name: 'classic',
  xterm: {
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
    brightWhite: '#f8f9fa',
  },
  ui: {
    pathRgb: '100;255;218',
    fileRgb: '255;230;120',
    dirColor: '\x1b[37m',
  },
  wrapper: {
    bg: '#0a0a0a',
    bgEnd: '#0d0d0d',
    border: 'rgba(100, 255, 218, 0.15)',
    borderFocus: 'rgba(100, 255, 218, 0.4)',
    glow: 'rgba(100, 255, 218, 0.1)',
    glowStrong: 'rgba(100, 255, 218, 0.3)',
    accent: '#64ffda',
    accentMuted: 'rgba(100, 255, 218, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

const solarized: TerminalTheme = {
  name: 'solarized',
  xterm: {
    background: '#fdf6e3',
    foreground: '#657b83',
    cursor: '#d33682',
    cursorAccent: '#fdf6e3',
    selectionBackground: 'rgba(211, 54, 130, 0.15)',
    selectionForeground: '#657b83',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#93a1a1',
    brightYellow: '#839496',
    brightBlue: '#657b83',
    brightMagenta: '#6c71c4',
    brightCyan: '#2aa198',
    brightWhite: '#fdf6e3',
  },
  ui: {
    pathRgb: '42;161;152',   // solarized cyan
    fileRgb: '181;137;0',    // solarized yellow
    dirColor: '\x1b[38;2;88;110;117m', // solarized base01
  },
  wrapper: {
    bg: '#fdf6e3',
    bgEnd: '#f5eedb',
    border: 'rgba(42, 161, 152, 0.25)',
    borderFocus: 'rgba(42, 161, 152, 0.5)',
    glow: 'rgba(42, 161, 152, 0.1)',
    glowStrong: 'rgba(42, 161, 152, 0.3)',
    accent: '#2aa198',
    accentMuted: 'rgba(42, 161, 152, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
};

const gruvbox: TerminalTheme = {
  name: 'gruvbox',
  xterm: {
    background: '#fbf1c7',
    foreground: '#3c3836',
    cursor: '#d65d0e',
    cursorAccent: '#fbf1c7',
    selectionBackground: 'rgba(214, 93, 14, 0.15)',
    selectionForeground: '#3c3836',
    black: '#3c3836',
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#ebdbb2',
    brightBlack: '#665c54',
    brightRed: '#9d0006',
    brightGreen: '#79740e',
    brightYellow: '#b57614',
    brightBlue: '#076678',
    brightMagenta: '#8f3f71',
    brightCyan: '#427b58',
    brightWhite: '#fbf1c7',
  },
  ui: {
    pathRgb: '214;93;14',    // gruvbox orange
    fileRgb: '69;133;136',   // gruvbox blue
    dirColor: '\x1b[38;2;60;56;54m', // gruvbox fg
  },
  wrapper: {
    bg: '#fbf1c7',
    bgEnd: '#f2e5b0',
    border: 'rgba(214, 93, 14, 0.25)',
    borderFocus: 'rgba(214, 93, 14, 0.5)',
    glow: 'rgba(214, 93, 14, 0.1)',
    glowStrong: 'rgba(214, 93, 14, 0.3)',
    accent: '#d65d0e',
    accentMuted: 'rgba(214, 93, 14, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
};

const dracula: TerminalTheme = {
  name: 'dracula',
  xterm: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#ff79c6',
    cursorAccent: '#282a36',
    selectionBackground: 'rgba(255, 121, 198, 0.2)',
    selectionForeground: '#f8f8f2',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#6272a4',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
  ui: {
    pathRgb: '189;147;249',  // dracula purple
    fileRgb: '241;250;140',  // dracula yellow
    dirColor: '\x1b[38;2;139;233;253m', // dracula cyan
  },
  wrapper: {
    bg: '#282a36',
    bgEnd: '#1e1f29',
    border: 'rgba(255, 121, 198, 0.2)',
    borderFocus: 'rgba(255, 121, 198, 0.45)',
    glow: 'rgba(255, 121, 198, 0.1)',
    glowStrong: 'rgba(255, 121, 198, 0.3)',
    accent: '#ff79c6',
    accentMuted: 'rgba(255, 121, 198, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

const nord: TerminalTheme = {
  name: 'nord',
  xterm: {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#88c0d0',
    cursorAccent: '#2e3440',
    selectionBackground: 'rgba(136, 192, 208, 0.2)',
    selectionForeground: '#d8dee9',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#5e81ac',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
  },
  ui: {
    pathRgb: '136;192;208',  // nord frost
    fileRgb: '235;203;139',  // nord yellow
    dirColor: '\x1b[38;2;229;233;240m', // nord snow
  },
  wrapper: {
    bg: '#2e3440',
    bgEnd: '#272c36',
    border: 'rgba(136, 192, 208, 0.2)',
    borderFocus: 'rgba(136, 192, 208, 0.45)',
    glow: 'rgba(136, 192, 208, 0.1)',
    glowStrong: 'rgba(136, 192, 208, 0.3)',
    accent: '#88c0d0',
    accentMuted: 'rgba(136, 192, 208, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

const THEMES: Record<string, TerminalTheme> = {
  [classic.name]: classic,
  [solarized.name]: solarized,
  [gruvbox.name]: gruvbox,
  [dracula.name]: dracula,
  [nord.name]: nord,
};

function loadInitial(): TerminalTheme {
  if (typeof localStorage === 'undefined') return classic;
  const saved = localStorage.getItem('wtss-terminal-theme');
  return (saved && THEMES[saved]) ? THEMES[saved] : classic;
}

export const currentTerminalTheme = writable<TerminalTheme>(loadInitial());

export function listTerminalThemes(): string[] {
  return Object.keys(THEMES);
}

export function setTerminalTheme(name: string) {
  const theme = THEMES[name];
  if (!theme) throw new Error(`Terminal theme not found: ${name}`);
  currentTerminalTheme.set(theme);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('wtss-terminal-theme', name);
  }
}
