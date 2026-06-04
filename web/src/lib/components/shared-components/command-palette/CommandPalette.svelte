<!--
  FORK: Extended Command Palette wrapper
  This component provides additional typed search suggestions and preview
  on top of the existing @immich/ui CommandPaletteProvider.
  It is triggered via Ctrl+Shift+P as a secondary palette with richer features.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { shortcuts } from '$lib/actions/shortcut';
  import { Route } from '$lib/route';
  import { Icon } from '@immich/ui';
  import {
    mdiMagnify,
    mdiImageMultiple,
    mdiAccountGroup,
    mdiCog,
    mdiMap,
    mdiHeart,
    mdiArchive,
    mdiDelete,
    mdiFolder,
    mdiTag,
    mdiAlbum,
    mdiClockOutline,
    mdiViewDashboard,
    mdiAccountCircle,
    mdiTools,
    mdiContentDuplicate,
    mdiImageSizeSelectLarge,
    mdiCrosshairsGps,
    mdiStateMachine,
  } from '@mdi/js';
  import { onMount, tick } from 'svelte';
  import { t } from 'svelte-i18n';
  import CommandPaletteItem from './CommandPaletteItem.svelte';
  import CommandPalettePreview from './CommandPalettePreview.svelte';

  export type CommandItem = {
    id: string;
    label: string;
    icon: string;
    category: 'navigation' | 'action' | 'utility';
    action: () => void | Promise<void>;
    keywords?: string[];
    description?: string;
  };

  let { onclose }: { onclose: () => void } = $props();

  let query = $state('');
  let input = $state<HTMLInputElement>();
  let selectedIndex = $state(0);
  let listElement = $state<HTMLElement>();

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-photos', label: 'Photos', icon: mdiImageMultiple, category: 'navigation', action: () => goto(Route.photos()), keywords: ['timeline', 'home', 'ảnh'], description: 'View your photo timeline' },
    { id: 'nav-explore', label: 'Explore', icon: mdiViewDashboard, category: 'navigation', action: () => goto(Route.explore()), keywords: ['discover', 'browse', 'khám phá'], description: 'Explore your library' },
    { id: 'nav-albums', label: 'Albums', icon: mdiAlbum, category: 'navigation', action: () => goto(Route.albums()), keywords: ['collections', 'album'], description: 'View all albums' },
    { id: 'nav-people', label: 'People', icon: mdiAccountGroup, category: 'navigation', action: () => goto(Route.people()), keywords: ['faces', 'persons', 'người'], description: 'Browse people & faces' },
    { id: 'nav-map', label: 'Map', icon: mdiMap, category: 'navigation', action: () => goto(Route.map()), keywords: ['location', 'places', 'geo', 'bản đồ'], description: 'View photos on map' },
    { id: 'nav-favorites', label: 'Favorites', icon: mdiHeart, category: 'navigation', action: () => goto(Route.favorites()), keywords: ['liked', 'starred', 'yêu thích'], description: 'View favorite photos' },
    { id: 'nav-archive', label: 'Archive', icon: mdiArchive, category: 'navigation', action: () => goto(Route.archive()), keywords: ['hidden', 'lưu trữ'], description: 'View archived photos' },
    { id: 'nav-trash', label: 'Trash', icon: mdiDelete, category: 'navigation', action: () => goto(Route.trash()), keywords: ['deleted', 'bin', 'thùng rác'], description: 'View deleted photos' },
    { id: 'nav-folders', label: 'Folders', icon: mdiFolder, category: 'navigation', action: () => goto(Route.folders()), keywords: ['directory', 'files', 'thư mục'], description: 'Browse by folder' },
    { id: 'nav-tags', label: 'Tags', icon: mdiTag, category: 'navigation', action: () => goto(Route.tags()), keywords: ['labels', 'nhãn'], description: 'Browse by tags' },
    { id: 'nav-memories', label: 'Memories', icon: mdiClockOutline, category: 'navigation', action: () => goto(Route.memories()), keywords: ['remember', 'past', 'kỷ niệm'], description: 'View your memories' },
    { id: 'nav-sharing', label: 'Sharing', icon: mdiAccountGroup, category: 'navigation', action: () => goto(Route.sharing()), keywords: ['shared', 'partners', 'chia sẻ'], description: 'Shared albums & partners' },
    { id: 'nav-settings', label: 'User Settings', icon: mdiAccountCircle, category: 'navigation', action: () => goto(Route.userSettings()), keywords: ['preferences', 'profile', 'cài đặt'], description: 'Your account settings' },
    { id: 'nav-admin', label: 'Administration', icon: mdiCog, category: 'navigation', action: () => goto(Route.systemSettings()), keywords: ['system', 'admin', 'config', 'quản trị'], description: 'System administration' },
    // Utilities
    { id: 'util-duplicates', label: 'Review Duplicates', icon: mdiContentDuplicate, category: 'utility', action: () => goto(Route.duplicatesUtility()), keywords: ['duplicate', 'trùng lặp'], description: 'Find and manage duplicate photos' },
    { id: 'util-large-files', label: 'Large Files', icon: mdiImageSizeSelectLarge, category: 'utility', action: () => goto(Route.largeFileUtility()), keywords: ['big', 'size', 'file lớn'], description: 'Review large files in library' },
    { id: 'util-geolocation', label: 'Geolocation', icon: mdiCrosshairsGps, category: 'utility', action: () => goto(Route.geolocationUtility()), keywords: ['gps', 'location', 'vị trí'], description: 'Manage photo geolocation' },
    { id: 'util-workflows', label: 'Workflows', icon: mdiStateMachine, category: 'utility', action: () => goto(Route.workflows()), keywords: ['automation', 'quy trình'], description: 'Manage automation workflows' },
    // Actions
    { id: 'act-search', label: 'Search Photos', icon: mdiMagnify, category: 'action', action: () => goto(Route.search()), keywords: ['find', 'query', 'tìm kiếm'], description: 'Search your photo library' },
  ];

  const filteredCommands = $derived.by(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((kw) => kw.includes(q)) ?? false;
      const matchDescription = cmd.description?.toLowerCase().includes(q) ?? false;
      return matchLabel || matchKeywords || matchDescription;
    });
  });

  const selectedCommand = $derived(filteredCommands[selectedIndex]);

  function handleSelect(cmd: CommandItem) {
    onclose();
    cmd.action();
  }

  function moveSelection(direction: 1 | -1) {
    const len = filteredCommands.length;
    if (len === 0) return;
    selectedIndex = (selectedIndex + direction + len) % len;
    scrollToSelected();
  }

  function scrollToSelected() {
    tick().then(() => {
      const el = listElement?.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedCommand) {
        handleSelect(selectedCommand);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
    }
  }

  $effect(() => {
    query;
    selectedIndex = 0;
  });

  onMount(() => {
    input?.focus();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-[15vh]"
  role="dialog"
  aria-modal="true"
  aria-label="Command palette"
  onclick={onclose}
  onkeydown={handleKeydown}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-immich-dark-bg"
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Search Input -->
    <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <Icon icon={mdiMagnify} size="20" class="text-gray-400" />
      <input
        bind:this={input}
        bind:value={query}
        type="text"
        class="w-full bg-transparent text-base outline-none placeholder:text-gray-400 dark:text-white"
        placeholder="Type a command or search..."
        aria-label="Command palette search"
        role="combobox"
        aria-expanded="true"
        aria-controls="fork-command-list"
        aria-activedescendant={selectedCommand?.id ?? ''}
      />
      <kbd class="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
        Esc
      </kbd>
    </div>

    <!-- Results -->
    <div class="flex max-h-[400px] min-h-[200px]">
      <!-- Command List -->
      <div
        bind:this={listElement}
        id="fork-command-list"
        role="listbox"
        class="flex-1 overflow-y-auto p-2"
      >
        {#if filteredCommands.length === 0}
          <div class="flex items-center justify-center py-8 text-sm text-gray-500">
            No results found for "{query}"
          </div>
        {:else}
          {#each filteredCommands as cmd, index (cmd.id)}
            <CommandPaletteItem
              {cmd}
              isSelected={index === selectedIndex}
              dataIndex={index}
              onselect={() => handleSelect(cmd)}
              onhover={() => (selectedIndex = index)}
            />
          {/each}
        {/if}
      </div>

      <!-- Preview Panel -->
      {#if selectedCommand}
        <CommandPalettePreview command={selectedCommand} />
      {/if}
    </div>

    <!-- Footer -->
    <div class="flex items-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
      <span class="flex items-center gap-1">
        <kbd class="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">↑↓</kbd> navigate
      </span>
      <span class="flex items-center gap-1">
        <kbd class="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">↵</kbd> select
      </span>
      <span class="flex items-center gap-1">
        <kbd class="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">esc</kbd> close
      </span>
    </div>
  </div>
</div>
