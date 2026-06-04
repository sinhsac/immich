// FORK: Extension table for enriched memory metadata (titles, sub-categories)
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
import { MemoryTable } from 'src/schema/tables/memory.table';

@Table('ext_memory_metadata')
export class ExtMemoryMetadataTable {
  @PrimaryGeneratedColumn('uuid')
  id!: Generated<string>;

  @ForeignKeyColumn(() => MemoryTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false, unique: true })
  memoryId!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  subCategory!: string | null;

  @Column()
  titleSource!: string;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;

  @UpdateDateColumn()
  updatedAt!: Generated<Timestamp>;
}
