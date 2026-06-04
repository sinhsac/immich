// FORK: Extended Memory Metadata DTOs
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// === Response DTO for extension API ===
const ExtMemoryMetadataResponseSchema = z
  .object({
    memoryId: z.string().uuid(),
    title: z.string(),
    subCategory: z.string().nullable(),
    titleSource: z.string(),
  })
  .meta({ id: 'ExtMemoryMetadataResponseDto' });

// === Request DTO for bulk fetch ===
const BulkMemoryMetadataRequestSchema = z
  .object({
    memoryIds: z.array(z.string().uuid()).min(1).max(100),
  })
  .meta({ id: 'BulkMemoryMetadataRequestDto' });

// === Export classes ===
export class ExtMemoryMetadataResponseDto extends createZodDto(ExtMemoryMetadataResponseSchema) {}
export class BulkMemoryMetadataRequestDto extends createZodDto(BulkMemoryMetadataRequestSchema) {}

// === Mapper ===
export function mapExtMemoryMetadata(record: any): ExtMemoryMetadataResponseDto {
  return {
    memoryId: record.memoryId,
    title: record.title,
    subCategory: record.subCategory ?? null,
    titleSource: record.titleSource,
  };
}
