// FORK: Storage Analytics DTOs
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// === Overview Response ===
const StorageOverviewSchema = z
  .object({
    totalAssets: z.number(),
    totalSize: z.number(), // bytes
    totalImages: z.number(),
    totalVideos: z.number(),
    totalOther: z.number(),
    averageFileSize: z.number(),
    largestFile: z.object({
      assetId: z.string().uuid(),
      size: z.number(),
      originalFileName: z.string(),
    }).nullable(),
  })
  .meta({ id: 'StorageOverviewDto' });

// === By Period Response ===
const StorageByPeriodItemSchema = z.object({
  period: z.string(), // 'YYYY-MM' or 'YYYY'
  assetCount: z.number(),
  totalSize: z.number(),
  imageCount: z.number(),
  videoCount: z.number(),
});

const StorageByPeriodSchema = z
  .object({
    granularity: z.enum(['month', 'year']),
    items: z.array(StorageByPeriodItemSchema),
  })
  .meta({ id: 'StorageByPeriodDto' });

// === By Type Response ===
const StorageByTypeItemSchema = z.object({
  mimeType: z.string(),
  assetCount: z.number(),
  totalSize: z.number(),
  percentage: z.number(),
});

const StorageByTypeSchema = z
  .object({
    items: z.array(StorageByTypeItemSchema),
  })
  .meta({ id: 'StorageByTypeDto' });

// === Duplicate Candidates ===
const DuplicateCandidateSchema = z.object({
  assetId1: z.string().uuid(),
  assetId2: z.string().uuid(),
  similarity: z.number(),
  reason: z.string(), // 'clip_embedding', 'exact_hash', 'filename'
});

const DuplicateCandidatesSchema = z
  .object({
    candidates: z.array(DuplicateCandidateSchema),
    totalCandidates: z.number(),
  })
  .meta({ id: 'DuplicateCandidatesDto' });

// === Quality Analysis ===
const QualityIssueSchema = z.object({
  assetId: z.string().uuid(),
  originalFileName: z.string(),
  issues: z.array(z.string()), // 'low_resolution', 'high_iso', 'blurry', 'corrupt'
  resolution: z.string().nullable(), // '1920x1080'
});

const QualityAnalysisSchema = z
  .object({
    items: z.array(QualityIssueSchema),
    totalIssues: z.number(),
  })
  .meta({ id: 'QualityAnalysisDto' });

// === Cleanup Suggestions ===
const CleanupSuggestionSchema = z.object({
  category: z.string(), // 'large_videos', 'screenshots', 'duplicates', 'low_quality'
  description: z.string(),
  assetCount: z.number(),
  potentialSavings: z.number(), // bytes
  assetIds: z.array(z.string().uuid()),
});

const CleanupSuggestionsSchema = z
  .object({
    suggestions: z.array(CleanupSuggestionSchema),
    totalPotentialSavings: z.number(),
  })
  .meta({ id: 'CleanupSuggestionsDto' });

// === Query Params ===
const StorageByPeriodQuerySchema = z
  .object({
    granularity: z.enum(['month', 'year']).optional().default('month'),
  })
  .meta({ id: 'StorageByPeriodQueryDto' });

// === Export classes ===
export class StorageOverviewDto extends createZodDto(StorageOverviewSchema) {}
export class StorageByPeriodDto extends createZodDto(StorageByPeriodSchema) {}
export class StorageByPeriodQueryDto extends createZodDto(StorageByPeriodQuerySchema) {}
export class StorageByTypeDto extends createZodDto(StorageByTypeSchema) {}
export class DuplicateCandidatesDto extends createZodDto(DuplicateCandidatesSchema) {}
export class QualityAnalysisDto extends createZodDto(QualityAnalysisSchema) {}
export class CleanupSuggestionsDto extends createZodDto(CleanupSuggestionsSchema) {}
