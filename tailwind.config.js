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
        bg: '#0d0d0d',
        surface: '#1a1a1a',
        accent: '#64ffda',
        'accent-subtle': '#1f3d38',
        text: '#e0e0e0',
        'text-muted': '#9e9e9e',
      },
      fontFamily: {
        mono: [
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        base: ['14px', '1.5'], // Standard body copy, equivalent to 0.875rem
        sm: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        lg: ['1.125rem', '1.75rem'],
        xl: ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
        // Add more sizes as needed
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            fontSize: '0.9rem', // 13px
            p: {
              fontSize: '0.9rem', // 13px
            },
            // You can add other elements like h1, h2, li etc. if needed
          },
        },
        // if you also use prose-sm, prose-lg, etc., you might want to configure them here too
      }),
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
      },
      borderRadius: {
        sm: '2px',
      },
      transitionTimingFunction: {
        retro: 'cubic-bezier(0.25,0.46,0.45,0.94)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
