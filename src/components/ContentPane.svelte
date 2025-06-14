<script lang="ts">
  import { onMount } from 'svelte';
  import { currentPath } from '../stores/router';
  import { readable } from 'svelte/store';

  // Import all markdown under src/content as raw strings
  // load all markdown as raw strings (Vite 5 syntax)
const pages = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default' });

  let path = '/';
  let content: string = 'Welcome! No file selected.';

  const unsub = currentPath.subscribe(async (p) => {
    path = p;
    await loadContent();
  });

  onMount(() => {
    loadContent();
    return () => unsub();
  });

  async function loadContent() {
    // Convert "/blogs/algo/treaps.md" -> "../content/blogs/algo/treaps.md"
    let filePath = path;
    if (filePath === '/') filePath = '/home.md'; // default landing page
    const key = '../content' + (filePath.endsWith('.md') ? filePath : filePath + '.md');
    if (key in pages) {
      content = (await (pages as any)[key]()) as string;
    } else {
      content = `# 404\nPath not found: ${path}`;
    }
  }
</script>

<div class="p-6 prose prose-invert max-w-none">
  <pre>{@html content}</pre>
</div>
