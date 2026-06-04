// FORK: Custom Metadata DTOs
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// === Field Type Enum ===
export enum CustomFieldType {
  Text = 'text',
  Number = 'number',
  Rating = 'rating',
  Select = 'select',
  MultiSelect = 'multi_select',
  Date = 'date',
  Boolean = 'boolean',
  Color = 'color',
}

const CustomFieldTypeSchema = z.nativeEnum(CustomFieldType);

// === Create Field ===
const CreateCustomFieldSchema = z
  .object({
    name: z.string().min(1).max(100).describe('Unique field name (slug)'),
    label: z.string().min(1).max(200).describe('Display label'),
    type: CustomFieldTypeSchema.describe('Field data type'),
    config: z.record(z.unknown()).optional().default({}).describe('Type-specific config (options, min, max, etc.)'),
    sortOrder: z.number().int().optional().default(0),
    required: z.boolean().optional().default(false),
  })
  .meta({ id: 'CreateCustomFieldDto' });

// === Update Field ===
const UpdateCustomFieldSchema = z
  .object({
    label: z.string().min(1).max(200).optional(),
    config: z.record(z.unknown()).optional(),
    sortOrder: z.number().int().optional(),
    required: z.boolean().optional(),
  })
  .meta({ id: 'UpdateCustomFieldDto' });

// === Field Response ===
const CustomFieldResponseSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    name: z.string(),
    label: z.string(),
    type: CustomFieldTypeSchema,
    config: z.record(z.unknown()),
    sortOrder: z.number(),
    required: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .meta({ id: 'CustomFieldResponseDto' });

// === Set Field Value ===
const SetFieldValueSchema = z
  .object({
    fieldId: z.string().uuid(),
    textValue: z.string().nullable().optional(),
    numberValue: z.number().nullable().optional(),
    booleanValue: z.boolean().nullable().optional(),
    dateValue: z.string().nullable().optional(),
    jsonValue: z.unknown().nullable().optional(),
  })
  .meta({ id: 'SetFieldValueDto' });

// === Bulk Set Values ===
const BulkSetFieldValuesSchema = z
  .object({
    values: z.array(SetFieldValueSchema),
  })
  .meta({ id: 'BulkSetFieldValuesDto' });

// === Field Value Response ===
const FieldValueResponseSchema = z
  .object({
    id: z.string().uuid(),
    fieldId: z.string().uuid(),
    assetId: z.string().uuid(),
    textValue: z.string().nullable(),
    numberValue: z.number().nullable(),
    booleanValue: z.boolean().nullable(),
    dateValue: z.string().nullable(),
    jsonValue: z.unknown().nullable(),
    updatedAt: z.string(),
    field: CustomFieldResponseSchema.optional(),
  })
  .meta({ id: 'FieldValueResponseDto' });

// === Bulk Asset Field Set ===
const BulkAssetFieldSetSchema = z
  .object({
    assetIds: z.array(z.string().uuid()).min(1).max(1000),
    fieldId: z.string().uuid(),
    textValue: z.string().nullable().optional(),
    numberValue: z.number().nullable().optional(),
    booleanValue: z.boolean().nullable().optional(),
    dateValue: z.string().nullable().optional(),
    jsonValue: z.unknown().nullable().optional(),
  })
  .meta({ id: 'BulkAssetFieldSetDto' });

// === Search by Custom Fields ===
const CustomFieldSearchSchema = z
  .object({
    filters: z.array(
      z.object({
        fieldId: z.string().uuid(),
        operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_null', 'is_not_null']),
        value: z.unknown().optional(),
      }),
    ),
    page: z.number().int().min(1).optional().default(1),
    size: z.number().int().min(1).max(1000).optional().default(100),
  })
  .meta({ id: 'CustomFieldSearchDto' });

// === Export classes ===
export class CreateCustomFieldDto extends createZodDto(CreateCustomFieldSchema) {}
export class UpdateCustomFieldDto extends createZodDto(UpdateCustomFieldSchema) {}
export class CustomFieldResponseDto extends createZodDto(CustomFieldResponseSchema) {}
export class SetFieldValueDto extends createZodDto(SetFieldValueSchema) {}
export class BulkSetFieldValuesDto extends createZodDto(BulkSetFieldValuesSchema) {}
export class FieldValueResponseDto extends createZodDto(FieldValueResponseSchema) {}
export class BulkAssetFieldSetDto extends createZodDto(BulkAssetFieldSetSchema) {}
export class CustomFieldSearchDto extends createZodDto(CustomFieldSearchSchema) {}

// === Mappers ===
export function mapCustomField(field: any): CustomFieldResponseDto {
  return {
    id: field.id,
    ownerId: field.ownerId,
    name: field.name,
    label: field.label,
    type: field.type,
    config: field.config || {},
    sortOrder: field.sortOrder ?? 0,
    required: field.required ?? false,
    createdAt: field.createdAt instanceof Date ? field.createdAt.toISOString() : String(field.createdAt),
    updatedAt: field.updatedAt instanceof Date ? field.updatedAt.toISOString() : String(field.updatedAt),
  };
}

export function mapFieldValue(value: any): FieldValueResponseDto {
  return {
    id: value.id,
    fieldId: value.fieldId,
    assetId: value.assetId,
    textValue: value.textValue ?? null,
    numberValue: value.numberValue ?? null,
    booleanValue: value.booleanValue ?? null,
    dateValue: value.dateValue ? (value.dateValue instanceof Date ? value.dateValue.toISOString() : String(value.dateValue)) : null,
    jsonValue: value.jsonValue ?? null,
    updatedAt: value.updatedAt instanceof Date ? value.updatedAt.toISOString() : String(value.updatedAt),
    field: value.field ? mapCustomField(value.field) : undefined,
  };
}
