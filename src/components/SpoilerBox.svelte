<script>
  export let summaryText = 'Spoiler';
</script>

<details class="spoiler-box">
  <summary>{summaryText}</summary>
  <div class="spoiler-content">
    <slot />
  </div>
</details>

<style>
  /* Scoped styles can be added here if needed, but global styles are in custom-elements.css */
</style>
