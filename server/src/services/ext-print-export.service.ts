// FORK: Print-ready Export Service
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CreatePrintExportDto,
    PrintExportJobResponseDto,
    PrintExportStatusDto,
    PrintFormat,
    PrintLayout,
    PrintLayoutPreviewDto,
    PrintSize,
} from 'src/dtos/ext-print-export.dto';
import { CryptoRepository } from 'src/repositories/crypto.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';

// In-memory job store (in production, this would use the database or Redis)
interface ExportJob {
  id: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
  error: string | null;
  config: CreatePrintExportDto;
  createdAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class ExtPrintExportService {
  private jobs: Map<string, ExportJob> = new Map();

  constructor(
    private logger: LoggingRepository,
    private cryptoRepository: CryptoRepository,
  ) {
    this.logger.setContext(ExtPrintExportService.name);
  }

  async getLayouts(): Promise<PrintLayoutPreviewDto> {
    return {
      layouts: [
        {
          layout: PrintLayout.Single,
          name: 'Single Photo',
          description: 'One photo per page, centered with optional border',
          minPhotos: 1,
          maxPhotos: 100,
          supportedSizes: [PrintSize.A4, PrintSize.A3, PrintSize.Letter, PrintSize.Photo4x6, PrintSize.Photo5x7, PrintSize.Photo8x10],
        },
        {
          layout: PrintLayout.Grid2x2,
          name: '2×2 Grid',
          description: 'Four photos arranged in a 2×2 grid per page',
          minPhotos: 1,
          maxPhotos: 100,
          supportedSizes: [PrintSize.A4, PrintSize.A3, PrintSize.Letter, PrintSize.Square10],
        },
        {
          layout: PrintLayout.Grid3x3,
          name: '3×3 Grid',
          description: 'Nine photos arranged in a 3×3 grid per page',
          minPhotos: 1,
          maxPhotos: 100,
          supportedSizes: [PrintSize.A4, PrintSize.A3, PrintSize.Letter],
        },
        {
          layout: PrintLayout.Collage,
          name: 'Collage',
          description: 'Artistic collage layout with varied photo sizes',
          minPhotos: 3,
          maxPhotos: 20,
          supportedSizes: [PrintSize.A4, PrintSize.A3, PrintSize.Letter, PrintSize.Square10],
        },
        {
          layout: PrintLayout.Calendar,
          name: 'Calendar Page',
          description: 'Monthly calendar with a featured photo',
          minPhotos: 1,
          maxPhotos: 12,
          supportedSizes: [PrintSize.A4, PrintSize.A3, PrintSize.Letter],
        },
        {
          layout: PrintLayout.Poster,
          name: 'Poster',
          description: 'Large format poster with optional title',
          minPhotos: 1,
          maxPhotos: 1,
          supportedSizes: [PrintSize.A3, PrintSize.Custom],
        },
        {
          layout: PrintLayout.Photobook,
          name: 'Photobook Spread',
          description: 'Two-page photobook spread',
          minPhotos: 2,
          maxPhotos: 100,
          supportedSizes: [PrintSize.A4, PrintSize.Letter, PrintSize.Square10],
        },
      ],
    };
  }

  async createExportJob(auth: AuthDto, dto: CreatePrintExportDto): Promise<PrintExportJobResponseDto> {
    // Validate layout constraints
    const layouts = (await this.getLayouts()).layouts;
    const layoutConfig = layouts.find((l) => l.layout === dto.layout);

    if (!layoutConfig) {
      throw new BadRequestException(`Invalid layout: ${dto.layout}`);
    }

    if (dto.assetIds.length < layoutConfig.minPhotos) {
      throw new BadRequestException(
        `Layout "${dto.layout}" requires at least ${layoutConfig.minPhotos} photo(s)`,
      );
    }

    if (dto.assetIds.length > layoutConfig.maxPhotos) {
      throw new BadRequestException(
        `Layout "${dto.layout}" supports at most ${layoutConfig.maxPhotos} photo(s)`,
      );
    }

    if (!layoutConfig.supportedSizes.includes(dto.size) && dto.size !== PrintSize.Custom) {
      throw new BadRequestException(
        `Size "${dto.size}" is not supported for layout "${dto.layout}"`,
      );
    }

    if (dto.size === PrintSize.Custom && (!dto.customWidth || !dto.customHeight)) {
      throw new BadRequestException('Custom size requires customWidth and customHeight');
    }

    // Create job
    const jobId = this.cryptoRepository.randomUUID();
    const job: ExportJob = {
      id: jobId,
      userId: auth.user.id,
      status: 'queued',
      progress: 0,
      downloadUrl: null,
      error: null,
      config: dto,
      createdAt: new Date(),
      completedAt: null,
    };

    this.jobs.set(jobId, job);

    // In a full implementation, this would queue a BullMQ job
    // For now, simulate processing
    this.processJob(jobId).catch((error) => {
      this.logger.error(`Export job ${jobId} failed: ${error}`);
    });

    return {
      jobId,
      status: 'queued',
      createdAt: job.createdAt.toISOString(),
    };
  }

  async getJobStatus(auth: AuthDto, jobId: string): Promise<PrintExportStatusDto> {
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== auth.user.id) {
      throw new BadRequestException('Export job not found');
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.downloadUrl,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  // === Private ===

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.progress = 10;

    try {
      // Simulate export processing stages
      // In a real implementation, this would:
      // 1. Fetch asset files from storage
      // 2. Resize/arrange them according to layout
      // 3. Generate PDF/image output
      // 4. Store in temp location and provide download URL

      job.progress = 50;

      // Simulated delay for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      job.progress = 90;

      // Generate a download path (in production, this would be a real file)
      const ext = job.config.format === PrintFormat.Pdf ? 'pdf' : job.config.format === PrintFormat.Png ? 'png' : 'jpg';
      job.downloadUrl = `/api/ext/print-export/${jobId}/download.${ext}`;
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();

      this.logger.log(`Export job ${jobId} completed successfully`);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message || 'Unknown error';
      this.logger.error(`Export job ${jobId} failed: ${error}`);
    }
  }
}
