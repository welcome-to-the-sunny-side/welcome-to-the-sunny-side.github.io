import type { Skin } from './types';

/*
1. Light
2. Harbors an inviting warmth
3. Elegant
4. Academic, ideal for reading technical blogs (while not ignoring non-blog pages)
*/

export const sunny: Skin = {
  name: 'sunny',
  classes: {
    body: 'font-serif',
    contentPane: 'prose [--tw-prose-bullets:rgba(43,43,43,1)] [--tw-prose-counters:rgba(43,43,43,1)]',
    blogTitle: 'font-semibold leading-tight tracking-tight mb-3 text-[2.1rem] md:text-[1.8rem] text-[color:var(--title)]',
  },
  cssVars: {
    /* core palette*/
    bg: 'rgba(250,248,244,1)',
    surface: 'rgba(246,242,236,1)',
    text: '#2B2B2B',
    'text-muted': '#555555',
    accent: '#D88B00',
    'accent-subtle': 'rgba(216,139,0,0.14)',
    link: '#0077CC',

    /* list markers */
    '--tw-prose-bullets': 'rgba(43,43,43,1)',
    '--tw-prose-counters': 'rgba(43,43,43,1)',

    /* custom-elements */
    'el-accent': '#D88B00',
    'el-surface': '#FFFDF8',
    'el-text': '#2B2B2B',
    'title': '#1F1F1F',
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

    /* scrollbar */
    'scrollbar-track': 'rgba(216, 139, 0, 0.1)',
    'scrollbar-thumb': 'linear-gradient(180deg, rgba(216, 139, 0, 0.4), rgba(216, 139, 0, 0.2))',
    'scrollbar-thumb-border': '1px solid rgba(216, 139, 0, 0.2)',
    'scrollbar-thumb-hover': 'linear-gradient(180deg, rgba(216, 139, 0, 0.6), rgba(216, 139, 0, 0.3))',
    'scrollbar-color-firefox': 'rgba(216, 139, 0, 0.5) rgba(216, 139, 0, 0.1)',
  },
  inlineStyles: {},
};
