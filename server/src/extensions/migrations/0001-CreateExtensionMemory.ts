import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE "extension_memory" (
      "id"              uuid        NOT NULL DEFAULT uuid_generate_v4(),
      "nativeMemoryId"  uuid        REFERENCES "memory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "ownerId"         uuid        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "type"            varchar     NOT NULL,
      "title"           varchar     NOT NULL,
      "data"            jsonb       NOT NULL DEFAULT '{}',
      "coverAssetId"    uuid        REFERENCES "asset"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "isSaved"         boolean     NOT NULL DEFAULT false,
      "memoryAt"        timestamptz NOT NULL,
      "showAt"          timestamptz,
      "hideAt"          timestamptz,
      "seenAt"          timestamptz,
      "createdAt"       timestamptz NOT NULL DEFAULT now(),
      "updatedAt"       timestamptz NOT NULL DEFAULT now(),
      "deletedAt"       timestamptz,
      CONSTRAINT "extension_memory_pkey" PRIMARY KEY ("id")
    )
  `.execute(db);

  await sql`
    CREATE TABLE "extension_memory_asset" (
      "memoryId"  uuid NOT NULL REFERENCES "extension_memory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "assetId"   uuid NOT NULL REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "extension_memory_asset_pkey" PRIMARY KEY ("memoryId", "assetId")
    )
  `.execute(db);

  await sql`CREATE INDEX "extension_memory_ownerId_idx" ON "extension_memory" ("ownerId")`.execute(db);
  await sql`CREATE INDEX "extension_memory_memoryAt_idx" ON "extension_memory" ("memoryAt")`.execute(db);
  await sql`CREATE INDEX "extension_memory_nativeMemoryId_idx" ON "extension_memory" ("nativeMemoryId")`.execute(db);
  await sql`CREATE INDEX "extension_memory_asset_assetId_idx" ON "extension_memory_asset" ("assetId")`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS "extension_memory_asset"`.execute(db);
  await sql`DROP TABLE IF EXISTS "extension_memory"`.execute(db);
}
