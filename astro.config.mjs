// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  trailingSlash: 'never',
  build: { format: 'file' },
  site: 'https://welcome-to-the-sunny-side.github.io',
  output: 'static',
  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()]
  }
});