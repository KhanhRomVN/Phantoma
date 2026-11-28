import type BetterSqlite3 from 'better-sqlite3';
import type { Row } from '../../../domain/mappers';
import { createLogger } from '../../../utils/logger';
import type { DbProvider } from '../sqlite/main/sql-helpers';

const logger = createLogger('ServiceEmailMigration');

export type WithVault = <T>(
  emailId: string,
  create: boolean,
  fallback: T,
  fn: (db: BetterSqlite3.Database) => T,
) => T;

// Legacy: service links used to live in the main db table service_emails (column profile_id); move them into each service_email.sql
export function migrateLegacyServiceEmails(mainDb: DbProvider, withVault: WithVault): void {
  const main = mainDb();
  const legacy = main
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'service_emails'`)
    .get();
  if (!legacy) return;

  const byEmail = new Map<string, Row[]>();
  for (const r of main.prepare('SELECT * FROM service_emails').all() as Row[]) {
    const items = byEmail.get(r.profile_id) ?? [];
    items.push(r);
    byEmail.set(r.profile_id, items);
  }

  let failed = 0;
  for (const [emailId, items] of byEmail) {
    try {
      withVault<void>(emailId, true, undefined, (db) => {
        const insert = db.prepare(
          `INSERT OR IGNORE INTO service_emails (id, service_id, custom_fields)
           VALUES (@id, @service_id, @custom_fields)`,
        );
        db.transaction((list: Row[]) => {
          for (const r of list) {
            insert.run({
              id: r.id,
              service_id: r.service_id ?? null,
              custom_fields: r.custom_fields ?? null,
            });
          }
        })(items);
      });
    } catch (err) {
      failed++;
      logger.warn(
        `Cannot migrate service emails of email ${emailId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (failed > 0) {
    logger.warn(`Legacy service_emails table kept: ${failed} email(s) failed to migrate`);
    return;
  }
  main.exec('DROP TABLE service_emails');
}