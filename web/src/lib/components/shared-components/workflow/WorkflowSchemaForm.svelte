<!--
  FORK: Schema-driven form component for workflow step configuration.
  Renders form fields dynamically based on a JSON schema definition.
-->
<script lang="ts">
  import { Icon, Button, Input, Switch, Text } from '@immich/ui';
  import { mdiInformationOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  export type SchemaField = {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'array';
    label: string;
    description?: string;
    required?: boolean;
    default?: unknown;
    options?: { label: string; value: string }[];
    placeholder?: string;
  };

  type Props = {
    schema: SchemaField[];
    values: Record<string, unknown>;
    onchange?: (values: Record<string, unknown>) => void;
  };

  let { schema, values = $bindable({}), onchange }: Props = $props();

  function updateValue(key: string, value: unknown) {
    values = { ...values, [key]: value };
    onchange?.(values);
  }
</script>

<div class="flex flex-col gap-4">
  {#each schema as field (field.key)}
    <div class="flex flex-col gap-1">
      <label for="schema-{field.key}" class="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label}
        {#if field.required}
          <span class="text-red-500">*</span>
        {/if}
        {#if field.description}
          <span title={field.description} class="cursor-help">
            <Icon icon={mdiInformationOutline} size="14" class="text-gray-400" />
          </span>
        {/if}
      </label>

      {#if field.type === 'string'}
        <Input
          id="schema-{field.key}"
          placeholder={field.placeholder ?? ''}
          value={String(values[field.key] ?? field.default ?? '')}
          oninput={(e) => updateValue(field.key, e.currentTarget.value)}
        />
      {:else if field.type === 'number'}
        <Input
          id="schema-{field.key}"
          type="number"
          placeholder={field.placeholder ?? ''}
          value={String(values[field.key] ?? field.default ?? '')}
          oninput={(e) => updateValue(field.key, Number(e.currentTarget.value))}
        />
      {:else if field.type === 'boolean'}
        <Switch
          checked={Boolean(values[field.key] ?? field.default ?? false)}
          onchange={(e) => updateValue(field.key, e.currentTarget.checked)}
        />
      {:else if field.type === 'select'}
        <select
          id="schema-{field.key}"
          class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-immich-dark-gray dark:text-white"
          value={String(values[field.key] ?? field.default ?? '')}
          onchange={(e) => updateValue(field.key, e.currentTarget.value)}
        >
          <option value="" disabled>Select...</option>
          {#each field.options ?? [] as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      {:else if field.type === 'array'}
        <textarea
          id="schema-{field.key}"
          class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-immich-dark-gray dark:text-white"
          placeholder="One item per line"
          value={Array.isArray(values[field.key]) ? (values[field.key] as string[]).join('\n') : ''}
          oninput={(e) => updateValue(field.key, e.currentTarget.value.split('\n').filter(Boolean))}
          rows="3"
        ></textarea>
      {/if}

      {#if field.description}
        <Text size="tiny" color="muted">{field.description}</Text>
      {/if}
    </div>
  {/each}
</div>
