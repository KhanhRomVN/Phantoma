import type { QueryInput, QueryRepositoryPort } from '../../../application/ports/repositories/query.repository.port';
import { enc, idOf } from '../../../database/sql';
import type { Row } from '../../../domain/mappers';
import type { Query } from '../../../domain/queries/query';
import { AppError } from '../../../utils/http';
import { deleteRow, getRow, insertRow, updateRow, type DbProvider } from '../sqlite/main/sql-helpers';

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

const mapQuery = (r: Row): Query => ({
  id: r.id as string,
  name: r.name as string,
  mode: r.mode as string,
  kind: r.kind as string,
  conditions: parseConditions(r.conditions),
  sql: (r.sql ?? undefined) as string | undefined,
  text: r.text as string,
});

export class SqliteQueryRepository implements QueryRepositoryPort {
  constructor(private readonly db: DbProvider) {}

  list = (): Query[] =>
    (this.db().prepare('SELECT * FROM queries ORDER BY created_at ASC').all() as Row[]).map(mapQuery);

  getById = (id: string): Query | null => {
    const row = getRow(this.db(), 'queries', id);
    return row ? mapQuery(row) : null;
  };

  create = (input: QueryInput): Query | null => {
    const id = idOf(input);
    const text = normalizeQueryText(input.text);
    this.assertUniqueText(text);
    const now = Date.now();
    insertRow(this.db(), 'queries', {
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
    return this.getById(id);
  };

  update = (id: string, input: QueryInput): Query | null => {
    if (!getRow(this.db(), 'queries', id)) return null;
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = String(input.name).trim() || 'Untitled query';
    if (input.mode !== undefined) patch.mode = input.mode === 'any' ? 'any' : 'all';
    if (input.kind !== undefined) patch.kind = input.kind === 'sql' ? 'sql' : 'visual';
    if (input.conditions !== undefined) patch.conditions = enc.json(input.conditions);
    if (input.sql !== undefined) patch.sql = typeof input.sql === 'string' ? input.sql : null;
    if (input.text !== undefined) {
      const text = normalizeQueryText(input.text);
      this.assertUniqueText(text, id);
      patch.text = text;
    }
    updateRow(this.db(), 'queries', id, patch);
    return this.getById(id);
  };

  remove = (id: string): boolean => deleteRow(this.db(), 'queries', id);

  private assertUniqueText(text: string, ignoreId?: string): void {
    const taken = this.db().prepare('SELECT 1 FROM queries WHERE text = ? AND id != ?').get(text, ignoreId ?? '');
    if (taken) throw new AppError('duplicate query', 409);
  }
}