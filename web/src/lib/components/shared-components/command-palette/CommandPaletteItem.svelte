<script lang="ts">
  import { Icon } from '@immich/ui';

  type CommandItem = {
    id: string;
    label: string;
    icon: string;
    category: 'navigation' | 'action' | 'search';
    action: () => void | Promise<void>;
    keywords?: string[];
    description?: string;
  };

  let { cmd, isSelected, dataIndex, onselect, onhover }: {
    cmd: CommandItem;
    isSelected: boolean;
    dataIndex: number;
    onselect: () => void;
    onhover: () => void;
  } = $props();

  const categoryColors: Record<string, string> = {
    navigation: 'text-blue-500',
    action: 'text-green-500',
    search: 'text-purple-500',
  };
</script>

<button
  type="button"
  id={cmd.id}
  role="option"
  aria-selected={isSelected}
  data-index={dataIndex}
  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors
    {isSelected ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
  onclick={onselect}
  onmouseenter={onhover}
>
  <Icon icon={cmd.icon} size="18" class={categoryColors[cmd.category] ?? 'text-gray-500'} />
  <div class="flex flex-1 flex-col">
    <span class="font-medium text-gray-900 dark:text-white">{cmd.label}</span>
    {#if cmd.description}
      <span class="text-xs text-gray-500 dark:text-gray-400">{cmd.description}</span>
    {/if}
  </div>
  <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] capitalize text-gray-500 dark:bg-gray-700 dark:text-gray-400">
    {cmd.category}
  </span>
</button>
