import { getDb } from '../sqlite/connection';
import { mapSession, type Row } from '../mappers/mappers';
import type { Session } from '../../../domain/session/session.types';

export interface SessionRow {
  id: string;
  worktreeId: string;
  title: string;
}

export const sessionRepository = {
  listAll: (): Session[] =>
    (getDb().prepare('SELECT * FROM sessions ORDER BY created_at').all() as Row[]).map(mapSession),

  get: (id: string): Session | null => {
    const row = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Row | undefined;
    return row ? mapSession(row) : null;
  },

  getByWorktree: (worktreeId: string): Session | null => {
    const row = getDb().prepare('SELECT * FROM sessions WHERE worktree_id = ?').get(worktreeId) as Row | undefined;
    return row ? mapSession(row) : null;
  },

  insert: (s: SessionRow): void => {
    const now = Date.now();
    getDb()
      .prepare(
        'INSERT INTO sessions (id, worktree_id, title, created_at, updated_at) VALUES (@id, @worktree_id, @title, @now, @now)',
      )
      .run({ id: s.id, worktree_id: s.worktreeId, title: s.title, now });
  },

  update: (id: string, patch: { title?: string }): boolean => {
    if (patch.title === undefined) return !!sessionRepository.get(id);
    return (
      getDb()
        .prepare('UPDATE sessions SET title = @title, updated_at = @now WHERE id = @id')
        .run({ title: patch.title, now: Date.now(), id }).changes > 0
    );
  },

  saveLayout: (id: string, layout: unknown, activePanelId: string | null): boolean =>
    getDb()
      .prepare('UPDATE sessions SET layout = @layout, active_panel_id = @active, updated_at = @now WHERE id = @id')
      .run({
        layout: layout == null ? null : JSON.stringify(layout),
        active: activePanelId,
        now: Date.now(),
        id,
      }).changes > 0,

  remove: (id: string): boolean => getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id).changes > 0,

  removeByWorktree: (worktreeId: string): number =>
    getDb().prepare('DELETE FROM sessions WHERE worktree_id = ?').run(worktreeId).changes,

  transaction: <T>(fn: () => T): T => getDb().transaction(fn)(),
};