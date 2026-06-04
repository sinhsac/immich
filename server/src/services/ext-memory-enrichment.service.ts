// FORK: Extended Memory Enrichment Service
import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { OnEvent } from 'src/decorators';
import { JobName } from 'src/enum';
import { ArgsOf } from 'src/repositories/event.repository';
import { ExtMemoryMetadataRepository } from 'src/repositories/ext-memory-metadata.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { DB } from 'src/schema';
import { AssetMetadataForEnrichment, generateTitle } from 'src/utils/ext-memory-title-generator';

@Injectable()
export class ExtMemoryEnrichmentService {
  constructor(
    private repository: ExtMemoryMetadataRepository,
    @InjectKysely() private db: Kysely<DB>,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ExtMemoryEnrichmentService.name);
  }

  /**
   * FORK: Post-job hook for memory generation.
   * Listens for the JobComplete event and triggers enrichment when the MemoryGenerate job finishes.
   * Queries all memories without metadata and enriches them.
   */
  @OnEvent({ name: 'JobComplete' })
  async onJobComplete(...[_queueName, job]: ArgsOf<'JobComplete'>): Promise<void> {
    if (job.name !== JobName.MemoryGenerate) {
      return;
    }

    this.logger.log('MemoryGenerate job completed, triggering enrichment for unenriched memories');

    try {
      const memoryIds = await this.getAllMemoryIds();
      if (memoryIds.length === 0) {
        this.logger.debug('No memories found to enrich');
        return;
      }

      await this.enrichMemories(memoryIds);
    } catch (error) {
      this.logger.error(`Failed to run post-memory-generation enrichment: ${error}`);
    }
  }

  /**
   * Gets all memory IDs from the database.
   */
  private async getAllMemoryIds(): Promise<string[]> {
    const rows = await this.db
      .selectFrom('memory')
      .select('id')
      .where('deletedAt', 'is', null)
      .execute();

    return rows.map((row) => row.id);
  }

  /**
   * Enriches memories with descriptive metadata (title, subCategory, titleSource).
   * For each memory, queries associated assets and their EXIF data, faces/people, and tags,
   * then generates a title using the priority-based strategy.
   *
   * Skips memories with zero assets. Catches per-memory errors and continues processing.
   * Uses upsert to ensure idempotent writes (safe to re-run).
   */
  async enrichMemories(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) {
      return;
    }

    // Filter out memories that already have metadata (only enrich new ones)
    const memoriesWithoutMetadata = await this.repository.getMemoriesWithoutMetadata(memoryIds);

    if (memoriesWithoutMetadata.length === 0) {
      this.logger.debug(`All ${memoryIds.length} memories already have metadata, skipping enrichment`);
      return;
    }

    this.logger.log(`Enriching ${memoriesWithoutMetadata.length} memories`);

    for (const memoryId of memoriesWithoutMetadata) {
      try {
        await this.enrichSingleMemory(memoryId);
      } catch (error) {
        this.logger.error(`Failed to enrich memory ${memoryId}: ${error}`);
      }
    }
  }

  /**
   * Re-enriches memories regardless of whether they already have metadata.
   * Useful for updating metadata after changes to assets.
   */
  async reEnrichMemories(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) {
      return;
    }

    this.logger.log(`Re-enriching ${memoryIds.length} memories`);

    for (const memoryId of memoryIds) {
      try {
        await this.enrichSingleMemory(memoryId);
      } catch (error) {
        this.logger.error(`Failed to re-enrich memory ${memoryId}: ${error}`);
      }
    }
  }

  private async enrichSingleMemory(memoryId: string): Promise<void> {
    // Query asset IDs associated with this memory
    const assetIds = await this.getAssetIdsForMemory(memoryId);

    // Skip memories with zero assets
    if (assetIds.length === 0) {
      this.logger.debug(`Memory ${memoryId} has no assets, skipping`);
      return;
    }

    // Gather metadata from all related tables
    const assetMetadata = await this.getAssetMetadata(assetIds);

    // Generate title using priority-based strategy
    const result = generateTitle(assetMetadata);

    // Upsert the metadata record
    await this.repository.upsert(memoryId, {
      title: result.title,
      subCategory: result.subCategory,
      titleSource: result.titleSource,
    });
  }

  private async getAssetIdsForMemory(memoryId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('memory_asset')
      .select('assetId')
      .where('memoriesId', '=', memoryId)
      .execute();

    return rows.map((row) => row.assetId);
  }

  private async getAssetMetadata(assetIds: string[]): Promise<AssetMetadataForEnrichment[]> {
    if (assetIds.length === 0) {
      return [];
    }

    // Query EXIF data (city/country) for all assets
    const exifData = await this.db
      .selectFrom('asset_exif')
      .select(['assetId', 'city', 'country'])
      .where('assetId', 'in', assetIds)
      .execute();

    const exifByAssetId = new Map(exifData.map((row) => [row.assetId, row]));

    // Query face/person data for all assets
    const faceData = await this.db
      .selectFrom('asset_face')
      .innerJoin('person', 'person.id', 'asset_face.personId')
      .select(['asset_face.assetId', 'person.name'])
      .where('asset_face.assetId', 'in', assetIds)
      .where('person.name', '!=', '')
      .where('asset_face.personId', 'is not', null)
      .execute();

    const personNamesByAssetId = new Map<string, string[]>();
    for (const row of faceData) {
      const names = personNamesByAssetId.get(row.assetId) || [];
      names.push(row.name);
      personNamesByAssetId.set(row.assetId, names);
    }

    // Query tag data for all assets
    const tagData = await this.db
      .selectFrom('tag_asset')
      .innerJoin('tag', 'tag.id', 'tag_asset.tagId')
      .select(['tag_asset.assetId', 'tag.value'])
      .where('tag_asset.assetId', 'in', assetIds)
      .execute();

    const tagsByAssetId = new Map<string, string[]>();
    for (const row of tagData) {
      const tags = tagsByAssetId.get(row.assetId) || [];
      tags.push(row.value);
      tagsByAssetId.set(row.assetId, tags);
    }

    // Combine all metadata per asset
    return assetIds.map((assetId) => {
      const exif = exifByAssetId.get(assetId);
      return {
        city: exif?.city ?? null,
        country: exif?.country ?? null,
        personNames: personNamesByAssetId.get(assetId) || [],
        tags: tagsByAssetId.get(assetId) || [],
      };
    });
  }
}
