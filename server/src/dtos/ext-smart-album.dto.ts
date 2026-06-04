// FORK: Smart Album DTOs
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// === Rule Types ===
export enum SmartAlbumRuleType {
  ClipSimilarity = 'clip_similarity',
  Location = 'location',
  DateRange = 'date_range',
  Person = 'person',
  Tag = 'tag',
}

export enum SmartAlbumCategory {
  Travel = 'travel',
  Food = 'food',
  Nature = 'nature',
  Family = 'family',
  Event = 'event',
  Sport = 'sport',
  Art = 'art',
  Pet = 'pet',
  Custom = 'custom',
}

// === Create Smart Album ===
const CreateSmartAlbumSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).nullable().optional(),
    category: z.nativeEnum(SmartAlbumCategory),
    autoRefresh: z.boolean().optional().default(true),
    rules: z.array(
      z.object({
        type: z.nativeEnum(SmartAlbumRuleType),
        config: z.record(z.unknown()),
      }),
    ).min(1),
  })
  .meta({ id: 'CreateSmartAlbumDto' });

// === Update Smart Album ===
const UpdateSmartAlbumSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    category: z.nativeEnum(SmartAlbumCategory).optional(),
    autoRefresh: z.boolean().optional(),
    coverAssetId: z.string().uuid().nullable().optional(),
    rules: z
      .array(
        z.object({
          type: z.nativeEnum(SmartAlbumRuleType),
          config: z.record(z.unknown()),
        }),
      )
      .min(1)
      .optional(),
  })
  .meta({ id: 'UpdateSmartAlbumDto' });

// === Smart Album Response ===
const SmartAlbumRuleResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(SmartAlbumRuleType),
  config: z.record(z.unknown()),
  createdAt: z.string(),
});

const SmartAlbumResponseSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.nativeEnum(SmartAlbumCategory),
    coverAssetId: z.string().uuid().nullable(),
    autoRefresh: z.boolean(),
    lastRefreshedAt: z.string().nullable(),
    assetCount: z.number(),
    rules: z.array(SmartAlbumRuleResponseSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .meta({ id: 'SmartAlbumResponseDto' });

// === Smart Album Assets Response ===
const SmartAlbumWithAssetsResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    assets: z.array(
      z.object({
        assetId: z.string().uuid(),
        score: z.number().nullable(),
      }),
    ),
    totalAssets: z.number(),
  })
  .meta({ id: 'SmartAlbumWithAssetsResponseDto' });

// === Suggestion Response ===
const SmartAlbumSuggestionSchema = z
  .object({
    category: z.nativeEnum(SmartAlbumCategory),
    name: z.string(),
    description: z.string(),
    suggestedRules: z.array(
      z.object({
        type: z.nativeEnum(SmartAlbumRuleType),
        config: z.record(z.unknown()),
      }),
    ),
    estimatedAssetCount: z.number(),
  })
  .meta({ id: 'SmartAlbumSuggestionDto' });

// === Export classes ===
export class CreateSmartAlbumDto extends createZodDto(CreateSmartAlbumSchema) {}
export class UpdateSmartAlbumDto extends createZodDto(UpdateSmartAlbumSchema) {}
export class SmartAlbumResponseDto extends createZodDto(SmartAlbumResponseSchema) {}
export class SmartAlbumWithAssetsResponseDto extends createZodDto(SmartAlbumWithAssetsResponseSchema) {}
export class SmartAlbumSuggestionDto extends createZodDto(SmartAlbumSuggestionSchema) {}

// === Mappers ===
export function mapSmartAlbum(album: any): SmartAlbumResponseDto {
  return {
    id: album.id,
    ownerId: album.ownerId,
    name: album.name,
    description: album.description ?? null,
    category: album.category,
    coverAssetId: album.coverAssetId ?? null,
    autoRefresh: album.autoRefresh ?? true,
    lastRefreshedAt: album.lastRefreshedAt
      ? (album.lastRefreshedAt instanceof Date ? album.lastRefreshedAt.toISOString() : String(album.lastRefreshedAt))
      : null,
    assetCount: album.assetCount ?? 0,
    rules: (album.rules || []).map((rule: any) => ({
      id: rule.id,
      type: rule.type,
      config: rule.config,
      createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : String(rule.createdAt),
    })),
    createdAt: album.createdAt instanceof Date ? album.createdAt.toISOString() : String(album.createdAt),
    updatedAt: album.updatedAt instanceof Date ? album.updatedAt.toISOString() : String(album.updatedAt),
  };
}
