<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
  import { themeManager } from '$lib/managers/theme-manager.svelte';
  import { Theme } from '$lib/constants';
  import { mapSettings } from '$lib/stores/preferences.store';
  import { MapLibre, NavigationControl, ScaleControl } from 'svelte-maplibre';
  import type { Map } from 'maplibre-gl';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const theme = $derived($mapSettings.allowDarkMode ? themeManager.value : Theme.LIGHT);
  const styleUrl = $derived(
    theme === Theme.DARK
      ? serverConfigManager.value.mapDarkStyleUrl
      : serverConfigManager.value.mapLightStyleUrl,
  );

  type Point = { lat: number; lng: number; count: number };

  const points: Point[] = data.points;

  const geojson = {
    type: 'FeatureCollection' as const,
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { weight: p.count },
    })),
  };

  // Tính bounds để auto-fit
  const bounds = points.reduce(
    (acc, p) => ({
      minLng: Math.min(acc.minLng, p.lng),
      maxLng: Math.max(acc.maxLng, p.lng),
      minLat: Math.min(acc.minLat, p.lat),
      maxLat: Math.max(acc.maxLat, p.lat),
    }),
    { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity },
  );

  const hasPoints = points.length > 0;

  // Normalize weight: dùng max thực tế thay vì hardcode 100
  const maxCount = hasPoints ? Math.max(...points.map((p) => p.count)) : 1;

  function onMapLoad(map: Map) {
    if (hasPoints) {
      map.fitBounds(
        [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
        { padding: 80, maxZoom: 12, duration: 0 },
      );
    }

    map.addSource('heatmap-source', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap-source',
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, maxCount, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 4],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,   'rgba(0,0,255,0)',
          0.2, 'royalblue',
          0.4, 'cyan',
          0.6, 'lime',
          0.8, 'yellow',
          1,   'red',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 8, 40, 12, 60],
        'heatmap-opacity': 0.85,
      },
    });
  }
</script>

<UserPageLayout title={data.meta.title}>
  <MapLibre
    style={styleUrl}
    class="h-full w-full"
    zoom={2}
    center={[0, 20]}
    attributionControl={false}
    onload={onMapLoad}
  >
    <NavigationControl position="top-left" />
    <ScaleControl />
  </MapLibre>
</UserPageLayout>
