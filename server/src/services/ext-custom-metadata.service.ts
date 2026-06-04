// FORK: Custom Metadata Service
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import {
    BulkAssetFieldSetDto,
    BulkSetFieldValuesDto,
    CreateCustomFieldDto,
    CustomFieldResponseDto,
    CustomFieldSearchDto,
    FieldValueResponseDto,
    UpdateCustomFieldDto,
    mapCustomField,
    mapFieldValue,
} from 'src/dtos/ext-custom-metadata.dto';
import { ExtCustomMetadataRepository } from 'src/repositories/ext-custom-metadata.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';

@Injectable()
export class ExtCustomMetadataService {
  constructor(
    private repository: ExtCustomMetadataRepository,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ExtCustomMetadataService.name);
  }

  // === Field Definitions ===

  async getFields(auth: AuthDto): Promise<CustomFieldResponseDto[]> {
    const fields = await this.repository.getFields(auth.user.id);
    return fields.map(mapCustomField);
  }

  async getField(auth: AuthDto, id: string): Promise<CustomFieldResponseDto> {
    const field = await this.repository.getFieldById(id);
    if (!field || field.ownerId !== auth.user.id) {
      throw new BadRequestException('Custom field not found');
    }
    return mapCustomField(field);
  }

  async createField(auth: AuthDto, dto: CreateCustomFieldDto): Promise<CustomFieldResponseDto> {
    const input = dto as any;
    // Check for duplicates
    const existing = await this.repository.getFieldByName(auth.user.id, input.name);
    if (existing) {
      throw new BadRequestException(`A field with name "${input.name}" already exists`);
    }

    const field = await this.repository.createField({
      ownerId: auth.user.id,
      name: input.name,
      label: input.label,
      type: input.type,
      config: input.config ?? {},
      sortOrder: input.sortOrder ?? 0,
      required: input.required ?? false,
    });

    return mapCustomField(field);
  }

  async updateField(auth: AuthDto, id: string, dto: UpdateCustomFieldDto): Promise<CustomFieldResponseDto> {
    const existing = await this.repository.getFieldById(id);
    if (!existing || existing.ownerId !== auth.user.id) {
      throw new BadRequestException('Custom field not found');
    }

    const input = dto as any;
    const field = await this.repository.updateField(id, {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.config !== undefined && { config: input.config }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.required !== undefined && { required: input.required }),
    });

    return mapCustomField(field);
  }

  async deleteField(auth: AuthDto, id: string): Promise<void> {
    const existing = await this.repository.getFieldById(id);
    if (!existing || existing.ownerId !== auth.user.id) {
      throw new BadRequestException('Custom field not found');
    }

    await this.repository.deleteField(id);
  }

  // === Field Values ===

  async getValuesForAsset(auth: AuthDto, assetId: string): Promise<FieldValueResponseDto[]> {
    const values = await this.repository.getValuesForAsset(assetId);
    return values.map(mapFieldValue);
  }

  async setValuesForAsset(auth: AuthDto, assetId: string, dto: BulkSetFieldValuesDto): Promise<FieldValueResponseDto[]> {
    const input = dto as any;
    const results: FieldValueResponseDto[] = [];

    for (const valueDto of input.values) {
      // Verify field belongs to user
      const field = await this.repository.getFieldById(valueDto.fieldId);
      if (!field || field.ownerId !== auth.user.id) {
        throw new BadRequestException(`Field ${valueDto.fieldId} not found`);
      }

      const value = await this.repository.setFieldValue({
        fieldId: valueDto.fieldId,
        assetId,
        textValue: valueDto.textValue ?? null,
        numberValue: valueDto.numberValue ?? null,
        booleanValue: valueDto.booleanValue ?? null,
        dateValue: valueDto.dateValue ?? null,
        jsonValue: valueDto.jsonValue ?? null,
      });

      results.push(mapFieldValue(value));
    }

    return results;
  }

  async bulkSetFieldValue(auth: AuthDto, dto: BulkAssetFieldSetDto): Promise<{ count: number }> {
    const input = dto as any;
    // Verify field belongs to user
    const field = await this.repository.getFieldById(input.fieldId);
    if (!field || field.ownerId !== auth.user.id) {
      throw new BadRequestException('Custom field not found');
    }

    const results = await this.repository.bulkSetFieldValue(input.assetIds, input.fieldId, {
      textValue: input.textValue ?? null,
      numberValue: input.numberValue ?? null,
      booleanValue: input.booleanValue ?? null,
      dateValue: input.dateValue ?? null,
      jsonValue: input.jsonValue ?? null,
    });

    return { count: results.length };
  }

  async searchByFields(auth: AuthDto, dto: CustomFieldSearchDto): Promise<string[]> {
    const input = dto as any;
    return this.repository.searchByFieldValues(input.filters, { page: input.page ?? 1, size: input.size ?? 100 });
  }
}
