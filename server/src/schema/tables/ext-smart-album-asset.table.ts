// FORK: Smart Album to Asset mapping (cached results)
import { Column, ForeignKeyColumn, PrimaryColumn, Table } from '@immich/sql-tools';
import { AssetTable } from 'src/schema/tables/asset.table';
import { ExtSmartAlbumTable } from 'src/schema/tables/ext-smart-album.table';

@Table('ext_smart_album_asset')
export class ExtSmartAlbumAssetTable {
  @PrimaryColumn()
  @ForeignKeyColumn(() => ExtSmartAlbumTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  smartAlbumId!: string;

  @PrimaryColumn()
  @ForeignKeyColumn(() => AssetTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false })
  assetId!: string;

  @Column({ type: 'double precision', nullable: true })
  score!: number | null;
}
