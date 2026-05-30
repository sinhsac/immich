import { Injectable } from '@nestjs/common';
import { FileMigrationProvider, Kysely, Migrator } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DB } from 'src/schema';
import { LoggingRepository } from 'src/repositories/logging.repository';

@Injectable()
export class ExtensionMigratorService {
  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ExtensionMigratorService.name);
  }

  async runMigrations(): Promise<void> {
    this.logger.log('Running extension migrations');

    const migrator = new Migrator({
      db: this.db,
      migrationTableName: 'kysely_migrations_ext',
      migrationLockTableName: 'kysely_migrations_ext_lock',
      // eslint-disable-next-line unicorn/prefer-module
      provider: new FileMigrationProvider({
        fs: { readdir },
        path: { join },
        migrationFolder: join(__dirname, '../migrations'),
      }),
    });

    const { error, results } = await migrator.migrateToLatest();

    for (const result of results ?? []) {
      if (result.status === 'Success') {
        this.logger.log(`Extension migration "${result.migrationName}" succeeded`);
      }
      if (result.status === 'Error') {
        this.logger.warn(`Extension migration "${result.migrationName}" failed`);
      }
    }

    if (error) {
      this.logger.error(`Extension migrations failed: ${error}`);
      throw error;
    }

    this.logger.log('Finished running extension migrations');
  }
}
