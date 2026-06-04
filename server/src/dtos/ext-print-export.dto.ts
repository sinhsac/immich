// FORK: Print-ready Export DTOs
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export enum PrintLayout {
  Single = 'single',           // Single photo per page
  Grid2x2 = 'grid_2x2',       // 4 photos in a 2x2 grid
  Grid3x3 = 'grid_3x3',       // 9 photos in a 3x3 grid
  Collage = 'collage',         // Artistic collage layout
  Calendar = 'calendar',       // Calendar page with photo
  Poster = 'poster',           // Large poster format
  Photobook = 'photobook',     // Photobook spread (2 pages)
}

export enum PrintSize {
  A4 = 'A4',                   // 210x297mm
  A3 = 'A3',                   // 297x420mm
  Letter = 'letter',           // 8.5x11"
  Square10 = 'square_10',     // 10x10"
  Photo4x6 = 'photo_4x6',    // 4x6"
  Photo5x7 = 'photo_5x7',    // 5x7"
  Photo8x10 = 'photo_8x10',  // 8x10"
  Custom = 'custom',
}

export enum PrintFormat {
  Pdf = 'pdf',
  Png = 'png',
  Jpeg = 'jpeg',
}

// === Create Export Request ===
const CreatePrintExportSchema = z
  .object({
    assetIds: z.array(z.string().uuid()).min(1).max(100),
    layout: z.nativeEnum(PrintLayout),
    size: z.nativeEnum(PrintSize),
    format: z.nativeEnum(PrintFormat).optional().default(PrintFormat.Pdf),
    dpi: z.number().int().min(72).max(600).optional().default(300),
    title: z.string().max(200).optional(),
    includeDate: z.boolean().optional().default(false),
    includeCaption: z.boolean().optional().default(false),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#ffffff'),
    margin: z.number().min(0).max(50).optional().default(10), // mm
    customWidth: z.number().min(50).max(2000).optional(), // mm, for custom size
    customHeight: z.number().min(50).max(2000).optional(), // mm, for custom size
  })
  .meta({ id: 'CreatePrintExportDto' });

// === Export Job Response ===
const PrintExportJobResponseSchema = z
  .object({
    jobId: z.string().uuid(),
    status: z.enum(['queued', 'processing', 'completed', 'failed']),
    createdAt: z.string(),
  })
  .meta({ id: 'PrintExportJobResponseDto' });

// === Export Status Response ===
const PrintExportStatusSchema = z
  .object({
    jobId: z.string().uuid(),
    status: z.enum(['queued', 'processing', 'completed', 'failed']),
    progress: z.number().min(0).max(100),
    downloadUrl: z.string().nullable(),
    error: z.string().nullable(),
    createdAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .meta({ id: 'PrintExportStatusDto' });

// === Layout Previews ===
const PrintLayoutPreviewSchema = z
  .object({
    layouts: z.array(
      z.object({
        layout: z.nativeEnum(PrintLayout),
        name: z.string(),
        description: z.string(),
        minPhotos: z.number(),
        maxPhotos: z.number(),
        supportedSizes: z.array(z.nativeEnum(PrintSize)),
      }),
    ),
  })
  .meta({ id: 'PrintLayoutPreviewDto' });

// === Export classes ===
export class CreatePrintExportDto extends createZodDto(CreatePrintExportSchema) {}
export class PrintExportJobResponseDto extends createZodDto(PrintExportJobResponseSchema) {}
export class PrintExportStatusDto extends createZodDto(PrintExportStatusSchema) {}
export class PrintLayoutPreviewDto extends createZodDto(PrintLayoutPreviewSchema) {}
