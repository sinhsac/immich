// FORK: Smart Album Repository
import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { ExtSmartAlbumRuleTable } from 'src/schema/tables/ext-smart-album-rule.table';
import { ExtSmartAlbumTable } from 'src/schema/tables/ext-smart-album.table';

@Injectable()
export class ExtSmartAlbumRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async getAll(ownerId: string) {
    const albums = await this.db
      .selectFrom('ext_smart_album')
      .selectAll()
      .select((eb) => [
        eb
          .selectFrom('ext_smart_album_asset')
          .select(sql<number>`count(*)`.as('count'))
          .whereRef('ext_smart_album_asset.smartAlbumId', '=', 'ext_smart_album.id')
          .as('assetCount'),
      ])
      .where('ownerId', '=', ownerId)
      .orderBy('createdAt', 'desc')
      .execute();

    // Get rules for each album
    const albumIds = albums.map((a) => a.id);
    const rules = albumIds.length > 0
      ? await this.db
          .selectFrom('ext_smart_album_rule')
          .selectAll()
          .where('smartAlbumId', 'in', albumIds)
          .execute()
      : [];

    return albums.map((album) => ({
      ...album,
      rules: rules.filter((r) => r.smartAlbumId === album.id),
    }));
  }

  async getById(id: string) {
    const album = await this.db
      .selectFrom('ext_smart_album')
      .selectAll()
      .select((eb) => [
        eb
          .selectFrom('ext_smart_album_asset')
          .select(sql<number>`count(*)`.as('count'))
          .whereRef('ext_smart_album_asset.smartAlbumId', '=', 'ext_smart_album.id')
          .as('assetCount'),
      ])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!album) {
      return undefined;
    }

    const rules = await this.db
      .selectFrom('ext_smart_album_rule')
      .selectAll()
      .where('smartAlbumId', '=', id)
      .execute();

    return { ...album, rules };
  }

  async create(dto: Insertable<ExtSmartAlbumTable>) {
    return this.db
      .insertInto('ext_smart_album')
      .values(dto)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, dto: Partial<Insertable<ExtSmartAlbumTable>>) {
    return this.db
      .updateTable('ext_smart_album')
      .set(dto)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(id: string) {
    return this.db
      .deleteFrom('ext_smart_album')
      .where('id', '=', id)
      .execute();
  }

  // === Rules ===

  async createRules(rules: Insertable<ExtSmartAlbumRuleTable>[]) {
    if (rules.length === 0) return [];
    return this.db
      .insertInto('ext_smart_album_rule')
      .values(rules)
      .returningAll()
      .execute();
  }

  async deleteRules(smartAlbumId: string) {
    return this.db
      .deleteFrom('ext_smart_album_rule')
      .where('smartAlbumId', '=', smartAlbumId)
      .execute();
  }

  // === Assets ===

  async getAssets(smartAlbumId: string, limit: number = 100, offset: number = 0) {
    return this.db
      .selectFrom('ext_smart_album_asset')
      .select(['assetId', 'score'])
      .where('smartAlbumId', '=', smartAlbumId)
      .orderBy('score', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();
  }

  async setAssets(smartAlbumId: string, assets: Array<{ assetId: string; score: number | null }>) {
    // Clear existing
    await this.db
      .deleteFrom('ext_smart_album_asset')
      .where('smartAlbumId', '=', smartAlbumId)
      .execute();

    if (assets.length === 0) return;

    // Insert new
    await this.db
      .insertInto('ext_smart_album_asset')
      .values(assets.map((a) => ({ smartAlbumId, assetId: a.assetId, score: a.score })))
      .execute();
  }

  async updateLastRefreshed(id: string) {
    return this.db
      .updateTable('ext_smart_album')
      .set({ lastRefreshedAt: sql`now()` as any })
      .where('id', '=', id)
      .execute();
  }

  // === For background refresh ===

  async getAlbumsForRefresh() {
    return this.db
      .selectFrom('ext_smart_album')
      .selectAll()
      .where('autoRefresh', '=', true)
      .execute();
  }
}
