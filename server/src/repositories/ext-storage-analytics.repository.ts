// FORK: Storage Analytics Repository
import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';

@Injectable()
export class ExtStorageAnalyticsRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async getOverview(userId: string) {
    const result = await this.db
      .selectFrom('asset')
      .innerJoin('asset_file', 'asset_file.assetId', 'asset.id')
      .select([
        sql<number>`count(distinct asset.id)`.as('totalAssets'),
        sql<number>`coalesce(sum(asset_file."size"), 0)`.as('totalSize'),
        sql<number>`count(distinct asset.id) filter (where asset.type = 'IMAGE')`.as('totalImages'),
        sql<number>`count(distinct asset.id) filter (where asset.type = 'VIDEO')`.as('totalVideos'),
        sql<number>`count(distinct asset.id) filter (where asset.type not in ('IMAGE', 'VIDEO'))`.as('totalOther'),
      ])
      .where('asset.ownerId', '=', userId)
      .where('asset.status', '=', 'active')
      .executeTakeFirst();

    return result;
  }

  async getLargestFile(userId: string) {
    return this.db
      .selectFrom('asset')
      .innerJoin('asset_file', 'asset_file.assetId', 'asset.id')
      .select([
        'asset.id as assetId',
        'asset_file.size',
        'asset.originalFileName',
      ])
      .where('asset.ownerId', '=', userId)
      .where('asset.status', '=', 'active')
      .orderBy('asset_file.size', 'desc')
      .limit(1)
      .executeTakeFirst();
  }

  async getByPeriod(userId: string, granularity: 'month' | 'year') {
    const dateTrunc = granularity === 'month' ? 'month' : 'year';
    const format = granularity === 'month' ? 'YYYY-MM' : 'YYYY';

    return this.db
      .selectFrom('asset')
      .innerJoin('asset_file', 'asset_file.assetId', 'asset.id')
      .select([
        sql<string>`to_char(date_trunc(${sql.lit(dateTrunc)}, asset."createdAt"), ${sql.lit(format)})`.as('period'),
        sql<number>`count(distinct asset.id)`.as('assetCount'),
        sql<number>`coalesce(sum(asset_file."size"), 0)`.as('totalSize'),
        sql<number>`count(distinct asset.id) filter (where asset.type = 'IMAGE')`.as('imageCount'),
        sql<number>`count(distinct asset.id) filter (where asset.type = 'VIDEO')`.as('videoCount'),
      ])
      .where('asset.ownerId', '=', userId)
      .where('asset.status', '=', 'active')
      .groupBy(sql`date_trunc(${sql.lit(dateTrunc)}, asset."createdAt")`)
      .orderBy('period', 'asc')
      .execute();
  }

  async getByType(userId: string) {
    return this.db
      .selectFrom('asset')
      .innerJoin('asset_file', 'asset_file.assetId', 'asset.id')
      .leftJoin('asset_exif', 'asset_exif.assetId', 'asset.id')
      .select([
        sql<string>`coalesce(asset_exif."mimeType", asset.type)`.as('mimeType'),
        sql<number>`count(distinct asset.id)`.as('assetCount'),
        sql<number>`coalesce(sum(asset_file."size"), 0)`.as('totalSize'),
      ])
      .where('asset.ownerId', '=', userId)
      .where('asset.status', '=', 'active')
      .groupBy(sql`coalesce(asset_exif."mimeType", asset.type)`)
      .orderBy('totalSize', 'desc')
      .execute();
  }

  async getQualityIssues(userId: string, limit: number = 50) {
    // Find assets with potential quality issues:
    // - Resolution below 1MP (low quality)
    // - Very high ISO (noisy)
    return this.db
      .selectFrom('asset')
      .innerJoin('asset_exif', 'asset_exif.assetId', 'asset.id')
      .select([
        'asset.id as assetId',
        'asset.originalFileName',
        'asset_exif.exifImageWidth as width',
        'asset_exif.exifImageHeight as height',
        'asset_exif.iso',
      ])
      .where('asset.ownerId', '=', userId)
      .where('asset.status', '=', 'active')
      .where('asset.type', '=', 'IMAGE')
      .where((eb) =>
        eb.or([
          // Low resolution: less than 1MP
          eb(
            sql`coalesce(asset_exif."exifImageWidth", 0) * coalesce(asset_exif."exifImageHeight", 0)`,
            '<',
            1_000_000,
          ),
          // Very high ISO (noisy photos)
          eb('asset_exif.iso', '>', 6400),
        ]),
      )
      .limit(limit)
      .execute();
  }

  async getLargeVideos(userId: string, minSizeBytes: number = 500_000_000) {
    return this.db
      .selectFrom('asset')
      .innerJoin('asset_file', 'asset_file.assetId', 'asset.id')
      .select([
        'asset.id as assetId',
        'asset.originalFileName',
        'asset_file.size',
      ])
      .where('asset.ownerId', '=', userId)
      .where('asset.status', '=', 'active')
      .where('asset.type', '=', 'VIDEO')
      .where('asset_file.size', '>', minSizeBytes)
      .orderBy('asset_file.size', 'desc')
      .limit(50)
      .execute();
  }

  // === Cache ===

  async getCache(userId: string, type: string) {
    return this.db
      .selectFrom('ext_storage_analytics_cache')
      .selectAll()
      .where('userId', '=', userId)
      .where('type', '=', type)
      .executeTakeFirst();
  }

  async setCache(userId: string, type: string, data: Record<string, unknown>) {
    return this.db
      .insertInto('ext_storage_analytics_cache')
      .values({ userId, type, data })
      .onConflict((oc) =>
        oc.columns(['userId', 'type']).doUpdateSet((eb) => ({
          data: eb.ref('excluded.data'),
          computedAt: sql`now()`,
        })),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async clearCache(userId: string) {
    return this.db
      .deleteFrom('ext_storage_analytics_cache')
      .where('userId', '=', userId)
      .execute();
  }
}
