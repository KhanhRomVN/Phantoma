import type BetterSqlite3 from 'better-sqlite3';
import type {
  SessionInput,
  SessionRecord,
  SessionRepositoryPort,
} from '../../../application/ports/repositories/session.repository.port';
import { enc, idOf } from '../../../database/sql';
import { mapSession, type Row } from '../../../domain/mappers';
import { parseBrowserKind } from '../../../utils/browser-folder';
import { AppError } from '../../../utils/http';

export interface SessionDbAccess {
  withDb: <T>(emailId: string, create: boolean, fallback: T, fn: (db: BetterSqlite3.Database) => T) => T;
  purge: (emailId: string) => void;
}

function jsonObject(v: unknown, field: string): string | null {
  if (v === null) return null;
  if (typeof v === 'object' && !Array.isArray(v)) return JSON.stringify(v);
  throw new AppError(`${field} must be an object`, 400);
}

function readSession(db: BetterSqlite3.Database, id: string): SessionRecord | null {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Row | undefined;
  return row ? mapSession(row) : null;
}

export class SqliteSessionRepository implements SessionRepositoryPort {
  constructor(private readonly access: SessionDbAccess) {}

  list = (emailId: string): SessionRecord[] =>
    this.access.withDb<SessionRecord[]>(emailId, false, [], (db) =>
      (db.prepare('SELECT * FROM sessions ORDER BY started_at DESC').all() as Row[]).map(mapSession),
    );

  get = (emailId: string, id: string): SessionRecord | null =>
    this.access.withDb<SessionRecord | null>(emailId, false, null, (db) => readSession(db, id));

  // ASSUMED: a new run closes any session left open (app crash / browser killed) so only one session is running per email
  start = (emailId: string, input: SessionInput): SessionRecord | null => {
    const now = Date.now();
    const row = {
      id: idOf(input),
      browser: parseBrowserKind(input.browser),
      started_at: enc.time(input.startedAt) ?? now,
      ended_at: null,
      ip: input.ip === undefined ? null : jsonObject(input.ip, 'ip'),
      footprint: input.footprint === undefined ? null : jsonObject(input.footprint, 'footprint'),
    };
    return this.access.withDb<SessionRecord | null>(emailId, true, null, (db) => {
      try {
        db.transaction(() => {
          db.prepare('UPDATE sessions SET ended_at = @now WHERE ended_at IS NULL').run({ now });
          db.prepare(
            'INSERT INTO sessions (id, browser, started_at, ended_at, ip, footprint) VALUES (@id, @browser, @started_at, @ended_at, @ip, @footprint)',
          ).run(row);
        })();
      } catch (err: any) {
        if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
          throw new AppError(err.message, 409);
        }
        throw err;
      }
      return readSession(db, row.id);
    });
  };

  update = (emailId: string, id: string, input: SessionInput): SessionRecord | null =>
    this.access.withDb<SessionRecord | null>(emailId, false, null, (db) => {
      const sets: Record<string, unknown> = {};
      if (input.ip !== undefined) sets.ip = jsonObject(input.ip, 'ip');
      if (input.footprint !== undefined) sets.footprint = jsonObject(input.footprint, 'footprint');
      const cols = Object.keys(sets);
      if (cols.length === 0) return readSession(db, id);
      const res = db
        .prepare(`UPDATE sessions SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...sets, id });
      return res.changes > 0 ? readSession(db, id) : null;
    });

  end = (emailId: string, id: string, sites?: unknown[]): SessionRecord | null =>
    this.access.withDb<SessionRecord | null>(emailId, false, null, (db) => {
      db.prepare(
        'UPDATE sessions SET ended_at = @now, sites = COALESCE(@sites, sites) WHERE id = @id AND ended_at IS NULL',
      ).run({ now: Date.now(), id, sites: sites ? JSON.stringify(sites) : null });
      return readSession(db, id);
    });

  remove = (emailId: string, id: string): boolean =>
    this.access.withDb<boolean>(
      emailId,
      false,
      false,
      (db) => db.prepare('DELETE FROM sessions WHERE id = ?').run(id).changes > 0,
    );

  purge = (emailId: string): void => this.access.purge(emailId);
}