// FORK: Smart Albums - AI-powered auto-categorized albums
import {
    Column,
    CreateDateColumn,
    ForeignKeyColumn,
    Generated,
    PrimaryGeneratedColumn,
    Table,
    Timestamp,
    UpdateDateColumn,
} from '@immich/sql-tools';
import { AssetTable } from 'src/schema/tables/asset.table';
import { UserTable } from 'src/schema/tables/user.table';

@Table('ext_smart_album')
export class ExtSmartAlbumTable {
  @PrimaryGeneratedColumn('uuid')
  id!: Generated<string>;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  ownerId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string | null;

  @Column()
  category!: string; // 'travel', 'food', 'nature', 'family', 'event', 'custom'

  @ForeignKeyColumn(() => AssetTable, { onDelete: 'SET NULL', onUpdate: 'CASCADE', nullable: true })
  coverAssetId!: string | null;

  @Column({ type: 'boolean', default: true })
  autoRefresh!: Generated<boolean>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastRefreshedAt!: Timestamp | null;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;

  @UpdateDateColumn()
  updatedAt!: Generated<Timestamp>;
}
