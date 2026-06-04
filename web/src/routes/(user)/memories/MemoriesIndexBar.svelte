<!--
  FORK: Index bar for quick year navigation on the memories page.
-->
<script lang="ts">
  type Props = {
    years: number[];
  };

  let { years }: Props = $props();

  function scrollToYear(year: number) {
    const element = document.getElementById(`year-${year}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

{#if years.length > 1}
  <div class="sticky top-0 z-10 mb-6 flex items-center gap-2 overflow-x-auto rounded-lg bg-white/80 p-2 backdrop-blur-sm dark:bg-immich-dark-bg/80">
    {#each years as year (year)}
      <button
        type="button"
        class="rounded-full px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onclick={() => scrollToYear(year)}
      >
        {year}
      </button>
    {/each}
  </div>
{/if}
