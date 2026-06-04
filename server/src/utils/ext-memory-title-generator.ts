/**
 * FORK: Extended memory metadata title generation utility.
 *
 * Pure function that generates descriptive titles for memories
 * based on asset metadata, using a priority-based strategy:
 * location → people → tags → fallback.
 */

export interface AssetMetadataForEnrichment {
  city: string | null;
  country: string | null;
  personNames: string[];
  tags: string[];
}

export interface EnrichmentResult {
  title: string;
  titleSource: 'location' | 'people' | 'tags' | 'fallback';
  subCategory: string | null;
}

/**
 * Generates a descriptive title for a memory based on its assets' metadata.
 *
 * Priority algorithm:
 * 1. Location: If >50% of assets share the same city, use "city, country" as title.
 * 2. People: If >50% of assets contain the same person(s), use person names as title.
 * 3. Tags: If >50% of assets share the same tag, use that tag as title.
 * 4. Fallback: Use a date-based title.
 *
 * Sub-category classification:
 * - ≥3 distinct cities → 'trip'
 * - People appear in >70% of assets → 'people_highlight'
 * - Otherwise → null
 */
export function generateTitle(assets: AssetMetadataForEnrichment[]): EnrichmentResult {
  if (assets.length === 0) {
    return { title: 'Memory', titleSource: 'fallback', subCategory: null };
  }

  const totalAssets = assets.length;
  const subCategory = classifySubCategory(assets, totalAssets);

  // Priority 1: Location (city)
  const locationResult = tryLocationTitle(assets, totalAssets);
  if (locationResult) {
    return { ...locationResult, subCategory };
  }

  // Priority 2: People
  const peopleResult = tryPeopleTitle(assets, totalAssets);
  if (peopleResult) {
    return { ...peopleResult, subCategory };
  }

  // Priority 3: Tags
  const tagsResult = tryTagsTitle(assets, totalAssets);
  if (tagsResult) {
    return { ...tagsResult, subCategory };
  }

  // Priority 4: Fallback
  return { title: 'Memory', titleSource: 'fallback', subCategory };
}

function tryLocationTitle(
  assets: AssetMetadataForEnrichment[],
  totalAssets: number,
): Omit<EnrichmentResult, 'subCategory'> | null {
  const cityCount = new Map<string, { count: number; country: string | null }>();

  for (const asset of assets) {
    if (asset.city) {
      const existing = cityCount.get(asset.city);
      if (existing) {
        existing.count++;
      } else {
        cityCount.set(asset.city, { count: 1, country: asset.country });
      }
    }
  }

  const majorityThreshold = totalAssets / 2;

  for (const [city, { count, country }] of cityCount) {
    if (count > majorityThreshold) {
      const title = country ? `${city}, ${country}` : city;
      return { title, titleSource: 'location' };
    }
  }

  return null;
}

function tryPeopleTitle(
  assets: AssetMetadataForEnrichment[],
  totalAssets: number,
): Omit<EnrichmentResult, 'subCategory'> | null {
  const personCount = new Map<string, number>();

  for (const asset of assets) {
    for (const name of asset.personNames) {
      personCount.set(name, (personCount.get(name) || 0) + 1);
    }
  }

  const majorityThreshold = totalAssets / 2;

  // Find people who appear in >50% of assets, sorted by frequency (descending)
  const majorityPeople = [...personCount.entries()]
    .filter(([, count]) => count > majorityThreshold)
    .sort((a, b) => b[1] - a[1]);

  if (majorityPeople.length === 0) {
    return null;
  }

  // Use up to 3 people names
  const names = majorityPeople.slice(0, 3).map(([name]) => name);
  const title = formatPeopleTitle(names);
  return { title, titleSource: 'people' };
}

function formatPeopleTitle(names: string[]): string {
  if (names.length === 1) {
    return `Day with ${names[0]}`;
  }
  if (names.length === 2) {
    return `Day with ${names[0]} and ${names[1]}`;
  }
  return `Day with ${names[0]}, ${names[1]} and ${names[2]}`;
}

function tryTagsTitle(
  assets: AssetMetadataForEnrichment[],
  totalAssets: number,
): Omit<EnrichmentResult, 'subCategory'> | null {
  const tagCount = new Map<string, number>();

  for (const asset of assets) {
    for (const tag of asset.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  const majorityThreshold = totalAssets / 2;

  // Find the most frequent tag that appears in >50% of assets
  let bestTag: string | null = null;
  let bestCount = 0;

  for (const [tag, count] of tagCount) {
    if (count > majorityThreshold && count > bestCount) {
      bestTag = tag;
      bestCount = count;
    }
  }

  if (bestTag) {
    return { title: bestTag, titleSource: 'tags' };
  }

  return null;
}

function classifySubCategory(assets: AssetMetadataForEnrichment[], totalAssets: number): string | null {
  // Rule 1: ≥3 distinct cities → 'trip'
  const distinctCities = new Set<string>();
  for (const asset of assets) {
    if (asset.city) {
      distinctCities.add(asset.city);
    }
  }
  if (distinctCities.size >= 3) {
    return 'trip';
  }

  // Rule 2: People in >70% of assets → 'people_highlight'
  let assetsWithPeople = 0;
  for (const asset of assets) {
    if (asset.personNames.length > 0) {
      assetsWithPeople++;
    }
  }
  if (assetsWithPeople / totalAssets > 0.7) {
    return 'people_highlight';
  }

  // Rule 3: Otherwise → null
  return null;
}
