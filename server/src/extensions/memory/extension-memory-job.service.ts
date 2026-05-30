import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { DB } from 'src/schema';
import { MemoryType } from 'src/enum';
import { ExtMemoryType } from 'src/extensions/memory/extension-memory.dto';
import { ExtensionMemoryRepository } from 'src/extensions/memory/extension-memory.repository';

interface UserRow { id: string }

@Injectable()
export class ExtensionMemoryJobService {
  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private repo: ExtensionMemoryRepository,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ExtensionMemoryJobService.name);
  }

  // Hàng tuần — Location
  @Cron(CronExpression.EVERY_WEEK)
  async generateLocationMemories() {
    this.logger.log('Generating location memories');
    const users = await this.getUsers();
    await Promise.all(users.map((u) => this.generateLocationForUser(u.id)));
  }

  // Hàng ngày — Album
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateAlbumMemories() {
    this.logger.log('Generating album memories');
    const users = await this.getUsers();
    await Promise.all(users.map((u) => this.generateAlbumForUser(u.id)));
  }

  // Đầu mỗi mùa: 1/3, 1/6, 1/9, 1/12
  @Cron('0 0 1 3,6,9,12 *')
  async generateSeasonMemories() {
    this.logger.log('Generating season memories');
    const users = await this.getUsers();
    await Promise.all(users.map((u) => this.generateSeasonForUser(u.id)));
  }

  // Person được trigger thủ công từ bên ngoài khi có ảnh mới
  async generatePersonMemoriesForUser(ownerId: string) {
    this.logger.log(`Generating person memories for user ${ownerId}`);
    await this.generatePersonForUser(ownerId);
  }

  // --- Location ---
  private async generateLocationForUser(ownerId: string) {
    const rows = await (this.db as Kysely<any>)
      .selectFrom('asset as a')
      .innerJoin('asset_exif as e', 'e.assetId', 'a.id')
      .select([
        'e.city', 'e.country',
        sql<string[]>`array_agg(DISTINCT a.id)`.as('assetIds'),
      ])
      .where('a.ownerId', '=', ownerId)
      .where('a.deletedAt', 'is', null)
      .where((eb) => eb.or([eb('e.city', 'is not', null), eb('e.country', 'is not', null)]))
      .groupBy(['e.city', 'e.country'])
      .having(sql`COUNT(DISTINCT a.id)`, '>=', 3)
      .execute();

    for (const row of rows) {
      const title = [row.city, row.country].filter(Boolean).join(', ');
      await this.upsertMemory({
        ownerId,
        type: ExtMemoryType.Location,
        title,
        data: { city: row.city, country: row.country },
        assetIds: row.assetIds,
        // duplicate key: type + title + owner — location không đổi theo thời gian
        dedupeKey: `${ExtMemoryType.Location}::${title}`,
      });
    }
  }

  // --- Person ---
  private async generatePersonForUser(ownerId: string) {
    const rows = await (this.db as Kysely<any>)
      .selectFrom('person as p')
      .innerJoin('asset_face as f', 'f.personId', 'p.id')
      .innerJoin('asset as a', 'a.id', 'f.assetId')
      .select([
        'p.id as personId',
        'p.name as personName',
        sql<string[]>`array_agg(DISTINCT a.id)`.as('assetIds'),
      ])
      .where('p.ownerId', '=', ownerId)
      .where('p.name', '!=', '')
      .where('p.name', 'is not', null)
      .where('a.deletedAt', 'is', null)
      .groupBy(['p.id', 'p.name'])
      .having(sql`COUNT(DISTINCT a.id)`, '>=', 3)
      .execute();

    for (const row of rows) {
      await this.upsertMemory({
        ownerId,
        type: ExtMemoryType.Person,
        title: row.personName,
        data: { personId: row.personId, personName: row.personName },
        assetIds: row.assetIds,
        // duplicate key: type + personId — mỗi người chỉ có 1 memory
        dedupeKey: `${ExtMemoryType.Person}::${row.personId}`,
      });
    }
  }

  // --- Album ---
  private async generateAlbumForUser(ownerId: string) {
    const rows = await (this.db as Kysely<any>)
      .selectFrom('album as al')
      .innerJoin('album_asset as aa', 'aa.albumId', 'al.id')
      .innerJoin('asset as a', 'a.id', 'aa.assetId')
      .select([
        'al.id as albumId',
        'al.albumName as albumName',
        sql<string[]>`array_agg(DISTINCT a.id)`.as('assetIds'),
      ])
      .where('al.ownerId', '=', ownerId)
      .where('a.deletedAt', 'is', null)
      .groupBy(['al.id', 'al.albumName'])
      .having(sql`COUNT(DISTINCT a.id)`, '>=', 1)
      .execute();

    for (const row of rows) {
      await this.upsertMemory({
        ownerId,
        type: ExtMemoryType.Album,
        title: row.albumName,
        data: { albumId: row.albumId, albumName: row.albumName },
        assetIds: row.assetIds,
        // duplicate key: type + albumId — mỗi album chỉ có 1 memory
        dedupeKey: `${ExtMemoryType.Album}::${row.albumId}`,
      });
    }
  }

  // --- Season ---
  private async generateSeasonForUser(ownerId: string) {
    const SEASON_MONTH: Record<string, number> = { spring: 2, summer: 5, autumn: 8, winter: 11 };
    const MONTH_SEASON: Record<number, string> = {
      12: 'winter', 1: 'winter', 2: 'winter',
      3: 'spring', 4: 'spring', 5: 'spring',
      6: 'summer', 7: 'summer', 8: 'summer',
      9: 'autumn', 10: 'autumn', 11: 'autumn',
    };

    const rows = await (this.db as Kysely<any>)
      .selectFrom('asset as a')
      .select([
        sql<number>`EXTRACT(MONTH FROM a."fileCreatedAt")::int`.as('month'),
        sql<number>`EXTRACT(YEAR FROM a."fileCreatedAt")::int`.as('year'),
        sql<string[]>`array_agg(DISTINCT a.id)`.as('assetIds'),
      ])
      .where('a.ownerId', '=', ownerId)
      .where('a.deletedAt', 'is', null)
      .where('a.fileCreatedAt', 'is not', null)
      .groupBy([sql`EXTRACT(MONTH FROM a."fileCreatedAt")`, sql`EXTRACT(YEAR FROM a."fileCreatedAt")`])
      .having(sql`COUNT(DISTINCT a.id)`, '>=', 5)
      .execute();

    // Group theo season+year
    const grouped = new Map<string, { season: string; year: number; assetIds: string[] }>();
    for (const row of rows) {
      const season = MONTH_SEASON[row.month];
      const key = `${season}-${row.year}`;
      if (!grouped.has(key)) {
        grouped.set(key, { season, year: row.year, assetIds: [] });
      }
      grouped.get(key)!.assetIds.push(...row.assetIds);
    }

    // Chỉ generate cho mùa năm ngoái (tránh generate mùa hiện tại chưa kết thúc)
    const lastYear = new Date().getFullYear() - 1;

    for (const [, group] of grouped) {
      if (group.year !== lastYear) continue;

      const title = `${group.season.charAt(0).toUpperCase() + group.season.slice(1)} ${group.year}`;
      const memoryAt = new Date(group.year, SEASON_MONTH[group.season], 1);

      await this.upsertMemory({
        ownerId,
        type: ExtMemoryType.Season,
        title,
        data: { season: group.season, year: group.year },
        assetIds: group.assetIds,
        memoryAt,
        // duplicate key: type + season + year — mỗi mùa/năm chỉ có 1 memory
        dedupeKey: `${ExtMemoryType.Season}::${group.season}::${group.year}`,
      });
    }
  }

  // --- Upsert với duplicate check ---
  private async upsertMemory({
    ownerId,
    type,
    title,
    data,
    assetIds,
    memoryAt = new Date(),
    dedupeKey,
  }: {
    ownerId: string;
    type: ExtMemoryType;
    title: string;
    data: object;
    assetIds: string[];
    memoryAt?: Date;
    dedupeKey: string;
  }) {
    try {
      // Duplicate check bằng dedupeKey lưu trong data
      const existing = await (this.db as Kysely<any>)
        .selectFrom('extension_memory')
        .select(['id', 'nativeMemoryId'])
        .where('ownerId', '=', ownerId)
        .where('type', '=', type)
        .where(sql`data->>'_dedupeKey'`, '=', dedupeKey)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();

      if (existing) {
        // Cập nhật assets trong cả 2 bảng
        await this.syncAssets(existing.id, existing.nativeMemoryId, assetIds);
        return;
      }

      // Tạo native memory
      const { id: nativeMemoryId } = await (this.db as Kysely<any>)
        .insertInto('memory')
        .values({
          ownerId,
          type: MemoryType.OnThisDay,
          data: JSON.stringify({ year: memoryAt.getFullYear() }),
          isSaved: false,
          memoryAt,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      // Thêm assets vào native memory
      if (assetIds.length > 0) {
        await (this.db as Kysely<any>)
          .insertInto('memory_asset')
          .values(assetIds.map((assetId) => ({ memoriesId: nativeMemoryId, assetId })))
          .onConflict((oc) => oc.doNothing())
          .execute();
      }

      // Tạo extension memory với _dedupeKey trong data
      await this.repo.create(ownerId, {
        type,
        title,
        data: { ...data, _dedupeKey: dedupeKey },
        nativeMemoryId,
        memoryAt,
        assetIds,
      });
    } catch (error) {
      this.logger.error(`Failed to upsert extension memory [${type}] "${title}": ${error}`);
    }
  }

  private async syncAssets(extMemoryId: string, nativeMemoryId: string | null, assetIds: string[]) {
    // Sync extension_memory_asset
    await (this.db as Kysely<any>)
      .deleteFrom('extension_memory_asset')
      .where('memoryId', '=', extMemoryId)
      .execute();

    if (assetIds.length > 0) {
      await (this.db as Kysely<any>)
        .insertInto('extension_memory_asset')
        .values(assetIds.map((assetId) => ({ memoryId: extMemoryId, assetId })))
        .onConflict((oc) => oc.doNothing())
        .execute();
    }

    // Sync native memory_asset
    if (nativeMemoryId) {
      await (this.db as Kysely<any>)
        .deleteFrom('memory_asset')
        .where('memoriesId', '=', nativeMemoryId)
        .execute();

      if (assetIds.length > 0) {
        await (this.db as Kysely<any>)
          .insertInto('memory_asset')
          .values(assetIds.map((assetId) => ({ memoriesId: nativeMemoryId, assetId })))
          .onConflict((oc) => oc.doNothing())
          .execute();
      }
    }
  }

  private async getUsers(): Promise<UserRow[]> {
    return (this.db as Kysely<any>)
      .selectFrom('user')
      .select('id')
      .where('deletedAt', 'is', null)
      .execute();
  }
}
