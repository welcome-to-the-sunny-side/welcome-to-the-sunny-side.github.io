import type { Skin } from './types';

// The current "retro dark" look of the site, captured as the default dark skin.
export const dark: Skin = {
  name: 'dark',
  classes: {
    body: 'font-mono', // bg handled via css var
    contentPane: 'prose prose-invert',
    // proportional text for long-form reading; code, metadata and terminal stay mono
    proseBody: 'prose-headings:font-sans prose-p:font-sans prose-li:font-sans prose-blockquote:font-sans prose-td:font-sans prose-th:font-sans prose-p:tracking-normal prose-li:tracking-normal prose-blockquote:tracking-normal prose-td:tracking-normal prose-th:tracking-normal',
    blogTitle: 'font-sans font-bold leading-tight tracking-tight mb-3 text-[2.5rem] md:text-[3rem] text-accent',
  },
  cssVars: {
    bg: '#0d0d0d',
    surface: '#1a1a1a',
    text: '#d4d4d4',
    'text-muted': '#9e9e9e',
    accent: '#64ffda',
    'accent-subtle': 'rgba(100,255,218,0.15)',
    link: '#7dd3fc',
    title: '#ffffff', // headings, bold, inline code (the post title uses accent)
    /* custom-elements */
    'el-accent': '#3fa7ff',
    'el-surface': '#0f0f0f',
    'el-text': '#d0d0d0',
    'el-radius': '2px',

    /* typography & sizing */
    'font-mono': 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    'fs-xs': '0.75rem',
    'fs-sm': '0.8125rem',
    'fs-base': '0.875rem',
    'fs-lg': '1.125rem',
    'fs-xl': '1.25rem',
    'fs-2xl': '1.5rem',
    'prose-font-size': '1rem',

    /* spacing & radius */
    'space-xs': '0.25rem',
    'space-sm': '0.5rem',
    'radius-sm': '2px',

    /* easing */
    'ease-retro': 'cubic-bezier(0.25,0.46,0.45,0.94)',

    /* inline code */
    'code-bg': 'rgba(255, 255, 255, 0.07)',
    'code-border': 'rgba(255, 255, 255, 0.1)',

    /* scrollbar */
    'scrollbar-track': 'rgba(0, 0, 0, 0.2)',
    'scrollbar-thumb': 'linear-gradient(180deg, rgba(100, 255, 218, 0.3), rgba(100, 255, 218, 0.1))',
    'scrollbar-thumb-border': '1px solid rgba(100, 255, 218, 0.1)',
    'scrollbar-thumb-hover': 'linear-gradient(180deg, rgba(100, 255, 218, 0.5), rgba(100, 255, 218, 0.2))',
    'scrollbar-color-firefox': 'rgba(100, 255, 218, 0.4) rgba(0, 0, 0, 0.2)',
  },
  inlineStyles: {},
};
