<!--
  FORK: Visual trigger card component for workflow configuration.
  Displays the trigger type with icon and description in a card format.
-->
<script lang="ts">
  import { Icon, Text } from '@immich/ui';
  import {
    mdiFlashOutline,
    mdiImagePlus,
    mdiAccountSearch,
    mdiCalendarClock,
    mdiTagPlus,
    mdiUpload,
  } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type TriggerType = 'AssetCreate' | 'PersonRecognized' | 'Scheduled' | 'TagAdded' | 'Upload' | string;

  type Props = {
    trigger: TriggerType;
    selected?: boolean;
    onclick?: () => void;
  };

  let { trigger, selected = false, onclick }: Props = $props();

  const triggerConfig: Record<string, { icon: string; label: string; description: string; color: string }> = {
    AssetCreate: {
      icon: mdiImagePlus,
      label: 'Asset Created',
      description: 'Triggered when a new asset is uploaded or created',
      color: 'text-green-500',
    },
    PersonRecognized: {
      icon: mdiAccountSearch,
      label: 'Person Recognized',
      description: 'Triggered when a face is recognized in a photo',
      color: 'text-blue-500',
    },
    Scheduled: {
      icon: mdiCalendarClock,
      label: 'Scheduled',
      description: 'Triggered on a schedule (cron expression)',
      color: 'text-purple-500',
    },
    TagAdded: {
      icon: mdiTagPlus,
      label: 'Tag Added',
      description: 'Triggered when a tag is added to an asset',
      color: 'text-orange-500',
    },
    Upload: {
      icon: mdiUpload,
      label: 'Upload Complete',
      description: 'Triggered when an upload batch completes',
      color: 'text-cyan-500',
    },
  };

  const config = $derived(triggerConfig[trigger] ?? {
    icon: mdiFlashOutline,
    label: trigger,
    description: 'Custom trigger',
    color: 'text-gray-500',
  });
</script>

<button
  type="button"
  class="flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all
    {selected
      ? 'border-immich-primary bg-immich-primary/5 dark:border-immich-dark-primary dark:bg-immich-dark-primary/10'
      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}"
  {onclick}
>
  <div class="mt-0.5 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
    <Icon icon={config.icon} size="20" class={config.color} />
  </div>
  <div class="flex flex-col gap-0.5">
    <Text fontWeight="medium">{config.label}</Text>
    <Text size="tiny" color="muted">{config.description}</Text>
  </div>
</button>
