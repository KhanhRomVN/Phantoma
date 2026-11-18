import { getDb } from './connection';
import { AppError, newId } from '../utils/http';
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

export function requireFields(input: Input, fields: string[]): void {
  for (const f of fields) {
    const v = input[f];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      throw new AppError(`${f} is required`, 400);
    }
  }
}

export function idOf(input: Input): string {
  return typeof input.id === 'string' && input.id ? input.id : newId();
}

export function getRow(table: string, id: string): Row | undefined {
  return getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
}

export function rowExists(table: string, id: string): boolean {
  return !!getDb().prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
}

export function insertRow(table: string, row: Record<string, unknown>): void {
  const cols = Object.keys(row);
  try {
    getDb()
      .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
      .run(row);
  } catch (err: any) {
    if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
      throw new AppError(err.message, 409);
    }
    throw err;
  }
}

export function updateRow(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  touch = true,
): boolean {
  const sets: Record<string, unknown> = touch ? { ...patch, updated_at: Date.now() } : { ...patch };
  const cols = Object.keys(sets);
  if (cols.length === 0) return rowExists(table, id);
  try {
    const res = getDb()
      .prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
      .run({ ...sets, id });
    return res.changes > 0;
  } catch (err: any) {
    if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
      throw new AppError(err.message, 409);
    }
    throw err;
  }
}

export function deleteRow(table: string, id: string): boolean {
  return getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}

export interface ChildStoreOptions {
  table: string;
  map: ColumnMap;
  mapRow: (row: Row) => unknown;
  orderBy: string;
  required: string[];
  defaults: (now: number) => Record<string, unknown>;
  hasUpdatedAt?: boolean;
}

export function makeChildStore(opts: ChildStoreOptions) {
  const { table, map, mapRow, orderBy, required, defaults, hasUpdatedAt = false } = opts;

  const list = (profileId: string) =>
    (
      getDb()
        .prepare(`SELECT * FROM ${table} WHERE email_id = ? ORDER BY ${orderBy}`)
        .all(profileId) as Row[]
    ).map(mapRow);

  const get = (id: string) => {
    const row = getRow(table, id);
    return row ? mapRow(row) : null;
  };

  const create = (profileId: string, input: Input) => {
    requireFields(input, required);
    const id = typeof input.id === 'string' && input.id ? input.id : newId();
    insertRow(table, {
      id,
      email_id: profileId,
      ...defaults(Date.now()),
      ...buildPatch(input, map),
    });
    return get(id);
  };

  const update = (id: string, input: Input) => {
    const ok = updateRow(table, id, buildPatch(input, map), hasUpdatedAt);
    return ok ? get(id) : null;
  };

  const remove = (id: string) => deleteRow(table, id);

  return { list, get, create, update, remove };
}