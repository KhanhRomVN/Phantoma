import type BetterSqlite3 from 'better-sqlite3';
import type { Row } from '../../../../domain/mappers';
import { AppError } from '../../../../utils/http';

// ASSUMED: db-parameterised copies of database/sql.ts row helpers; the legacy global-getDb versions stay until every repository is migrated, then get deleted
export type Db = BetterSqlite3.Database;
export type DbProvider = () => Db;

const isConstraintError = (err: any): boolean =>
  typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT');

export function getRow(db: Db, table: string, id: string): Row | undefined {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
}

export function rowExists(db: Db, table: string, id: string): boolean {
  return !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
}

export function insertRow(db: Db, table: string, row: Record<string, unknown>): void {
  const cols = Object.keys(row);
  try {
    db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`).run(row);
  } catch (err: any) {
    if (isConstraintError(err)) throw new AppError(err.message, 409);
    throw err;
  }
}

export function updateRow(
  db: Db,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  touch = true,
): boolean {
  const sets: Record<string, unknown> = touch ? { ...patch, updated_at: Date.now() } : { ...patch };
  const cols = Object.keys(sets);
  if (cols.length === 0) return rowExists(db, table, id);
  try {
    const res = db
      .prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
      .run({ ...sets, id });
    return res.changes > 0;
  } catch (err: any) {
    if (isConstraintError(err)) throw new AppError(err.message, 409);
    throw err;
  }
}

export function deleteRow(db: Db, table: string, id: string): boolean {
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}