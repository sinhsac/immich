// FORK: Self-bootstrapping extension schema
// This service creates extension tables on startup WITHOUT using Kysely migrations.
// This means no record is written to kysely_migrations, making it fully invisible
// to upstream Immich. Tables are created idempotently (IF NOT EXISTS).
import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { OnEvent } from 'src/decorators';
import { BootstrapEventPriority } from 'src/enum';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { DB } from 'src/schema';

@Injectable()
export class ExtBootstrapService {
  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ExtBootstrapService.name);
  }

  // Run after database migrations but before plugins load
  @OnEvent({ name: 'AppBootstrap', priority: BootstrapEventPriority.PluginSync - 1 })
  async onBootstrap() {
    this.logger.log('Bootstrapping extension tables...');
    await this.ensureExtensionSchema();
    this.logger.log('Extension tables ready');
  }

  private async ensureExtensionSchema() {
    // All statements use IF NOT EXISTS — completely idempotent and safe to run every startup.
    // If tables already exist, these are essentially no-ops (a few ms at most).

    // === Custom Metadata Fields ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_custom_field" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "label" character varying NOT NULL,
        "type" character varying NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}',
        "sortOrder" integer NOT NULL DEFAULT 0,
        "required" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "ext_custom_field_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ext_custom_field_owner_name_uq" UNIQUE ("ownerId", "name"),
        CONSTRAINT "ext_custom_field_ownerId_fkey" FOREIGN KEY ("ownerId")
          REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS "ext_custom_field_ownerId_idx"
        ON "ext_custom_field" ("ownerId");
    `.execute(this.db);

    // === Custom Field Values ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_custom_field_value" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fieldId" uuid NOT NULL,
        "assetId" uuid NOT NULL,
        "textValue" text,
        "numberValue" double precision,
        "booleanValue" boolean,
        "dateValue" timestamp with time zone,
        "jsonValue" jsonb,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "ext_custom_field_value_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ext_custom_field_value_field_asset_uq" UNIQUE ("fieldId", "assetId"),
        CONSTRAINT "ext_custom_field_value_fieldId_fkey" FOREIGN KEY ("fieldId")
          REFERENCES "ext_custom_field" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "ext_custom_field_value_assetId_fkey" FOREIGN KEY ("assetId")
          REFERENCES "asset" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS "ext_custom_field_value_assetId_idx"
        ON "ext_custom_field_value" ("assetId");
    `.execute(this.db);
    await sql`
      CREATE INDEX IF NOT EXISTS "ext_custom_field_value_fieldId_idx"
        ON "ext_custom_field_value" ("fieldId");
    `.execute(this.db);
    await sql`
      CREATE INDEX IF NOT EXISTS "ext_custom_field_value_number_idx"
        ON "ext_custom_field_value" ("numberValue")
        WHERE "numberValue" IS NOT NULL;
    `.execute(this.db);

    // === Smart Albums ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_smart_album" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "category" character varying NOT NULL,
        "coverAssetId" uuid,
        "autoRefresh" boolean NOT NULL DEFAULT true,
        "lastRefreshedAt" timestamp with time zone,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "ext_smart_album_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ext_smart_album_ownerId_fkey" FOREIGN KEY ("ownerId")
          REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "ext_smart_album_coverAssetId_fkey" FOREIGN KEY ("coverAssetId")
          REFERENCES "asset" ("id") ON UPDATE CASCADE ON DELETE SET NULL
      );
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS "ext_smart_album_ownerId_idx"
        ON "ext_smart_album" ("ownerId");
    `.execute(this.db);

    // === Smart Album Rules ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_smart_album_rule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "smartAlbumId" uuid NOT NULL,
        "type" character varying NOT NULL,
        "config" jsonb NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "ext_smart_album_rule_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ext_smart_album_rule_smartAlbumId_fkey" FOREIGN KEY ("smartAlbumId")
          REFERENCES "ext_smart_album" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS "ext_smart_album_rule_smartAlbumId_idx"
        ON "ext_smart_album_rule" ("smartAlbumId");
    `.execute(this.db);

    // === Smart Album Assets (cached) ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_smart_album_asset" (
        "smartAlbumId" uuid NOT NULL,
        "assetId" uuid NOT NULL,
        "score" double precision,
        CONSTRAINT "ext_smart_album_asset_pkey" PRIMARY KEY ("smartAlbumId", "assetId"),
        CONSTRAINT "ext_smart_album_asset_smartAlbumId_fkey" FOREIGN KEY ("smartAlbumId")
          REFERENCES "ext_smart_album" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "ext_smart_album_asset_assetId_fkey" FOREIGN KEY ("assetId")
          REFERENCES "asset" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS "ext_smart_album_asset_assetId_idx"
        ON "ext_smart_album_asset" ("assetId");
    `.execute(this.db);

    // === Storage Analytics Cache ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_storage_analytics_cache" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" character varying NOT NULL,
        "data" jsonb NOT NULL,
        "computedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "ext_storage_analytics_cache_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ext_storage_analytics_cache_user_type_uq" UNIQUE ("userId", "type"),
        CONSTRAINT "ext_storage_analytics_cache_userId_fkey" FOREIGN KEY ("userId")
          REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `.execute(this.db);

    // === Memory Metadata (enriched titles & sub-categories) ===
    await sql`
      CREATE TABLE IF NOT EXISTS "ext_memory_metadata" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "memoryId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "subCategory" character varying,
        "titleSource" character varying NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "ext_memory_metadata_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ext_memory_metadata_memoryId_uq" UNIQUE ("memoryId"),
        CONSTRAINT "ext_memory_metadata_memoryId_fkey" FOREIGN KEY ("memoryId")
          REFERENCES "memory" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `.execute(this.db);

    await sql`
      CREATE INDEX IF NOT EXISTS "ext_memory_metadata_memoryId_idx"
        ON "ext_memory_metadata" ("memoryId");
    `.execute(this.db);
  }
}
