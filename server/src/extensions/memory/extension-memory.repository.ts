import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';
import { ExtMemoryCreateDto, ExtMemoryResponseDto, ExtMemorySearchDto, ExtMemoryUpdateDto } from 'src/extensions/memory/extension-memory.dto';

@Injectable()
export class ExtensionMemoryRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async search(ownerId: string, dto: ExtMemorySearchDto): Promise<ExtMemoryResponseDto[]> {
    const rows = await (this.db as Kysely<any>)
      .selectFrom('extension_memory as m')
      .leftJoin('extension_memory_asset as ma', 'ma.memoryId', 'm.id')
      .select([
        'm.id', 'm.nativeMemoryId', 'm.ownerId', 'm.type', 'm.title', 'm.data',
        'm.coverAssetId', 'm.isSaved', 'm.memoryAt', 'm.showAt',
        'm.hideAt', 'm.seenAt', 'm.createdAt', 'm.updatedAt',
        sql<string[]>`COALESCE(array_agg(ma."assetId") FILTER (WHERE ma."assetId" IS NOT NULL), '{}')`.as('assetIds'),
      ])
      .where('m.ownerId', '=', ownerId)
      .where('m.deletedAt', 'is', null)
      .$if(!!dto.type, (qb) => qb.where('m.type', '=', dto.type!))
      .$if(!!dto.isSaved, (qb) => qb.where('m.isSaved', '=', dto.isSaved!))
      .$if(!!dto.for, (qb) =>
        qb
          .where((eb) => eb.or([eb('m.showAt', 'is', null), eb('m.showAt', '<=', dto.for!)]))
          .where((eb) => eb.or([eb('m.hideAt', 'is', null), eb('m.hideAt', '>=', dto.for!)])),
      )
      .groupBy('m.id')
      .orderBy('m.memoryAt', 'desc')
      .execute();

    return rows as ExtMemoryResponseDto[];
  }

  async get(id: string): Promise<ExtMemoryResponseDto | undefined> {
    const row = await (this.db as Kysely<any>)
      .selectFrom('extension_memory as m')
      .leftJoin('extension_memory_asset as ma', 'ma.memoryId', 'm.id')
      .select([
        'm.id', 'm.nativeMemoryId', 'm.ownerId', 'm.type', 'm.title', 'm.data',
        'm.coverAssetId', 'm.isSaved', 'm.memoryAt', 'm.showAt',
        'm.hideAt', 'm.seenAt', 'm.createdAt', 'm.updatedAt',
        sql<string[]>`COALESCE(array_agg(ma."assetId") FILTER (WHERE ma."assetId" IS NOT NULL), '{}')`.as('assetIds'),
      ])
      .where('m.id', '=', id)
      .where('m.deletedAt', 'is', null)
      .groupBy('m.id')
      .executeTakeFirst();

    return row as ExtMemoryResponseDto | undefined;
  }

  async create(ownerId: string, dto: ExtMemoryCreateDto): Promise<ExtMemoryResponseDto> {
    const { assetIds = [], ...rest } = dto;

    const { id } = await (this.db as Kysely<any>)
      .insertInto('extension_memory')
      .values({
        nativeMemoryId: rest.nativeMemoryId ?? null,
        ownerId,
        type: rest.type,
        title: rest.title,
        data: JSON.stringify(rest.data ?? {}),
        coverAssetId: rest.coverAssetId ?? null,
        isSaved: rest.isSaved ?? false,
        memoryAt: rest.memoryAt,
        showAt: rest.showAt ?? null,
        hideAt: rest.hideAt ?? null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    if (assetIds.length > 0) {
      await (this.db as Kysely<any>)
        .insertInto('extension_memory_asset')
        .values(assetIds.map((assetId) => ({ memoryId: id, assetId })))
        .execute();
    }

    return this.get(id) as Promise<ExtMemoryResponseDto>;
  }

  async update(id: string, dto: ExtMemoryUpdateDto): Promise<ExtMemoryResponseDto> {
    await (this.db as Kysely<any>)
      .updateTable('extension_memory')
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.data !== undefined && { data: JSON.stringify(dto.data) }),
        ...(dto.coverAssetId !== undefined && { coverAssetId: dto.coverAssetId }),
        ...(dto.isSaved !== undefined && { isSaved: dto.isSaved }),
        ...(dto.memoryAt !== undefined && { memoryAt: dto.memoryAt }),
        ...(dto.seenAt !== undefined && { seenAt: dto.seenAt }),
        ...(dto.showAt !== undefined && { showAt: dto.showAt }),
        ...(dto.hideAt !== undefined && { hideAt: dto.hideAt }),
        updatedAt: new Date(),
      })
      .where('id', '=', id)
      .execute();

    return this.get(id) as Promise<ExtMemoryResponseDto>;
  }

  async delete(id: string): Promise<void> {
    await (this.db as Kysely<any>)
      .updateTable('extension_memory')
      .set({ deletedAt: new Date() })
      .where('id', '=', id)
      .execute();
  }

  async addAssets(id: string, assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) return;
    await (this.db as Kysely<any>)
      .insertInto('extension_memory_asset')
      .values(assetIds.map((assetId) => ({ memoryId: id, assetId })))
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  async removeAssets(id: string, assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) return;
    await (this.db as Kysely<any>)
      .deleteFrom('extension_memory_asset')
      .where('memoryId', '=', id)
      .where('assetId', 'in', assetIds)
      .execute();
  }
}
