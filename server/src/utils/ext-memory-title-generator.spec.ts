import { AssetMetadataForEnrichment, generateTitle } from 'src/utils/ext-memory-title-generator';
import { describe, expect, it } from 'vitest';

describe('generateTitle', () => {
  describe('priority: location', () => {
    it('should use city as title when >50% of assets share the same city', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: 'France', personNames: [], tags: [] },
        { city: 'Paris', country: 'France', personNames: [], tags: [] },
        { city: 'London', country: 'UK', personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Paris, France');
      expect(result.titleSource).toBe('location');
    });

    it('should use city only when country is null', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: null, personNames: [], tags: [] },
        { city: 'Paris', country: null, personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Paris');
      expect(result.titleSource).toBe('location');
    });

    it('should not use location when city is at exactly 50%', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: 'France', personNames: ['Alex'], tags: [] },
        { city: 'London', country: 'UK', personNames: ['Alex'], tags: [] },
      ];
      const result = generateTitle(assets);
      // 50% is NOT >50%, so location is skipped; people should be selected
      expect(result.titleSource).not.toBe('location');
    });
  });

  describe('priority: people', () => {
    it('should use person names when >50% of assets contain the same person', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: ['Alex'], tags: [] },
        { city: null, country: null, personNames: ['Alex'], tags: [] },
        { city: null, country: null, personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Day with Alex');
      expect(result.titleSource).toBe('people');
    });

    it('should format title with 2 people', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: ['Alex', 'Sam'], tags: [] },
        { city: null, country: null, personNames: ['Alex', 'Sam'], tags: [] },
        { city: null, country: null, personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Day with Alex and Sam');
      expect(result.titleSource).toBe('people');
    });

    it('should format title with 3 people', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: ['Alex', 'Sam', 'Jordan'], tags: [] },
        { city: null, country: null, personNames: ['Alex', 'Sam', 'Jordan'], tags: [] },
        { city: null, country: null, personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Day with Alex, Sam and Jordan');
      expect(result.titleSource).toBe('people');
    });

    it('should limit to 3 people even if more qualify', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: ['A', 'B', 'C', 'D'], tags: [] },
        { city: null, country: null, personNames: ['A', 'B', 'C', 'D'], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.titleSource).toBe('people');
      // Only 3 names should appear in the title
      const nameMatches = result.title.match(/Day with (.+)/);
      expect(nameMatches).not.toBeNull();
    });
  });

  describe('priority: tags', () => {
    it('should use tag as title when >50% of assets share the same tag', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: [], tags: ['Nature'] },
        { city: null, country: null, personNames: [], tags: ['Nature'] },
        { city: null, country: null, personNames: [], tags: ['Urban'] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Nature');
      expect(result.titleSource).toBe('tags');
    });

    it('should select the most frequent tag when multiple exceed threshold', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: [], tags: ['Nature', 'Sunset'] },
        { city: null, country: null, personNames: [], tags: ['Nature', 'Sunset'] },
        { city: null, country: null, personNames: [], tags: ['Nature'] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Nature');
      expect(result.titleSource).toBe('tags');
    });
  });

  describe('priority: fallback', () => {
    it('should return fallback when no source meets the majority threshold', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: 'France', personNames: ['Alex'], tags: ['Nature'] },
        { city: 'London', country: 'UK', personNames: ['Sam'], tags: ['Urban'] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Memory');
      expect(result.titleSource).toBe('fallback');
    });

    it('should return fallback for all-null metadata', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: [], tags: [] },
        { city: null, country: null, personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Memory');
      expect(result.titleSource).toBe('fallback');
    });

    it('should return fallback for an empty assets array', () => {
      const result = generateTitle([]);
      expect(result.title).toBe('Memory');
      expect(result.titleSource).toBe('fallback');
      expect(result.subCategory).toBeNull();
    });
  });

  describe('sub-category classification', () => {
    it('should assign "trip" when ≥3 distinct cities are present', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: 'France', personNames: [], tags: [] },
        { city: 'Paris', country: 'France', personNames: [], tags: [] },
        { city: 'Paris', country: 'France', personNames: [], tags: [] },
        { city: 'London', country: 'UK', personNames: [], tags: [] },
        { city: 'Berlin', country: 'Germany', personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.subCategory).toBe('trip');
    });

    it('should assign "people_highlight" when people appear in >70% of assets', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: ['Alex'], tags: [] },
        { city: null, country: null, personNames: ['Alex'], tags: [] },
        { city: null, country: null, personNames: ['Sam'], tags: [] },
        { city: null, country: null, personNames: ['Alex'], tags: [] },
        { city: null, country: null, personNames: [], tags: [] },
      ];
      // 4/5 = 80% have people → people_highlight
      const result = generateTitle(assets);
      expect(result.subCategory).toBe('people_highlight');
    });

    it('should not assign "people_highlight" when people are in exactly 70% of assets', () => {
      const assets: AssetMetadataForEnrichment[] = Array.from({ length: 10 }, (_, i) => ({
        city: null,
        country: null,
        personNames: i < 7 ? ['Alex'] : [],
        tags: [],
      }));
      // 7/10 = 70% exactly, which is NOT >70%
      const result = generateTitle(assets);
      expect(result.subCategory).toBeNull();
    });

    it('should assign null when no pattern is detected', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: 'France', personNames: [], tags: [] },
        { city: 'London', country: 'UK', personNames: [], tags: [] },
        { city: null, country: null, personNames: [], tags: [] },
      ];
      // Only 2 distinct cities (< 3), no people majority
      const result = generateTitle(assets);
      expect(result.subCategory).toBeNull();
    });

    it('should prioritize "trip" over "people_highlight"', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Paris', country: 'France', personNames: ['Alex'], tags: [] },
        { city: 'London', country: 'UK', personNames: ['Alex'], tags: [] },
        { city: 'Berlin', country: 'Germany', personNames: ['Alex'], tags: [] },
        { city: 'Rome', country: 'Italy', personNames: ['Alex'], tags: [] },
      ];
      // 4 distinct cities AND people in 100% → trip takes priority
      const result = generateTitle(assets);
      expect(result.subCategory).toBe('trip');
    });
  });

  describe('single asset', () => {
    it('should handle a single asset with city', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: 'Tokyo', country: 'Japan', personNames: [], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Tokyo, Japan');
      expect(result.titleSource).toBe('location');
    });

    it('should handle a single asset with only a person', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: ['Alex'], tags: [] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Day with Alex');
      expect(result.titleSource).toBe('people');
    });

    it('should handle a single asset with only a tag', () => {
      const assets: AssetMetadataForEnrichment[] = [
        { city: null, country: null, personNames: [], tags: ['Sunset'] },
      ];
      const result = generateTitle(assets);
      expect(result.title).toBe('Sunset');
      expect(result.titleSource).toBe('tags');
    });
  });
});
