// FORK: Custom metadata field definitions for extended tagging system
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
import { UserTable } from 'src/schema/tables/user.table';

@Table('ext_custom_field')
export class ExtCustomFieldTable {
  @PrimaryGeneratedColumn('uuid')
  id!: Generated<string>;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  ownerId!: string;

  @Column()
  name!: string;

  @Column()
  label!: string;

  @Column()
  type!: string; // 'text' | 'number' | 'rating' | 'select' | 'multi_select' | 'date' | 'boolean' | 'color'

  @Column({ type: 'jsonb', default: '{}' })
  config!: Generated<Record<string, unknown>>; // {"options": [...], "min": 1, "max": 5}

  @Column({ type: 'integer', default: 0 })
  sortOrder!: Generated<number>;

  @Column({ type: 'boolean', default: false })
  required!: Generated<boolean>;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;

  @UpdateDateColumn()
  updatedAt!: Generated<Timestamp>;
}
