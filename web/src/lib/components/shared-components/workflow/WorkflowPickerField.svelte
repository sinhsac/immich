<!--
  FORK: Picker field component for workflow configuration.
  Provides a searchable dropdown for selecting items (albums, tags, people, etc.)
-->
<script lang="ts">
  import { Icon, Text } from '@immich/ui';
  import { mdiChevronDown, mdiClose, mdiMagnify } from '@mdi/js';
  import { t } from 'svelte-i18n';

  export type PickerOption = {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    thumbnail?: string;
  };

  type Props = {
    label: string;
    placeholder?: string;
    options: PickerOption[];
    selected: PickerOption[];
    multiple?: boolean;
    searchable?: boolean;
    onselect?: (option: PickerOption) => void;
    onremove?: (option: PickerOption) => void;
  };

  let {
    label,
    placeholder = 'Select...',
    options,
    selected = $bindable([]),
    multiple = false,
    searchable = true,
    onselect,
    onremove,
  }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');

  const filteredOptions = $derived.by(() => {
    const selectedIds = new Set(selected.map((s) => s.id));
    let filtered = options.filter((opt) => !selectedIds.has(opt.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (opt) => opt.label.toLowerCase().includes(q) || opt.description?.toLowerCase().includes(q),
      );
    }
    return filtered;
  });

  function handleSelect(option: PickerOption) {
    if (multiple) {
      selected = [...selected, option];
    } else {
      selected = [option];
      isOpen = false;
    }
    onselect?.(option);
    searchQuery = '';
  }

  function handleRemove(option: PickerOption) {
    selected = selected.filter((s) => s.id !== option.id);
    onremove?.(option);
  }

  function toggleDropdown() {
    isOpen = !isOpen;
    if (!isOpen) searchQuery = '';
  }
</script>

<div class="relative flex flex-col gap-1">
  <Text size="small" fontWeight="medium" class="text-gray-700 dark:text-gray-300">{label}</Text>

  <!-- Selected items / trigger -->
  <button
    type="button"
    class="flex min-h-[38px] w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-immich-dark-gray dark:hover:border-gray-500"
    onclick={toggleDropdown}
  >
    {#if selected.length === 0}
      <span class="text-gray-400">{placeholder}</span>
    {:else}
      {#each selected as item (item.id)}
        <span class="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
          {item.label}
          {#if multiple}
            <button
              type="button"
              class="ml-0.5 hover:text-red-500"
              onclick={(e) => { e.stopPropagation(); handleRemove(item); }}
            >
              <Icon icon={mdiClose} size="12" />
            </button>
          {/if}
        </span>
      {/each}
    {/if}
    <Icon icon={mdiChevronDown} size="16" class="ml-auto text-gray-400" />
  </button>

  <!-- Dropdown -->
  {#if isOpen}
    <div class="absolute top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-immich-dark-gray">
      {#if searchable}
        <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
          <Icon icon={mdiMagnify} size="16" class="text-gray-400" />
          <input
            type="text"
            class="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-white"
            placeholder="Search..."
            bind:value={searchQuery}
          />
        </div>
      {/if}

      <div class="max-h-48 overflow-y-auto p-1">
        {#if filteredOptions.length === 0}
          <div class="px-3 py-2 text-center text-sm text-gray-500">No options available</div>
        {:else}
          {#each filteredOptions as option (option.id)}
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              onclick={() => handleSelect(option)}
            >
              {#if option.thumbnail}
                <img src={option.thumbnail} alt="" class="h-6 w-6 rounded-full object-cover" />
              {:else if option.icon}
                <Icon icon={option.icon} size="16" class="text-gray-500" />
              {/if}
              <div class="flex flex-col">
                <span class="text-gray-900 dark:text-white">{option.label}</span>
                {#if option.description}
                  <span class="text-xs text-gray-500">{option.description}</span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
