// FORK: Smart Album rules - define how assets are matched
import {
    Column,
    CreateDateColumn,
    ForeignKeyColumn,
    Generated,
    PrimaryGeneratedColumn,
    Table,
    Timestamp,
} from '@immich/sql-tools';
import { ExtSmartAlbumTable } from 'src/schema/tables/ext-smart-album.table';

@Table('ext_smart_album_rule')
export class ExtSmartAlbumRuleTable {
  @PrimaryGeneratedColumn('uuid')
  id!: Generated<string>;

  @ForeignKeyColumn(() => ExtSmartAlbumTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  smartAlbumId!: string;

  @Column()
  type!: string; // 'clip_similarity', 'location', 'date_range', 'person', 'tag'

  @Column({ type: 'jsonb' })
  config!: Record<string, unknown>; // {"query": "beach vacation", "threshold": 0.25}

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;
}
