// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  trailingSlash: 'never',
  build: { format: 'file' },
  site: 'https://welcome-to-the-sunny-side.github.io',
  output: 'static',
  integrations: [svelte(), tailwind()],

  vite: {
    // plugins: [tailwindcss()], // Removed @tailwindcss/vite
    resolve: {
      alias: {
        // blog: '/src/layouts/BlogLayout.astro' // Removed as ContentPane.svelte handles blog styling
      }
    }
  }
});