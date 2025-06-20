import type { Skin } from './types';

// A bright, warm, academic-feeling light theme.
export const sunny: Skin = {
  name: 'sunny',
  classes: {
    body: 'font-serif',
    contentPane: 'prose',
    blogTitle: 'text-accent',
  },
  cssVars: {
    /* core palette*/
    bg: '#FCFCFA',
    surface: '#F4F1E6',
    text: '#2B2B2B',
    'text-muted': '#555555',
    accent: '#D88B00',
    'accent-subtle': 'rgba(216,139,0,0.14)',
    link: '#0077CC',

    /* custom-elements */
    'el-accent': '#D88B00',
    'el-surface': '#FFFDF8',
    'el-text': '#2B2B2B',
    'el-radius': '4px',

    /* typography & sizing */
    'font-mono': 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    // serif stack only used via Tailwind's built-in font-serif class
    'fs-base': '15px',
    'lh-base': '1.7',
    'fs-sm': '0.85rem',
    'lh-sm': '1.35rem',
    'fs-lg': '1.125rem',
    'lh-lg': '1.8rem',
    'fs-xl': '1.3rem',
    'lh-xl': '1.9rem',
    'fs-2xl': '1.6rem',
    'lh-2xl': '2.1rem',
    'prose-font-size': '1rem',

    /* spacing & radius */
    'space-xs': '0.25rem',
    'space-sm': '0.5rem',
    'radius-sm': '4px',

    /* easing */
    'ease-retro': 'cubic-bezier(0.25,0.46,0.45,0.94)',
  },
  inlineStyles: {},
};
