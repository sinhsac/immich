// FORK: Storage Analytics cache table
import {
    Column,
    CreateDateColumn,
    ForeignKeyColumn,
    Generated,
    PrimaryGeneratedColumn,
    Table,
    Timestamp,
} from '@immich/sql-tools';
import { UserTable } from 'src/schema/tables/user.table';

@Table('ext_storage_analytics_cache')
export class ExtStorageAnalyticsCacheTable {
  @PrimaryGeneratedColumn('uuid')
  id!: Generated<string>;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  userId!: string;

  @Column()
  type!: string; // 'overview', 'by_period', 'by_type', 'duplicates', 'quality'

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @CreateDateColumn()
  computedAt!: Generated<Timestamp>;
}
