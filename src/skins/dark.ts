import type { Skin } from './types';

// The current "retro dark" look of the site, captured as the default dark skin.
export const dark: Skin = {
  name: 'dark',
  classes: {
    body: 'font-mono', // bg handled via css var
    contentPane: 'prose prose-invert',
    blogTitle: 'text-2xl md:text-3xl font-semibold tracking-tight text-accent',
  },
  cssVars: {
    bg: '#0d0d0d',
    surface: '#1a1a1a',
    text: '#d4d4d4',
    'text-muted': '#9e9e9e',
    accent: '#64ffda',
    'accent-subtle': 'rgba(100,255,218,0.15)',
    link: '#7dd3fc',
    /* custom-elements */
    'el-accent': '#3fa7ff',
    'el-surface': '#0f0f0f',
    'el-text': '#d0d0d0',
    'el-radius': '2px',

    /* typography & sizing */
    'font-mono': 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    'fs-base': '14px',
    'lh-base': '1.5',
    'fs-sm': '0.8125rem',
    'lh-sm': '1.25rem',
    'fs-lg': '1.125rem',
    'lh-lg': '1.75rem',
    'fs-xl': '1.25rem',
    'lh-xl': '1.75rem',
    'fs-2xl': '1.5rem',
    'lh-2xl': '2rem',
    'prose-font-size': '0.9rem',

    /* spacing & radius */
    'space-xs': '0.25rem',
    'space-sm': '0.5rem',
    'radius-sm': '2px',

    /* easing */
    'ease-retro': 'cubic-bezier(0.25,0.46,0.45,0.94)',

    /* scrollbar */
    'scrollbar-track': 'rgba(0, 0, 0, 0.2)',
    'scrollbar-thumb': 'linear-gradient(180deg, rgba(100, 255, 218, 0.3), rgba(100, 255, 218, 0.1))',
    'scrollbar-thumb-border': '1px solid rgba(100, 255, 218, 0.1)',
    'scrollbar-thumb-hover': 'linear-gradient(180deg, rgba(100, 255, 218, 0.5), rgba(100, 255, 218, 0.2))',
    'scrollbar-color-firefox': 'rgba(100, 255, 218, 0.4) rgba(0, 0, 0, 0.2)',
  },
  inlineStyles: {},
};
