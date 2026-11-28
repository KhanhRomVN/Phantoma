import { getDb } from '../sqlite/connection';
import { mapGroup, type Row } from '../mappers/mappers';
import type { Group } from '../../../domain/group/group.types';

export interface GroupRow {
  id: string;
  name: string;
  iconId?: string | null;
  sortOrder: number;
  isOpen: boolean;
}

const COLUMNS: Record<string, string> = {
  name: 'name',
  iconId: 'icon_id',
  sortOrder: 'sort_order',
  isOpen: 'is_open',
};

function encode(key: string, value: unknown): unknown {
  return key === 'isOpen' ? (value ? 1 : 0) : value;
}

export const groupRepository = {
  list: (): Group[] =>
    (getDb().prepare('SELECT * FROM groups ORDER BY sort_order, created_at').all() as Row[]).map(mapGroup),

  get: (id: string): Group | null => {
    const row = getDb().prepare('SELECT * FROM groups WHERE id = ?').get(id) as Row | undefined;
    return row ? mapGroup(row) : null;
  },

  exists: (id: string): boolean => !!getDb().prepare('SELECT 1 FROM groups WHERE id = ?').get(id),

  insert: (g: GroupRow): void => {
    const now = Date.now();
    getDb()
      .prepare(
        'INSERT INTO groups (id, name, icon_id, sort_order, is_open, created_at, updated_at) VALUES (@id, @name, @icon_id, @sort_order, @is_open, @now, @now)',
      )
      .run({
        id: g.id,
        name: g.name,
        icon_id: g.iconId ?? null,
        sort_order: g.sortOrder,
        is_open: g.isOpen ? 1 : 0,
        now,
      });
  },

  update: (id: string, patch: Record<string, unknown>): boolean => {
    const sets: Record<string, unknown> = { updated_at: Date.now() };
    for (const [key, column] of Object.entries(COLUMNS)) {
      if (patch[key] !== undefined) sets[column] = encode(key, patch[key]);
    }
    const cols = Object.keys(sets);
    return (
      getDb()
        .prepare(`UPDATE groups SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...sets, id }).changes > 0
    );
  },

  remove: (id: string): boolean => getDb().prepare('DELETE FROM groups WHERE id = ?').run(id).changes > 0,

  transaction: <T>(fn: () => T): T => getDb().transaction(fn)(),
};