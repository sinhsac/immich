<!--
  FORK: Video Trim Editor component for trimming videos in the asset viewer.
  Provides a timeline scrubber with start/end markers for selecting trim range.
-->
<script lang="ts">
  import { Icon, Button } from '@immich/ui';
  import { mdiContentCut, mdiPlay, mdiPause, mdiUndo } from '@mdi/js';
  import { onMount, onDestroy } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    videoElement: HTMLVideoElement | null;
    duration: number;
    assetId: string;
    onTrim?: (startTime: number, endTime: number) => void;
    onCancel?: () => void;
  };

  let { videoElement, duration, assetId, onTrim, onCancel }: Props = $props();

  let startTime = $state(0);
  let endTime = $state(duration);
  let currentTime = $state(0);
  let isPlaying = $state(false);
  let isDragging = $state<'start' | 'end' | 'playhead' | null>(null);
  let timelineElement = $state<HTMLDivElement>();

  // Derived values
  const startPercent = $derived((startTime / duration) * 100);
  const endPercent = $derived((endTime / duration) * 100);
  const currentPercent = $derived((currentTime / duration) * 100);
  const trimDuration = $derived(endTime - startTime);

  $effect(() => {
    endTime = duration;
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  }

  function handleTimelineClick(event: MouseEvent) {
    if (!timelineElement || isDragging) return;
    const rect = timelineElement.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const time = percent * duration;

    if (videoElement) {
      videoElement.currentTime = time;
      currentTime = time;
    }
  }

  function handleMarkerDragStart(marker: 'start' | 'end' | 'playhead') {
    return (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      isDragging = marker;
    };
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging || !timelineElement) return;

    const rect = timelineElement.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const time = percent * duration;

    switch (isDragging) {
      case 'start':
        startTime = Math.min(time, endTime - 0.1);
        break;
      case 'end':
        endTime = Math.max(time, startTime + 0.1);
        break;
      case 'playhead':
        currentTime = time;
        if (videoElement) videoElement.currentTime = time;
        break;
    }
  }

  function handleMouseUp() {
    isDragging = null;
  }

  function togglePlayback() {
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      // Start from trim start if before it
      if (videoElement.currentTime < startTime || videoElement.currentTime >= endTime) {
        videoElement.currentTime = startTime;
      }
      videoElement.play();
    }
    isPlaying = !isPlaying;
  }

  function handleTrim() {
    onTrim?.(startTime, endTime);
  }

  function handleReset() {
    startTime = 0;
    endTime = duration;
    if (videoElement) {
      videoElement.currentTime = 0;
      currentTime = 0;
    }
  }

  // Sync with video element
  let animationFrame: number;

  function syncWithVideo() {
    if (videoElement) {
      currentTime = videoElement.currentTime;
      isPlaying = !videoElement.paused;

      // Stop at end marker
      if (isPlaying && currentTime >= endTime) {
        videoElement.pause();
        videoElement.currentTime = endTime;
        isPlaying = false;
      }
    }
    animationFrame = requestAnimationFrame(syncWithVideo);
  }

  onMount(() => {
    animationFrame = requestAnimationFrame(syncWithVideo);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrame);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });
</script>

<div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-immich-dark-bg">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Icon icon={mdiContentCut} size="18" class="text-immich-primary" />
      <span class="text-sm font-medium dark:text-white">Trim Video</span>
    </div>
    <span class="text-xs text-gray-500 dark:text-gray-400">
      Duration: {formatTime(trimDuration)}
    </span>
  </div>

  <!-- Timeline -->
  <div class="relative">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={timelineElement}
      class="relative h-12 cursor-pointer rounded-lg bg-gray-200 dark:bg-gray-700"
      onclick={handleTimelineClick}
    >
      <!-- Selected range highlight -->
      <div
        class="absolute top-0 h-full rounded bg-immich-primary/20"
        style="left: {startPercent}%; width: {endPercent - startPercent}%"
      ></div>

      <!-- Start marker -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute top-0 h-full w-1 cursor-col-resize bg-green-500"
        style="left: {startPercent}%"
        onmousedown={handleMarkerDragStart('start')}
      >
        <div class="absolute -top-1 -left-1.5 h-3 w-4 rounded-t bg-green-500"></div>
        <div class="absolute -bottom-1 -left-1.5 h-3 w-4 rounded-b bg-green-500"></div>
      </div>

      <!-- End marker -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute top-0 h-full w-1 cursor-col-resize bg-red-500"
        style="left: {endPercent}%"
        onmousedown={handleMarkerDragStart('end')}
      >
        <div class="absolute -top-1 -left-1.5 h-3 w-4 rounded-t bg-red-500"></div>
        <div class="absolute -bottom-1 -left-1.5 h-3 w-4 rounded-b bg-red-500"></div>
      </div>

      <!-- Playhead -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute top-0 h-full w-0.5 cursor-col-resize bg-white shadow"
        style="left: {currentPercent}%"
        onmousedown={handleMarkerDragStart('playhead')}
      >
        <div class="absolute -top-2 -left-1.5 h-2 w-4 rounded bg-white shadow"></div>
      </div>
    </div>
  </div>

  <!-- Time labels -->
  <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
    <span class="text-green-600 dark:text-green-400">{formatTime(startTime)}</span>
    <span>{formatTime(currentTime)}</span>
    <span class="text-red-600 dark:text-red-400">{formatTime(endTime)}</span>
  </div>

  <!-- Controls -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Button size="small" variant="ghost" color="secondary" onclick={togglePlayback}>
        <Icon icon={isPlaying ? mdiPause : mdiPlay} size="16" />
        {isPlaying ? 'Pause' : 'Preview'}
      </Button>
      <Button size="small" variant="ghost" color="secondary" onclick={handleReset}>
        <Icon icon={mdiUndo} size="16" />
        Reset
      </Button>
    </div>
    <div class="flex items-center gap-2">
      {#if onCancel}
        <Button size="small" variant="outline" color="secondary" onclick={onCancel}>
          Cancel
        </Button>
      {/if}
      <Button size="small" variant="filled" color="primary" onclick={handleTrim}>
        <Icon icon={mdiContentCut} size="16" />
        Trim
      </Button>
    </div>
  </div>
</div>
