import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX "extension_memory_dedupeKey_idx"
    ON "extension_memory" ((data->>'_dedupeKey'))
    WHERE "deletedAt" IS NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS "extension_memory_dedupeKey_idx"`.execute(db);
}
