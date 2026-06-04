<!--
  FORK: Memory card component for the memories grid page.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import { Route } from '$lib/route';
  import type { MemoryResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiImageMultiple, mdiHeart, mdiHeartOutline } from '@mdi/js';
  import { memoryManager } from '$lib/managers/memory-manager.svelte';

  type Props = {
    memory: MemoryResponseDto;
  };

  let { memory }: Props = $props();

  const coverAsset = $derived(memory.assets[0]);
  const assetCount = $derived(memory.assets.length);
  const memoryDate = $derived(new Date(memory.memoryAt));
  const formattedDate = $derived(
    memoryDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
  );
  const yearsAgo = $derived(new Date().getFullYear() - memoryDate.getFullYear());

  function handleClick() {
    goto(Route.memories({ id: memory.id }));
  }

  async function toggleSaved(event: MouseEvent) {
    event.stopPropagation();
    await memoryManager.updateMemorySaved(memory.id, !memory.isSaved);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-immich-dark-gray"
  onclick={handleClick}
>
  <!-- Cover Image -->
  <div class="relative aspect-[4/3] overflow-hidden">
    {#if coverAsset}
      <img
        src={getAssetThumbnailUrl(coverAsset.id)}
        alt={memory.data?.description ?? 'Memory'}
        class="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
    {:else}
      <div class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
        <Icon icon={mdiImageMultiple} size="48" class="text-gray-300" />
      </div>
    {/if}

    <!-- Overlay gradient -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

    <!-- Asset count badge -->
    <div class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
      <Icon icon={mdiImageMultiple} size="12" />
      {assetCount}
    </div>

    <!-- Save button -->
    <button
      type="button"
      class="absolute top-2 left-2 rounded-full bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
      onclick={toggleSaved}
      aria-label={memory.isSaved ? 'Unsave memory' : 'Save memory'}
    >
      <Icon icon={memory.isSaved ? mdiHeart : mdiHeartOutline} size="16" class="text-white" />
    </button>

    <!-- Date overlay -->
    <div class="absolute bottom-2 left-3 text-white">
      <p class="text-sm font-semibold">{formattedDate}</p>
      <p class="text-xs opacity-80">{yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago</p>
    </div>
  </div>

  <!-- Description -->
  {#if memory.data?.description}
    <div class="p-3">
      <p class="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
        {memory.data.description}
      </p>
    </div>
  {/if}
</div>
