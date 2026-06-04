<!--
  FORK: Classification Settings for image classification in admin panel.
  Allows configuring image classification models, confidence thresholds,
  and category management for automatic photo tagging.
-->
<script lang="ts">
  import SettingAccordion from '$lib/components/shared-components/settings/SettingAccordion.svelte';
  import SettingInputField from '$lib/components/shared-components/settings/SettingInputField.svelte';
  import SettingSwitch from '$lib/components/shared-components/settings/SettingSwitch.svelte';
  import SettingButtonsRow from '$lib/components/shared-components/settings/SystemConfigButtonRow.svelte';
  import SettingSelect from './SettingSelect.svelte';
  import { SettingInputFieldType } from '$lib/constants';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte.js';
  import { systemConfigManager } from '$lib/managers/system-config-manager.svelte.js';
  import { Button, IconButton, Text } from '@immich/ui';
  import { mdiPlus, mdiTrashCanOutline, mdiTagMultiple } from '@mdi/js';
  import { isEqual } from 'lodash-es';
  import { t } from 'svelte-i18n';
  import { fade } from 'svelte/transition';

  // FORK: Classification config type (extends SystemConfig)
  // This will be added to the server config when the backend is implemented.
  // For now, we use a local state that mirrors the expected config shape.
  type ClassificationConfig = {
    enabled: boolean;
    modelName: string;
    minConfidence: number;
    maxLabelsPerAsset: number;
    autoTag: boolean;
    excludedCategories: string[];
    customCategories: string[];
  };

  const disabled = $derived(featureFlagsManager.value.configFile);

  // Default classification config
  let configToEdit = $state<ClassificationConfig>({
    enabled: false,
    modelName: 'microsoft/resnet-50',
    minConfidence: 0.7,
    maxLabelsPerAsset: 5,
    autoTag: true,
    excludedCategories: [],
    customCategories: [],
  });

  let savedConfig = $state<ClassificationConfig>({ ...configToEdit });
  let newExcludedCategory = $state('');
  let newCustomCategory = $state('');

  function addExcludedCategory() {
    if (newExcludedCategory.trim() && !configToEdit.excludedCategories.includes(newExcludedCategory.trim())) {
      configToEdit.excludedCategories = [...configToEdit.excludedCategories, newExcludedCategory.trim()];
      newExcludedCategory = '';
    }
  }

  function removeExcludedCategory(index: number) {
    configToEdit.excludedCategories = configToEdit.excludedCategories.filter((_, i) => i !== index);
  }

  function addCustomCategory() {
    if (newCustomCategory.trim() && !configToEdit.customCategories.includes(newCustomCategory.trim())) {
      configToEdit.customCategories = [...configToEdit.customCategories, newCustomCategory.trim()];
      newCustomCategory = '';
    }
  }

  function removeCustomCategory(index: number) {
    configToEdit.customCategories = configToEdit.customCategories.filter((_, i) => i !== index);
  }

  function handleReset() {
    configToEdit = { ...savedConfig };
  }

  function handleSave() {
    // TODO: Call server API to save classification config
    savedConfig = { ...configToEdit };
    console.log('Classification config saved:', configToEdit);
  }
</script>

<div class="mt-2">
  <div in:fade={{ duration: 500 }}>
    <form autocomplete="off" class="mx-4 mt-4" onsubmit={(event) => event.preventDefault()}>
      <div class="flex flex-col gap-4">
        <SettingSwitch
          title="Image Classification"
          subtitle="Enable automatic image classification using machine learning models. Photos will be analyzed and tagged with detected objects, scenes, and categories."
          {disabled}
          bind:checked={configToEdit.enabled}
        />

        <hr />

        <SettingSelect
          label="Classification Model"
          desc="The model used for image classification. Larger models are more accurate but slower."
          name="classification-model"
          bind:value={configToEdit.modelName}
          options={[
            { value: 'microsoft/resnet-50', text: 'ResNet-50 (Fast, Good accuracy)' },
            { value: 'microsoft/resnet-101', text: 'ResNet-101 (Balanced)' },
            { value: 'google/vit-base-patch16-224', text: 'ViT-Base (High accuracy)' },
            { value: 'google/vit-large-patch16-224', text: 'ViT-Large (Highest accuracy, Slow)' },
            { value: 'openai/clip-vit-base-patch32', text: 'CLIP ViT-B/32 (Multi-modal)' },
          ]}
          disabled={disabled || !configToEdit.enabled}
          isEdited={configToEdit.modelName !== savedConfig.modelName}
        />

        <SettingInputField
          inputType={SettingInputFieldType.NUMBER}
          label="Minimum Confidence"
          description="Only labels with confidence above this threshold will be applied. Higher values mean fewer but more accurate labels."
          bind:value={configToEdit.minConfidence}
          step="0.05"
          min={0.1}
          max={1.0}
          disabled={disabled || !configToEdit.enabled}
          isEdited={configToEdit.minConfidence !== savedConfig.minConfidence}
        />

        <SettingInputField
          inputType={SettingInputFieldType.NUMBER}
          label="Max Labels Per Asset"
          description="Maximum number of classification labels to assign per photo."
          bind:value={configToEdit.maxLabelsPerAsset}
          step="1"
          min={1}
          max={20}
          disabled={disabled || !configToEdit.enabled}
          isEdited={configToEdit.maxLabelsPerAsset !== savedConfig.maxLabelsPerAsset}
        />

        <SettingSwitch
          title="Auto-Tag"
          subtitle="Automatically create tags from classification labels. When enabled, detected categories will be added as tags to the asset."
          disabled={disabled || !configToEdit.enabled}
          bind:checked={configToEdit.autoTag}
        />
      </div>

      <SettingAccordion
        key="excluded-categories"
        title="Excluded Categories"
        subtitle="Categories to exclude from classification results. Useful for filtering out unwanted or irrelevant labels."
      >
        <div class="ms-4 mt-4 flex flex-col gap-3">
          <!-- Existing excluded categories -->
          {#if configToEdit.excludedCategories.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each configToEdit.excludedCategories as category, index (index)}
                <span class="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {category}
                  <button
                    type="button"
                    class="ml-1 hover:text-red-900 dark:hover:text-red-100"
                    onclick={() => removeExcludedCategory(index)}
                    disabled={disabled || !configToEdit.enabled}
                  >
                    ×
                  </button>
                </span>
              {/each}
            </div>
          {/if}

          <!-- Add new excluded category -->
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-immich-dark-gray dark:text-white"
              placeholder="e.g., person, text, screenshot"
              bind:value={newExcludedCategory}
              disabled={disabled || !configToEdit.enabled}
              onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludedCategory())}
            />
            <Button
              size="small"
              variant="outline"
              color="secondary"
              onclick={addExcludedCategory}
              disabled={disabled || !configToEdit.enabled || !newExcludedCategory.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </SettingAccordion>

      <SettingAccordion
        key="custom-categories"
        title="Custom Categories"
        subtitle="Define custom categories for classification. These will be prioritized in the classification results."
      >
        <div class="ms-4 mt-4 flex flex-col gap-3">
          <!-- Existing custom categories -->
          {#if configToEdit.customCategories.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each configToEdit.customCategories as category, index (index)}
                <span class="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {category}
                  <button
                    type="button"
                    class="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                    onclick={() => removeCustomCategory(index)}
                    disabled={disabled || !configToEdit.enabled}
                  >
                    ×
                  </button>
                </span>
              {/each}
            </div>
          {/if}

          <!-- Add new custom category -->
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-immich-dark-gray dark:text-white"
              placeholder="e.g., family, vacation, food"
              bind:value={newCustomCategory}
              disabled={disabled || !configToEdit.enabled}
              onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
            />
            <Button
              size="small"
              variant="outline"
              color="secondary"
              onclick={addCustomCategory}
              disabled={disabled || !configToEdit.enabled || !newCustomCategory.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </SettingAccordion>

      <!-- Save/Reset buttons -->
      <div class="mt-6 flex justify-end gap-2">
        <Button
          variant="outline"
          color="secondary"
          onclick={handleReset}
          disabled={isEqual(configToEdit, savedConfig)}
        >
          Reset
        </Button>
        <Button
          variant="filled"
          color="primary"
          onclick={handleSave}
          disabled={isEqual(configToEdit, savedConfig)}
        >
          Save
        </Button>
      </div>
    </form>
  </div>
</div>
