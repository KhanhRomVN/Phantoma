import { getDb } from '../database/connection';
import { mapScope, type Scope, type Row } from '../domain/mappers';
import { AppError } from '../utils/http';

export interface ScopeRow {
  id: string;
  worktreeId: string;
  path: string;
}

function conflict(err: any): never {
  if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    throw new AppError(err.message, 409);
  }
  throw err;
}

export const scopeRepository = {
  listByWorktree: (worktreeId: string): Scope[] =>
    (getDb().prepare('SELECT * FROM scopes WHERE worktree_id = ? ORDER BY path').all(worktreeId) as Row[]).map(
      mapScope,
    ),

  get: (id: string): Scope | null => {
    const row = getDb().prepare('SELECT * FROM scopes WHERE id = ?').get(id) as Row | undefined;
    return row ? mapScope(row) : null;
  },

  insert: (s: ScopeRow): void => {
    try {
      getDb()
        .prepare('INSERT INTO scopes (id, worktree_id, path, created_at) VALUES (@id, @worktree_id, @path, @now)')
        .run({ id: s.id, worktree_id: s.worktreeId, path: s.path, now: Date.now() });
    } catch (err) {
      conflict(err);
    }
  },

  remove: (id: string): boolean => getDb().prepare('DELETE FROM scopes WHERE id = ?').run(id).changes > 0,

  removeByWorktree: (worktreeId: string): number =>
    getDb().prepare('DELETE FROM scopes WHERE worktree_id = ?').run(worktreeId).changes,
};