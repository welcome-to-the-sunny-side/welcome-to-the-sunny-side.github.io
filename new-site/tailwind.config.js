/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'base': '14px',
      },
      colors: {
        // Dark theme (default)
        bg: '#0d0d0d',
        surface: '#1a1a1a',
        'surface-alt': '#161616',
        accent: '#64ffda',
        'accent-subtle': '#264d48',
        warning: '#ffb454',
        text: '#e0e0e0',
        'text-muted': '#9e9e9e',
        // Terminal colors
        'terminal-green': '#64ffda',
        'terminal-yellow': '#ffe678',
      },
      animation: {
        'cursor-blink': 'blink 1s infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        }
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
