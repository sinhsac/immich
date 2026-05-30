<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { Route } from '$lib/route';
  import { mdiMapMarkerMultiple } from '@mdi/js';
  import { Icon } from '@immich/ui';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const extensions = [
    { title: 'Heatmap', description: 'Photo density heatmap by location', icon: mdiMapMarkerMultiple, href: Route.heatmap() },
  ];
</script>

<UserPageLayout title={data.meta.title}>
  <div class="p-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {#each extensions as ext}
      <a
        href={ext.href}
        class="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Icon icon={ext.icon} size="2rem" class="text-immich-primary" />
        <div class="text-center">
          <p class="font-semibold">{ext.title}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{ext.description}</p>
        </div>
      </a>
    {/each}
  </div>
</UserPageLayout>
