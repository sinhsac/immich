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

  let { command }: { command: CommandItem } = $props();
</script>

<div class="hidden w-64 border-l border-gray-200 p-4 md:block dark:border-gray-700">
  <div class="flex flex-col items-center gap-3 pt-4">
    <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
      <Icon icon={command.icon} size="24" class="text-immich-primary dark:text-immich-dark-primary" />
    </div>
    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{command.label}</h3>
    {#if command.description}
      <p class="text-center text-xs text-gray-500 dark:text-gray-400">{command.description}</p>
    {/if}
    <span class="mt-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      {command.category}
    </span>
    {#if command.keywords && command.keywords.length > 0}
      <div class="mt-2 flex flex-wrap justify-center gap-1">
        {#each command.keywords as keyword}
          <span class="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400 dark:bg-gray-800 dark:text-gray-500">
            {keyword}
          </span>
        {/each}
      </div>
    {/if}
  </div>
</div>
