<!--
  FORK: Rotate action for images in asset viewer and timeline.
  Allows rotating images 90° clockwise/counter-clockwise.
-->
<script lang="ts">
  import { updateAsset, type AssetResponseDto } from '@immich/sdk';
  import { IconButton } from '@immich/ui';
  import { mdiRotateLeft, mdiRotateRight } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    asset: AssetResponseDto;
    onrotate?: (asset: AssetResponseDto) => void;
    direction?: 'cw' | 'ccw';
    showLabel?: boolean;
  };

  let { asset, onrotate, direction = 'cw', showLabel = false }: Props = $props();

  let isRotating = $state(false);

  const icon = $derived(direction === 'cw' ? mdiRotateRight : mdiRotateLeft);
  const label = $derived(direction === 'cw' ? $t('rotate_clockwise') : $t('rotate_counter_clockwise'));
  const degrees = $derived(direction === 'cw' ? 90 : -90);

  async function handleRotate() {
    if (isRotating || asset.type !== 'IMAGE') return;

    isRotating = true;
    try {
      // Calculate new orientation
      const currentOrientation = (asset.exifInfo?.orientation ?? 1);
      const newOrientation = calculateNewOrientation(currentOrientation, degrees);

      // Call server API to rotate
      const updated = await updateAsset({
        id: asset.id,
        updateAssetDto: {
          orientation: newOrientation,
        },
      });

      onrotate?.(updated);
    } catch (error) {
      console.error('Failed to rotate asset:', error);
    } finally {
      isRotating = false;
    }
  }

  /**
   * Calculate new EXIF orientation after rotation.
   * EXIF orientation values:
   * 1 = Normal (0°)
   * 6 = Rotated 90° CW
   * 3 = Rotated 180°
   * 8 = Rotated 270° CW (90° CCW)
   */
  function calculateNewOrientation(current: number, rotateDegrees: number): number {
    const orientationMap: Record<number, Record<number, number>> = {
      // current → { degrees → new }
      1: { 90: 6, '-90': 8, 180: 3 },
      6: { 90: 3, '-90': 1, 180: 8 },
      3: { 90: 8, '-90': 6, 180: 1 },
      8: { 90: 1, '-90': 3, 180: 6 },
    };

    return orientationMap[current]?.[rotateDegrees] ?? 6;
  }
</script>

<IconButton
  icon={icon}
  aria-label={label}
  title={label}
  onclick={handleRotate}
  size="medium"
  variant="ghost"
  shape="round"
  color="secondary"
  disabled={isRotating || asset.type !== 'IMAGE'}
/>
