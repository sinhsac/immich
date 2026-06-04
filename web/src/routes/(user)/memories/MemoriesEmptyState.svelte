<!--
  FORK: Empty state for the memories page when no memories exist.
-->
<script lang="ts">
  import { Icon } from '@immich/ui';
  import { mdiClockOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
</script>

<div class="flex flex-col items-center justify-center py-20">
  <div class="mb-4 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
    <Icon icon={mdiClockOutline} size="48" class="text-gray-400" />
  </div>
  <h2 class="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
    No memories yet
  </h2>
  <p class="max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
    Memories are automatically created from your photos taken on this day in previous years.
    Keep uploading photos and check back later!
  </p>
</div>
