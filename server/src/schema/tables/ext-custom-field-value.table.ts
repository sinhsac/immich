// FORK: Custom metadata field values per asset
import {
    Column,
    ForeignKeyColumn,
    Generated,
    PrimaryGeneratedColumn,
    Table,
    Timestamp,
    UpdateDateColumn,
} from '@immich/sql-tools';
import { AssetTable } from 'src/schema/tables/asset.table';
import { ExtCustomFieldTable } from 'src/schema/tables/ext-custom-field.table';

@Table('ext_custom_field_value')
export class ExtCustomFieldValueTable {
  @PrimaryGeneratedColumn('uuid')
  id!: Generated<string>;

  @ForeignKeyColumn(() => ExtCustomFieldTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  fieldId!: string;

  @ForeignKeyColumn(() => AssetTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  assetId!: string;

  @Column({ type: 'text', nullable: true })
  textValue!: string | null;

  @Column({ type: 'double precision', nullable: true })
  numberValue!: number | null;

  @Column({ type: 'boolean', nullable: true })
  booleanValue!: boolean | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dateValue!: Timestamp | null;

  @Column({ type: 'jsonb', nullable: true })
  jsonValue!: unknown | null; // for multi_select, complex types

  @UpdateDateColumn()
  updatedAt!: Generated<Timestamp>;
}
