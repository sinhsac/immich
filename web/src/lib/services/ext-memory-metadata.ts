// FORK: Extension service for fetching enriched memory metadata from the ext_memory_metadata table.
// This service calls the /ext/memory-metadata/bulk endpoint and caches results in-memory.

import { getBaseUrl } from '@immich/sdk';

export interface ExtMemoryMetadataDto {
  memoryId: string;
  title: string;
  subCategory: string | null;
  titleSource: string;
}

// FORK: In-memory cache keyed by memoryId for enriched metadata
const metadataCache = new Map<string, ExtMemoryMetadataDto>();

/**
 * Fetches bulk memory metadata from the extension API endpoint.
 * Results are cached in-memory so subsequent calls for the same IDs avoid extra network requests.
 *
 * @param memoryIds - Array of memory UUIDs to fetch metadata for (max 100)
 * @returns Array of metadata DTOs for memories that have enriched metadata
 */
export async function fetchBulkMemoryMetadata(memoryIds: string[]): Promise<ExtMemoryMetadataDto[]> {
  if (memoryIds.length === 0) {
    return [];
  }

  // Determine which IDs are already cached and which need fetching
  const cached: ExtMemoryMetadataDto[] = [];
  const uncachedIds: string[] = [];

  for (const id of memoryIds) {
    const entry = metadataCache.get(id);
    if (entry) {
      cached.push(entry);
    } else {
      uncachedIds.push(id);
    }
  }

  // If all requested IDs are cached, return immediately
  if (uncachedIds.length === 0) {
    return cached;
  }

  // Fetch uncached metadata from the extension API
  const response = await fetch(`${getBaseUrl()}/ext/memory-metadata/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memoryIds: uncachedIds }),
  });

  if (!response.ok) {
    return cached;
  }

  const results: ExtMemoryMetadataDto[] = await response.json();

  // Store fetched results in cache
  for (const item of results) {
    metadataCache.set(item.memoryId, item);
  }

  return [...cached, ...results];
}

/**
 * Gets cached metadata for a single memory ID without making a network request.
 * Returns undefined if the metadata is not in cache.
 */
export function getCachedMemoryMetadata(memoryId: string): ExtMemoryMetadataDto | undefined {
  return metadataCache.get(memoryId);
}

/**
 * Clears the in-memory metadata cache.
 * Useful when metadata may have been updated server-side.
 */
export function clearMemoryMetadataCache(): void {
  metadataCache.clear();
}
