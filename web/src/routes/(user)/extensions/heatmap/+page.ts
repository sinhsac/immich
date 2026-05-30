import { authenticate } from '$lib/utils/auth';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  await authenticate();

  const response = await fetch('/api/extensions/heatmap/points');
  const points = response.ok ? await response.json() : [];

  return {
    points,
    meta: { title: 'Heatmap' },
  };
};
