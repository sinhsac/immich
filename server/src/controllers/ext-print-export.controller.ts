// FORK: Print-ready Export Controller
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    CreatePrintExportDto,
    PrintExportJobResponseDto,
    PrintExportStatusDto,
    PrintLayoutPreviewDto,
} from 'src/dtos/ext-print-export.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { ExtPrintExportService } from 'src/services/ext-print-export.service';
import { UUIDParamDto } from 'src/validation';

@ApiTags('Print Export (Extension)')
@Controller('ext/print-export')
@Authenticated()
export class ExtPrintExportController {
  constructor(private service: ExtPrintExportService) {}

  @Get('layouts')
  getLayouts(): Promise<PrintLayoutPreviewDto> {
    return this.service.getLayouts();
  }

  @Post()
  createExportJob(@Auth() auth: AuthDto, @Body() dto: CreatePrintExportDto): Promise<PrintExportJobResponseDto> {
    return this.service.createExportJob(auth, dto);
  }

  @Get(':id/status')
  getJobStatus(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<PrintExportStatusDto> {
    return this.service.getJobStatus(auth, id);
  }
}
