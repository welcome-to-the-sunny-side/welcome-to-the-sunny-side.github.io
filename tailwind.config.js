/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md}',
    './site-reference.md'
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
        mono: [
          'var(--font-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        base: ['var(--fs-base)', 'var(--lh-base)'],
        sm: ['var(--fs-sm)', 'var(--lh-sm)'],
        lg: ['var(--fs-lg)', 'var(--lh-lg)'],
        xl: ['var(--fs-xl)', 'var(--lh-xl)'],
        '2xl': ['var(--fs-2xl)', 'var(--lh-2xl)'],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            fontSize: 'var(--prose-font-size)',
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
