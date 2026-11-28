import { getDb } from '../sqlite/connection';
import { mapProject, type Row } from '../mappers/mappers';
import type { Project } from '../../../domain/project/project.types';

export interface ProjectRow {
  id: string;
  name: string;
  logo: string | null;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder: number;
}

const COLUMNS: Record<string, string> = {
  name: 'name',
  logo: 'logo',
  repositoryUrl: 'repository_url',
  groupId: 'group_id',
  sortOrder: 'sort_order',
};

export const projectRepository = {
  list: (): Project[] =>
    (getDb().prepare('SELECT * FROM projects ORDER BY sort_order, created_at').all() as Row[]).map(mapProject),

  get: (id: string): Project | null => {
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Row | undefined;
    return row ? mapProject(row) : null;
  },

  exists: (id: string): boolean => !!getDb().prepare('SELECT 1 FROM projects WHERE id = ?').get(id),

  nextSortOrder: (): number =>
    ((getDb().prepare('SELECT MAX(sort_order) AS m FROM projects').get() as { m: number | null }).m ?? 0) + 1,

  insert: (p: ProjectRow): void => {
    const now = Date.now();
    getDb()
      .prepare(
        'INSERT INTO projects (id, logo, name, repository_url, group_id, sort_order, created_at, updated_at) VALUES (@id, @logo, @name, @repository_url, @group_id, @sort_order, @now, @now)',
      )
      .run({
        id: p.id,
        logo: p.logo,
        name: p.name,
        repository_url: p.repositoryUrl ?? null,
        group_id: p.groupId ?? null,
        sort_order: p.sortOrder,
        now,
      });
  },

  update: (id: string, patch: Record<string, unknown>): boolean => {
    const sets: Record<string, unknown> = { updated_at: Date.now() };
    for (const [key, column] of Object.entries(COLUMNS)) {
      if (patch[key] !== undefined) sets[column] = patch[key];
    }
    const cols = Object.keys(sets);
    return (
      getDb()
        .prepare(`UPDATE projects SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...sets, id }).changes > 0
    );
  },

  remove: (id: string): boolean => getDb().prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0,

  transaction: <T>(fn: () => T): T => getDb().transaction(fn)(),
};