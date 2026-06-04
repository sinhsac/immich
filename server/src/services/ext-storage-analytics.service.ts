// FORK: Storage Analytics Service
import { Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CleanupSuggestionsDto,
    DuplicateCandidatesDto,
    QualityAnalysisDto,
    StorageByPeriodDto,
    StorageByTypeDto,
    StorageOverviewDto,
} from 'src/dtos/ext-storage-analytics.dto';
import { ExtStorageAnalyticsRepository } from 'src/repositories/ext-storage-analytics.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';

@Injectable()
export class ExtStorageAnalyticsService {
  constructor(
    private repository: ExtStorageAnalyticsRepository,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ExtStorageAnalyticsService.name);
  }

  async getOverview(auth: AuthDto): Promise<StorageOverviewDto> {
    const overview = await this.repository.getOverview(auth.user.id);
    const largestFile = await this.repository.getLargestFile(auth.user.id);

    const totalAssets = Number(overview?.totalAssets ?? 0);
    const totalSize = Number(overview?.totalSize ?? 0);

    return {
      totalAssets,
      totalSize,
      totalImages: Number(overview?.totalImages ?? 0),
      totalVideos: Number(overview?.totalVideos ?? 0),
      totalOther: Number(overview?.totalOther ?? 0),
      averageFileSize: totalAssets > 0 ? Math.round(totalSize / totalAssets) : 0,
      largestFile: largestFile
        ? {
            assetId: largestFile.assetId,
            size: Number(largestFile.size),
            originalFileName: largestFile.originalFileName,
          }
        : null,
    };
  }

  async getByPeriod(auth: AuthDto, granularity: 'month' | 'year' = 'month'): Promise<StorageByPeriodDto> {
    const items = await this.repository.getByPeriod(auth.user.id, granularity);

    return {
      granularity,
      items: items.map((item: any) => ({
        period: item.period,
        assetCount: Number(item.assetCount),
        totalSize: Number(item.totalSize),
        imageCount: Number(item.imageCount),
        videoCount: Number(item.videoCount),
      })),
    };
  }

  async getByType(auth: AuthDto): Promise<StorageByTypeDto> {
    const items = await this.repository.getByType(auth.user.id);
    const totalSize = items.reduce((sum: number, item: any) => sum + Number(item.totalSize), 0);

    return {
      items: items.map((item: any) => ({
        mimeType: item.mimeType || 'unknown',
        assetCount: Number(item.assetCount),
        totalSize: Number(item.totalSize),
        percentage: totalSize > 0 ? Math.round((Number(item.totalSize) / totalSize) * 10000) / 100 : 0,
      })),
    };
  }

  async getDuplicates(auth: AuthDto): Promise<DuplicateCandidatesDto> {
    // For now, return empty - full implementation would use CLIP embeddings
    // This is a placeholder that can be enhanced with similarity search
    return {
      candidates: [],
      totalCandidates: 0,
    };
  }

  async getQualityIssues(auth: AuthDto): Promise<QualityAnalysisDto> {
    const issues = await this.repository.getQualityIssues(auth.user.id);

    return {
      items: issues.map((issue: any) => {
        const issueList: string[] = [];
        const width = Number(issue.width ?? 0);
        const height = Number(issue.height ?? 0);

        if (width * height < 1_000_000 && width > 0) {
          issueList.push('low_resolution');
        }
        if (Number(issue.iso ?? 0) > 6400) {
          issueList.push('high_iso');
        }

        return {
          assetId: issue.assetId,
          originalFileName: issue.originalFileName,
          issues: issueList,
          resolution: width > 0 && height > 0 ? `${width}x${height}` : null,
        };
      }),
      totalIssues: issues.length,
    };
  }

  async getCleanupSuggestions(auth: AuthDto): Promise<CleanupSuggestionsDto> {
    const largeVideos = await this.repository.getLargeVideos(auth.user.id);
    const qualityIssues = await this.repository.getQualityIssues(auth.user.id, 100);

    const suggestions = [];

    if (largeVideos.length > 0) {
      const totalSize = largeVideos.reduce((sum: number, v: any) => sum + Number(v.size), 0);
      suggestions.push({
        category: 'large_videos',
        description: `${largeVideos.length} video(s) larger than 500MB`,
        assetCount: largeVideos.length,
        potentialSavings: totalSize,
        assetIds: largeVideos.map((v: any) => v.assetId),
      });
    }

    if (qualityIssues.length > 0) {
      suggestions.push({
        category: 'low_quality',
        description: `${qualityIssues.length} image(s) with quality issues (low resolution or high noise)`,
        assetCount: qualityIssues.length,
        potentialSavings: 0,
        assetIds: qualityIssues.map((i: any) => i.assetId),
      });
    }

    return {
      suggestions,
      totalPotentialSavings: suggestions.reduce((sum: number, s) => sum + s.potentialSavings, 0),
    };
  }

  async refresh(auth: AuthDto): Promise<void> {
    await this.repository.clearCache(auth.user.id);
    this.logger.log(`Storage analytics cache cleared for user ${auth.user.id}`);
  }
}
