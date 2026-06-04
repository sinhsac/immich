// FORK: Extended Memory Metadata Repository
import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/schema';

export interface UpsertMemoryMetadataData {
  title: string;
  subCategory: string | null;
  titleSource: string;
}

@Injectable()
export class ExtMemoryMetadataRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async upsert(memoryId: string, data: UpsertMemoryMetadataData) {
    return this.db
      .insertInto('ext_memory_metadata')
      .values({
        memoryId,
        title: data.title,
        subCategory: data.subCategory,
        titleSource: data.titleSource,
      })
      .onConflict((oc) =>
        oc.column('memoryId').doUpdateSet(() => ({
          title: data.title,
          subCategory: data.subCategory,
          titleSource: data.titleSource,
          updatedAt: sql`now()`,
        })),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getByMemoryId(memoryId: string) {
    return this.db
      .selectFrom('ext_memory_metadata')
      .selectAll()
      .where('memoryId', '=', memoryId)
      .executeTakeFirst();
  }

  async getByMemoryIds(memoryIds: string[]) {
    if (memoryIds.length === 0) {
      return [];
    }

    return this.db
      .selectFrom('ext_memory_metadata')
      .selectAll()
      .where('memoryId', 'in', memoryIds)
      .execute();
  }

  async getMemoriesWithoutMetadata(memoryIds: string[]) {
    if (memoryIds.length === 0) {
      return [];
    }

    const existing = await this.db
      .selectFrom('ext_memory_metadata')
      .select('memoryId')
      .where('memoryId', 'in', memoryIds)
      .execute();

    const existingIds = new Set(existing.map((r) => r.memoryId));
    return memoryIds.filter((id) => !existingIds.has(id));
  }
}
