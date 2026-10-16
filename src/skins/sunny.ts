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
    contentPane: 'prose',
    proseBody: '',
    blogTitle: 'font-bold leading-tight tracking-tight mb-3 text-[2.5rem] md:text-[3rem] text-[color:var(--title)]',
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
    title: '#1F1F1F', // title, headings, bold, inline code

    /* custom-elements */
    'el-accent': '#D88B00',
    'el-surface': '#FFFDF8',
    'el-text': '#2B2B2B',
    'el-radius': '4px',

    /* typography & sizing */
    'font-mono': 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    // serif stack only used via Tailwind's built-in font-serif class
    // every size is dark's x1.11: the serif runs smaller than Plex at equal size
    'fs-xs': '0.83rem',
    'fs-sm': '0.9rem',
    'fs-base': '0.97rem',
    'fs-lg': '1.25rem',
    'fs-xl': '1.39rem',
    'fs-2xl': '1.67rem',
    'prose-font-size': '1.11rem',

    /* spacing & radius */
    'space-xs': '0.25rem',
    'space-sm': '0.5rem',
    'radius-sm': '4px',

    /* easing */
    'ease-retro': 'cubic-bezier(0.25,0.46,0.45,0.94)',

    /* inline code */
    'code-bg': 'rgba(0, 0, 0, 0.04)',
    'code-border': 'rgba(0, 0, 0, 0.12)',

    /* scrollbar */
    'scrollbar-track': 'rgba(216, 139, 0, 0.1)',
    'scrollbar-thumb': 'linear-gradient(180deg, rgba(216, 139, 0, 0.4), rgba(216, 139, 0, 0.2))',
    'scrollbar-thumb-border': '1px solid rgba(216, 139, 0, 0.2)',
    'scrollbar-thumb-hover': 'linear-gradient(180deg, rgba(216, 139, 0, 0.6), rgba(216, 139, 0, 0.3))',
    'scrollbar-color-firefox': 'rgba(216, 139, 0, 0.5) rgba(216, 139, 0, 0.1)',
  },
  inlineStyles: {},
};
