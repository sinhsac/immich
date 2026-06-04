// FORK: Custom Metadata Controller
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    BulkAssetFieldSetDto,
    BulkSetFieldValuesDto,
    CreateCustomFieldDto,
    CustomFieldResponseDto,
    CustomFieldSearchDto,
    FieldValueResponseDto,
    UpdateCustomFieldDto,
} from 'src/dtos/ext-custom-metadata.dto';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { ExtCustomMetadataService } from 'src/services/ext-custom-metadata.service';
import { UUIDParamDto } from 'src/validation';

@ApiTags('Custom Metadata (Extension)')
@Controller('ext/custom-fields')
@Authenticated()
export class ExtCustomMetadataController {
  constructor(private service: ExtCustomMetadataService) {}

  @Get()
  getFields(@Auth() auth: AuthDto): Promise<CustomFieldResponseDto[]> {
    return this.service.getFields(auth);
  }

  @Post()
  createField(@Auth() auth: AuthDto, @Body() dto: CreateCustomFieldDto): Promise<CustomFieldResponseDto> {
    return this.service.createField(auth, dto);
  }

  @Get(':id')
  getField(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<CustomFieldResponseDto> {
    return this.service.getField(auth, id);
  }

  @Put(':id')
  updateField(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateCustomFieldDto,
  ): Promise<CustomFieldResponseDto> {
    return this.service.updateField(auth, id, dto);
  }

  @Delete(':id')
  deleteField(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<void> {
    return this.service.deleteField(auth, id);
  }

  // === Field Values ===

  @Get('values/:id')
  getValuesForAsset(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<FieldValueResponseDto[]> {
    return this.service.getValuesForAsset(auth, id);
  }

  @Put('values/:id')
  setValuesForAsset(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: BulkSetFieldValuesDto,
  ): Promise<FieldValueResponseDto[]> {
    return this.service.setValuesForAsset(auth, id, dto);
  }

  // === Bulk Operations ===

  @Post('bulk-set')
  bulkSetFieldValue(@Auth() auth: AuthDto, @Body() dto: BulkAssetFieldSetDto): Promise<{ count: number }> {
    return this.service.bulkSetFieldValue(auth, dto);
  }

  @Post('search')
  searchByFields(@Auth() auth: AuthDto, @Body() dto: CustomFieldSearchDto): Promise<string[]> {
    return this.service.searchByFields(auth, dto);
  }
}
