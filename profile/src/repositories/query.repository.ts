import { getDb } from '../database/connection';
import { deleteRow, enc, getRow, idOf, insertRow, updateRow, type Input } from '../database/sql';
import type { Row } from '../domain/mappers';
import { AppError } from '../utils/http';

export const normalizeQueryText = (raw: unknown): string =>
  String(raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

function parseConditions(text: unknown): unknown[] {
  try {
    const v = JSON.parse(String(text ?? '[]'));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const mapQuery = (r: Row) => ({
  id: r.id as string,
  name: r.name as string,
  mode: r.mode as string,
  kind: r.kind as string,
  conditions: parseConditions(r.conditions),
  sql: (r.sql ?? undefined) as string | undefined,
  text: r.text as string,
});

function assertUniqueText(text: string, ignoreId?: string): void {
  const taken = getDb().prepare('SELECT 1 FROM queries WHERE text = ? AND id != ?').get(text, ignoreId ?? '');
  if (taken) throw new AppError('duplicate query', 409);
}

function getQueryById(id: string) {
  const row = getRow('queries', id);
  return row ? mapQuery(row) : null;
}

function createQuery(input: Input) {
  const id = idOf(input);
  const text = normalizeQueryText(input.text);
  assertUniqueText(text);
  const now = Date.now();
  insertRow('queries', {
    id,
    name: String(input.name ?? '').trim() || 'Untitled query',
    mode: input.mode === 'any' ? 'any' : 'all',
    kind: input.kind === 'sql' ? 'sql' : 'visual',
    conditions: enc.json(input.conditions),
    sql: typeof input.sql === 'string' ? input.sql : null,
    text,
    created_at: now,
    updated_at: now,
  });
  return getQueryById(id);
}

function updateQuery(id: string, input: Input) {
  if (!getRow('queries', id)) return null;
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = String(input.name).trim() || 'Untitled query';
  if (input.mode !== undefined) patch.mode = input.mode === 'any' ? 'any' : 'all';
  if (input.kind !== undefined) patch.kind = input.kind === 'sql' ? 'sql' : 'visual';
  if (input.conditions !== undefined) patch.conditions = enc.json(input.conditions);
  if (input.sql !== undefined) patch.sql = typeof input.sql === 'string' ? input.sql : null;
  if (input.text !== undefined) {
    const text = normalizeQueryText(input.text);
    assertUniqueText(text, id);
    patch.text = text;
  }
  updateRow('queries', id, patch);
  return getQueryById(id);
}

export const queryRepository = {
  list: () => (getDb().prepare('SELECT * FROM queries ORDER BY created_at ASC').all() as Row[]).map(mapQuery),
  getById: getQueryById,
  create: createQuery,
  update: updateQuery,
  remove: (id: string): boolean => deleteRow('queries', id),
};