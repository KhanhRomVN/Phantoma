import { getDb } from './connection';
import { AppError } from '../utils/http';
import type { Row } from '../domain/mappers';

export type Input = Record<string, any>;
export type ColumnMap = Record<string, [column: string, encode?: (v: any) => unknown]>;

export const enc = {
  json: (v: unknown) => JSON.stringify(v ?? []),
  bool: (v: unknown) => (v ? 1 : 0),
  time: (v: unknown): number | null => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v) {
      const t = Date.parse(v);
      return Number.isNaN(t) ? null : t;
    }
    return null;
  },
};

export function buildPatch(input: Input, map: ColumnMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, [column, encode]] of Object.entries(map)) {
    if (input[key] !== undefined) out[column] = encode ? encode(input[key]) : input[key];
  }
  return out;
}

function rethrow(err: any): never {
  if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    throw new AppError(err.message, 409);
  }
  throw err;
}

export function getRow(table: string, id: string): Row | undefined {
  return getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
}

export function insertRow(table: string, row: Record<string, unknown>): void {
  const cols = Object.keys(row);
  try {
    getDb()
      .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
      .run(row);
  } catch (err) {
    rethrow(err);
  }
}

export function updateRow(table: string, id: string, patch: Record<string, unknown>, touch = true): boolean {
  const sets: Record<string, unknown> = touch ? { ...patch, updated_at: Date.now() } : { ...patch };
  const cols = Object.keys(sets);
  if (cols.length === 0) return !!getRow(table, id);
  try {
    const res = getDb()
      .prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
      .run({ ...sets, id });
    return res.changes > 0;
  } catch (err) {
    return rethrow(err);
  }
}

export function deleteRow(table: string, id: string): boolean {
  return getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}