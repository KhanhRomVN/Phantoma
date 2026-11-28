import type BetterSqlite3 from 'better-sqlite3';
import type {
  ServiceEmailInput,
  ServiceEmailRecord,
  ServiceEmailRepositoryPort,
} from '../../../application/ports/repositories/service-email.repository.port';
import { buildPatch, enc, type ColumnMap } from '../../../database/sql';
import { mapServiceEmail, type Row } from '../../../domain/mappers';
import { AppError, newId } from '../../../utils/http';
import { getRow, type DbProvider } from '../sqlite/main/sql-helpers';

export interface VaultDbAccess {
  withDb: <T>(emailId: string, create: boolean, fallback: T, fn: (db: BetterSqlite3.Database) => T) => T;
  purge: (emailId: string) => void;
}

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

export class SqliteServiceEmailRepository implements ServiceEmailRepositoryPort {
  constructor(
    private readonly vault: VaultDbAccess,
    private readonly mainDb: DbProvider,
  ) {}

  private toServiceEmail(row: Row): ServiceEmailRecord {
    const service = row.service_id ? getRow(this.mainDb(), 'services', String(row.service_id)) : undefined;
    return mapServiceEmail(row, String(service?.name ?? ''));
  }

  private read(db: BetterSqlite3.Database, id: string): ServiceEmailRecord | null {
    const row = db.prepare('SELECT * FROM service_emails WHERE id = ?').get(id) as Row | undefined;
    return row ? this.toServiceEmail(row) : null;
  }

  list = (emailId: string): ServiceEmailRecord[] =>
    this.vault.withDb<ServiceEmailRecord[]>(emailId, false, [], (db) =>
      (db.prepare('SELECT * FROM service_emails ORDER BY rowid DESC').all() as Row[]).map((r) =>
        this.toServiceEmail(r),
      ),
    );

  listRaw = (emailId: string): Row[] =>
    this.vault.withDb<Row[]>(
      emailId,
      false,
      [],
      (db) => db.prepare('SELECT * FROM service_emails ORDER BY rowid').all() as Row[],
    );

  get = (emailId: string, id: string): ServiceEmailRecord | null =>
    this.vault.withDb<ServiceEmailRecord | null>(emailId, false, null, (db) => this.read(db, id));

  create = (emailId: string, input: ServiceEmailInput): ServiceEmailRecord | null => {
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
    return this.vault.withDb<ServiceEmailRecord | null>(emailId, true, null, (db) => {
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
      return this.read(db, id);
    });
  };

  update = (emailId: string, id: string, input: ServiceEmailInput): ServiceEmailRecord | null =>
    this.vault.withDb<ServiceEmailRecord | null>(emailId, false, null, (db) => {
      const sets = buildPatch(input, SERVICE_EMAIL_MAP);
      const cols = Object.keys(sets);
      if (cols.length === 0) return this.read(db, id);
      const res = db
        .prepare(`UPDATE service_emails SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...sets, id });
      return res.changes > 0 ? this.read(db, id) : null;
    });

  remove = (emailId: string, id: string): boolean =>
    this.vault.withDb<boolean>(
      emailId,
      false,
      false,
      (db) => db.prepare('DELETE FROM service_emails WHERE id = ?').run(id).changes > 0,
    );

  purge = (emailId: string): void => this.vault.purge(emailId);
}