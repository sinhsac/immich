/**
 * FORK: Utility functions for the dedicated memories page.
 * Provides helpers for grouping, filtering, and formatting memories.
 */
import type { MemoryResponseDto } from '@immich/sdk';

export type MemoryGroup = {
  year: number;
  month: number;
  label: string;
  memories: MemoryResponseDto[];
};

/**
 * Groups memories by year and month for display in the memories grid.
 */
export function groupMemoriesByDate(memories: MemoryResponseDto[]): MemoryGroup[] {
  const groups = new Map<string, MemoryGroup>();

  for (const memory of memories) {
    const date = new Date(memory.memoryAt);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!groups.has(key)) {
      const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      groups.set(key, { year, month, label, memories: [] });
    }

    groups.get(key)!.memories.push(memory);
  }

  // Sort by date descending
  return [...groups.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

/**
 * Calculates how many years ago a memory was from today.
 */
export function getYearsAgo(memoryAt: string): number {
  const memoryDate = new Date(memoryAt);
  const now = new Date();
  return now.getFullYear() - memoryDate.getFullYear();
}

/**
 * Formats a memory date for display (e.g., "March 15, 3 years ago").
 */
export function formatMemoryDate(memoryAt: string): string {
  const date = new Date(memoryAt);
  const yearsAgo = getYearsAgo(memoryAt);
  const dateStr = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  if (yearsAgo === 0) return `${dateStr} (this year)`;
  if (yearsAgo === 1) return `${dateStr} (1 year ago)`;
  return `${dateStr} (${yearsAgo} years ago)`;
}

/**
 * Filters memories to only include those with at least one asset.
 */
export function filterEmptyMemories(memories: MemoryResponseDto[]): MemoryResponseDto[] {
  return memories.filter((m) => m.assets.length > 0);
}

/**
 * Gets the cover asset ID for a memory (first asset).
 */
export function getMemoryCoverAssetId(memory: MemoryResponseDto): string | undefined {
  return memory.assets[0]?.id;
}

/**
 * Sorts memories by date, most recent first.
 */
export function sortMemoriesByDate(memories: MemoryResponseDto[], direction: 'asc' | 'desc' = 'desc'): MemoryResponseDto[] {
  return [...memories].sort((a, b) => {
    const dateA = new Date(a.memoryAt).getTime();
    const dateB = new Date(b.memoryAt).getTime();
    return direction === 'desc' ? dateB - dateA : dateA - dateB;
  });
}
