/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        accent: 'var(--accent)',
        'accent-subtle': 'var(--accent-subtle)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: [
          'var(--font-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        // sizes are per-skin; line heights are unitless so both skins share them
        xs: ['var(--fs-xs)', '1.35'],
        sm: ['var(--fs-sm)', '1.55'],
        base: ['var(--fs-base)', '1.7'],
        lg: ['var(--fs-lg)', '1.55'],
        xl: ['var(--fs-xl)', '1.45'],
        '2xl': ['var(--fs-2xl)', '1.3'],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            fontSize: 'var(--prose-font-size)',
            // skin-driven prose colors (prose-invert reads the -invert- set)
            '--tw-prose-body': 'var(--text)',
            '--tw-prose-headings': 'var(--title)',
            '--tw-prose-bold': 'var(--title)',
            '--tw-prose-code': 'var(--title)',
            '--tw-prose-bullets': 'var(--text-muted)',
            '--tw-prose-counters': 'var(--text-muted)',
            '--tw-prose-invert-body': 'var(--text)',
            '--tw-prose-invert-headings': 'var(--title)',
            '--tw-prose-invert-bold': 'var(--title)',
            '--tw-prose-invert-code': 'var(--title)',
            '--tw-prose-invert-bullets': 'var(--text-muted)',
            '--tw-prose-invert-counters': 'var(--text-muted)',
            p: {
              fontSize: 'var(--prose-font-size)',
            },
            // You can add other elements like h1, h2, li etc. if needed
          },
        },
        // if you also use prose-sm, prose-lg, etc., you might want to configure them here too
      }),
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
      },
      transitionTimingFunction: {
        retro: 'var(--ease-retro)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
