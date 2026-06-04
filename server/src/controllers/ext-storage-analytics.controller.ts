// FORK: Storage Analytics Controller
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CleanupSuggestionsDto,
    DuplicateCandidatesDto,
    QualityAnalysisDto,
    StorageByPeriodDto,
    StorageByPeriodQueryDto,
    StorageByTypeDto,
    StorageOverviewDto,
} from 'src/dtos/ext-storage-analytics.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { ExtStorageAnalyticsService } from 'src/services/ext-storage-analytics.service';

@ApiTags('Storage Analytics (Extension)')
@Controller('ext/storage-analytics')
@Authenticated()
export class ExtStorageAnalyticsController {
  constructor(private service: ExtStorageAnalyticsService) {}

  @Get('overview')
  getOverview(@Auth() auth: AuthDto): Promise<StorageOverviewDto> {
    return this.service.getOverview(auth);
  }

  @Get('by-period')
  getByPeriod(@Auth() auth: AuthDto, @Query() query: StorageByPeriodQueryDto): Promise<StorageByPeriodDto> {
    return this.service.getByPeriod(auth, query.granularity);
  }

  @Get('by-type')
  getByType(@Auth() auth: AuthDto): Promise<StorageByTypeDto> {
    return this.service.getByType(auth);
  }

  @Get('duplicates')
  getDuplicates(@Auth() auth: AuthDto): Promise<DuplicateCandidatesDto> {
    return this.service.getDuplicates(auth);
  }

  @Get('quality')
  getQualityIssues(@Auth() auth: AuthDto): Promise<QualityAnalysisDto> {
    return this.service.getQualityIssues(auth);
  }

  @Get('suggestions')
  getCleanupSuggestions(@Auth() auth: AuthDto): Promise<CleanupSuggestionsDto> {
    return this.service.getCleanupSuggestions(auth);
  }

  @Post('refresh')
  refresh(@Auth() auth: AuthDto): Promise<void> {
    return this.service.refresh(auth);
  }
}
