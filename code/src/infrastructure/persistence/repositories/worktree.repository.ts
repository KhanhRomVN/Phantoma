import { getDb } from '../sqlite/connection';
import { mapWorktree, type Row } from '../mappers/mappers';
import type { Worktree } from '../../../domain/project/project.types';
import { AppError } from '../../../application/errors/app.error';

export interface WorktreeRow {
  id: string;
  projectId: string;
  path: string;
  branch: string;
  visible: boolean;
  searchTerm: string;
}

const COLUMNS: Record<string, string> = {
  path: 'path',
  branch: 'branch',
  visible: 'visible',
  searchTerm: 'search_term',
};

function encode(key: string, value: unknown): unknown {
  return key === 'visible' ? (value ? 1 : 0) : value;
}

function conflict(err: any): never {
  if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    throw new AppError(err.message, 409);
  }
  throw err;
}

export const worktreeRepository = {
  listAll: (): Worktree[] => (getDb().prepare('SELECT * FROM worktrees ORDER BY rowid').all() as Row[]).map(mapWorktree),

  listByProject: (projectId: string): Worktree[] =>
    (getDb().prepare('SELECT * FROM worktrees WHERE project_id = ? ORDER BY rowid').all(projectId) as Row[]).map(mapWorktree),

  get: (id: string): Worktree | null => {
    const row = getDb().prepare('SELECT * FROM worktrees WHERE id = ?').get(id) as Row | undefined;
    return row ? mapWorktree(row) : null;
  },

  findByPath: (p: string): Worktree | null => {
    const row = getDb().prepare('SELECT * FROM worktrees WHERE path = ?').get(p) as Row | undefined;
    return row ? mapWorktree(row) : null;
  },

  insert: (w: WorktreeRow): void => {
    try {
      getDb()
        .prepare(
          'INSERT INTO worktrees (id, project_id, path, branch, visible, search_term) VALUES (@id, @project_id, @path, @branch, @visible, @search_term)',
        )
        .run({
          id: w.id,
          project_id: w.projectId,
          path: w.path,
          branch: w.branch,
          visible: w.visible ? 1 : 0,
          search_term: w.searchTerm,
        });
    } catch (err) {
      conflict(err);
    }
  },

  update: (id: string, patch: Record<string, unknown>): boolean => {
    const sets: Record<string, unknown> = {};
    for (const [key, column] of Object.entries(COLUMNS)) {
      if (patch[key] !== undefined) sets[column] = encode(key, patch[key]);
    }
    const cols = Object.keys(sets);
    if (cols.length === 0) return !!worktreeRepository.get(id);
    try {
      return (
        getDb()
          .prepare(`UPDATE worktrees SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
          .run({ ...sets, id }).changes > 0
      );
    } catch (err) {
      return conflict(err);
    }
  },

  remove: (id: string): boolean => getDb().prepare('DELETE FROM worktrees WHERE id = ?').run(id).changes > 0,
};