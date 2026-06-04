<!--
  FORK: Dedicated Memories page with memory cards grid view.
  Provides a browsable overview of all memories, unlike the existing
  slideshow-style memory viewer at /memory.
-->
<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { memoryManager } from '$lib/managers/memory-manager.svelte';
  import { Route } from '$lib/route';
  import type { PageData } from './$types';
  import MemoryCard from './MemoryCard.svelte';
  import MemoriesEmptyState from './MemoriesEmptyState.svelte';
  import MemoriesIndexBar from './MemoriesIndexBar.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const memories = $derived(memoryManager.memories);
  const hasMemories = $derived(memories.length > 0);

  // Group memories by year
  const memoriesByYear = $derived.by(() => {
    const grouped = new Map<number, typeof memories>();
    for (const memory of memories) {
      const year = new Date(memory.memoryAt).getFullYear();
      if (!grouped.has(year)) grouped.set(year, []);
      grouped.get(year)!.push(memory);
    }
    return [...grouped.entries()].sort((a, b) => b[0] - a[0]);
  });
</script>

<UserPageLayout title={data.meta.title}>
  <div class="m-auto w-full max-w-6xl px-4">
    {#if hasMemories}
      <!-- Index bar for quick navigation -->
      <MemoriesIndexBar years={memoriesByYear.map(([year]) => year)} />

      <!-- Memory cards grouped by year -->
      {#each memoriesByYear as [year, yearMemories] (year)}
        <section id="year-{year}" class="mb-8">
          <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            {year}
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {#each yearMemories as memory (memory.id)}
              <MemoryCard {memory} />
            {/each}
          </div>
        </section>
      {/each}
    {:else}
      <MemoriesEmptyState />
    {/if}
  </div>
</UserPageLayout>
