import type BetterSqlite3 from 'better-sqlite3';
import { getDb } from '../database/connection';
import { buildPatch, enc, getRow, type ColumnMap, type Input } from '../database/sql';
import { purgeVault, withVault } from '../database/vault';
import { mapServiceEmail, type Row } from '../domain/mappers';
import { AppError, newId } from '../utils/http';
import { createLogger } from '../utils/logger';

const logger = createLogger('ServiceEmailRepository');

const optionalJson = (v: unknown): string | null =>
  v === null || v === undefined ? null : JSON.stringify(v);

const SERVICE_EMAIL_MAP: ColumnMap = {
  templateId: ['service_id', (v) => v || null],
  serviceId: ['service_id', (v) => v || null],
  authMethods: ['auth_methods', enc.json],
  totps: ['totps', optionalJson],
  backupCodes: ['backup_codes', optionalJson],
  status: ['status', (v) => v || 'active'],
  statusNote: ['status_note', (v) => v || null],
  customFields: [
    'custom_fields',
    (v) =>
      Array.isArray(v)
        ? JSON.stringify(v.map((f: any) => ({ name: f.name ?? f.key, value: f.value })))
        : null,
  ],
};

type ServiceEmail = ReturnType<typeof mapServiceEmail>;

function toServiceEmail(row: Row): ServiceEmail {
  const service = row.service_id ? getRow('services', String(row.service_id)) : undefined;
  return mapServiceEmail(row, String(service?.name ?? ''));
}

function readServiceEmail(db: BetterSqlite3.Database, id: string): ServiceEmail | null {
  const row = db.prepare('SELECT * FROM service_emails WHERE id = ?').get(id) as Row | undefined;
  return row ? toServiceEmail(row) : null;
}

export const serviceEmailRepository = {
  list: (emailId: string): ServiceEmail[] =>
    withVault<ServiceEmail[]>(emailId, false, [], (db) =>
      (db.prepare('SELECT * FROM service_emails ORDER BY rowid DESC').all() as Row[]).map(
        toServiceEmail,
      ),
    ),

  listRaw: (emailId: string): Row[] =>
    withVault<Row[]>(
      emailId,
      false,
      [],
      (db) => db.prepare('SELECT * FROM service_emails ORDER BY rowid').all() as Row[],
    ),

  get: (emailId: string, id: string): ServiceEmail | null =>
    withVault<ServiceEmail | null>(emailId, false, null, (db) => readServiceEmail(db, id)),

  create: (emailId: string, input: Input): ServiceEmail | null => {
    const id = typeof input.id === 'string' && input.id ? input.id : newId();
    const row: Record<string, unknown> = {
      id,
      service_id: null,
      totps: null,
      backup_codes: null,
      auth_methods: '[]',
      custom_fields: null,
      ...buildPatch(input, SERVICE_EMAIL_MAP),
    };
    const cols = Object.keys(row);
    return withVault<ServiceEmail | null>(emailId, true, null, (db) => {
      try {
        db.prepare(
          `INSERT INTO service_emails (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`,
        ).run(row);
      } catch (err: any) {
        if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
          throw new AppError(err.message, 409);
        }
        throw err;
      }
      return readServiceEmail(db, id);
    });
  },

  update: (emailId: string, id: string, input: Input): ServiceEmail | null =>
    withVault<ServiceEmail | null>(emailId, false, null, (db) => {
      const sets = buildPatch(input, SERVICE_EMAIL_MAP);
      const cols = Object.keys(sets);
      if (cols.length === 0) return readServiceEmail(db, id);
      const res = db
        .prepare(
          `UPDATE service_emails SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`,
        )
        .run({ ...sets, id });
      return res.changes > 0 ? readServiceEmail(db, id) : null;
    }),

  remove: (emailId: string, id: string): boolean =>
    withVault<boolean>(
      emailId,
      false,
      false,
      (db) => db.prepare('DELETE FROM service_emails WHERE id = ?').run(id).changes > 0,
    ),

  purge: (emailId: string): void => purgeVault(emailId),
};

// Legacy: service links used to live in the main db table service_emails (column profile_id); move them into each service_email.sql
export function migrateLegacyServiceEmails(): void {
  const main = getDb();
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
