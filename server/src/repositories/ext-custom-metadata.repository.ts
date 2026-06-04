// FORK: Custom Metadata Repository
import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { ExtCustomFieldValueTable } from 'src/schema/tables/ext-custom-field-value.table';
import { ExtCustomFieldTable } from 'src/schema/tables/ext-custom-field.table';

@Injectable()
export class ExtCustomMetadataRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  // === Field Definitions ===

  async getFields(ownerId: string) {
    return this.db
      .selectFrom('ext_custom_field')
      .selectAll()
      .where('ownerId', '=', ownerId)
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'asc')
      .execute();
  }

  async getFieldById(id: string) {
    return this.db
      .selectFrom('ext_custom_field')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async createField(dto: Insertable<ExtCustomFieldTable>) {
    return this.db
      .insertInto('ext_custom_field')
      .values(dto)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateField(id: string, dto: Updateable<ExtCustomFieldTable>) {
    return this.db
      .updateTable('ext_custom_field')
      .set(dto)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteField(id: string) {
    return this.db
      .deleteFrom('ext_custom_field')
      .where('id', '=', id)
      .execute();
  }

  async getFieldByName(ownerId: string, name: string) {
    return this.db
      .selectFrom('ext_custom_field')
      .selectAll()
      .where('ownerId', '=', ownerId)
      .where('name', '=', name)
      .executeTakeFirst();
  }

  // === Field Values ===

  async getValuesForAsset(assetId: string) {
    return this.db
      .selectFrom('ext_custom_field_value')
      .innerJoin('ext_custom_field', 'ext_custom_field.id', 'ext_custom_field_value.fieldId')
      .selectAll('ext_custom_field_value')
      .select([
        'ext_custom_field.name as fieldName',
        'ext_custom_field.label as fieldLabel',
        'ext_custom_field.type as fieldType',
      ])
      .where('ext_custom_field_value.assetId', '=', assetId)
      .execute();
  }

  async setFieldValue(dto: Insertable<ExtCustomFieldValueTable>) {
    return this.db
      .insertInto('ext_custom_field_value')
      .values(dto)
      .onConflict((oc) =>
        oc.columns(['fieldId', 'assetId']).doUpdateSet((eb) => ({
          textValue: eb.ref('excluded.textValue'),
          numberValue: eb.ref('excluded.numberValue'),
          booleanValue: eb.ref('excluded.booleanValue'),
          dateValue: eb.ref('excluded.dateValue'),
          jsonValue: eb.ref('excluded.jsonValue'),
        })),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async bulkSetFieldValue(assetIds: string[], fieldId: string, values: Partial<Omit<ExtCustomFieldValueTable, 'id' | 'fieldId' | 'assetId' | 'updatedAt'>>) {
    const records = assetIds.map((assetId) => ({
      fieldId,
      assetId,
      ...values,
    }));

    return this.db
      .insertInto('ext_custom_field_value')
      .values(records as Insertable<ExtCustomFieldValueTable>[])
      .onConflict((oc) =>
        oc.columns(['fieldId', 'assetId']).doUpdateSet((eb) => ({
          textValue: eb.ref('excluded.textValue'),
          numberValue: eb.ref('excluded.numberValue'),
          booleanValue: eb.ref('excluded.booleanValue'),
          dateValue: eb.ref('excluded.dateValue'),
          jsonValue: eb.ref('excluded.jsonValue'),
        })),
      )
      .returningAll()
      .execute();
  }

  async deleteFieldValue(fieldId: string, assetId: string) {
    return this.db
      .deleteFrom('ext_custom_field_value')
      .where('fieldId', '=', fieldId)
      .where('assetId', '=', assetId)
      .execute();
  }

  async searchByFieldValues(
    filters: Array<{ fieldId: string; operator: string; value?: unknown }>,
    pagination: { page: number; size: number },
  ) {
    const { page, size } = pagination;
    const offset = (page - 1) * size;

    let query = this.db
      .selectFrom('asset')
      .select(['asset.id as assetId'])
      .distinct();

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const alias = `v${i}` as const;

      query = query.innerJoin(`ext_custom_field_value as ${alias}`, (join) => {
        let j = join.onRef(`${alias}.assetId` as any, '=', 'asset.id').on(`${alias}.fieldId` as any, '=', filter.fieldId);
        return j;
      }) as any;

      // Apply operator-specific conditions
      switch (filter.operator) {
        case 'eq':
          query = query.where(`${alias}.numberValue` as any, '=', filter.value as number) as any;
          break;
        case 'gt':
          query = query.where(`${alias}.numberValue` as any, '>', filter.value as number) as any;
          break;
        case 'gte':
          query = query.where(`${alias}.numberValue` as any, '>=', filter.value as number) as any;
          break;
        case 'lt':
          query = query.where(`${alias}.numberValue` as any, '<', filter.value as number) as any;
          break;
        case 'lte':
          query = query.where(`${alias}.numberValue` as any, '<=', filter.value as number) as any;
          break;
        case 'contains':
          query = query.where(`${alias}.textValue` as any, 'ilike', `%${filter.value}%`) as any;
          break;
        case 'is_null':
          query = query.where(`${alias}.textValue` as any, 'is', null)
            .where(`${alias}.numberValue` as any, 'is', null)
            .where(`${alias}.booleanValue` as any, 'is', null) as any;
          break;
        case 'is_not_null':
          query = query.where((eb: any) =>
            eb.or([
              eb(`${alias}.textValue`, 'is not', null),
              eb(`${alias}.numberValue`, 'is not', null),
              eb(`${alias}.booleanValue`, 'is not', null),
            ]),
          ) as any;
          break;
      }
    }

    const results = await (query as any).limit(size).offset(offset).execute();
    return results.map((r: any) => r.assetId as string);
  }
}
