import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
}

@Injectable()
export class HeatmapService {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async getPoints(userId: string): Promise<HeatmapPoint[]> {
    const rows = await this.db
      .selectFrom('asset_exif')
      .innerJoin('asset', 'asset.id', 'asset_exif.assetId')
      .select([
        sql<number>`ROUND(asset_exif.latitude::numeric, 3)`.as('lat'),
        sql<number>`ROUND(asset_exif.longitude::numeric, 3)`.as('lng'),
        sql<number>`COUNT(*)`.as('count'),
      ])
      .where('asset_exif.latitude', 'is not', null)
      .where('asset_exif.longitude', 'is not', null)
      .where('asset.ownerId', '=', userId)
      .where('asset.deletedAt', 'is', null)
      .groupBy([
        sql`ROUND(asset_exif.latitude::numeric, 3)`,
        sql`ROUND(asset_exif.longitude::numeric, 3)`,
      ])
      .execute();

    return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), count: Number(r.count) }));
  }
}
