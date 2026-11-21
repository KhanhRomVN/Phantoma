import { getDb } from '../database/connection';
import { mapTaskChecklistItem, type TaskChecklistItem, type Row } from '../domain/mappers';

export interface TaskChecklistRow {
  id: string;
  taskId: string;
  text: string;
  done: boolean;
  sortOrder: number;
}

export const taskChecklistRepository = {
  listByTask: (taskId: string): TaskChecklistItem[] =>
    (
      getDb().prepare('SELECT * FROM task_checklist WHERE task_id = ? ORDER BY sort_order').all(taskId) as Row[]
    ).map(mapTaskChecklistItem),

  insert: (item: TaskChecklistRow): void => {
    getDb()
      .prepare(
        'INSERT INTO task_checklist (id, task_id, text, done, sort_order) VALUES (@id, @task_id, @text, @done, @sort_order)',
      )
      .run({
        id: item.id,
        task_id: item.taskId,
        text: item.text,
        done: item.done ? 1 : 0,
        sort_order: item.sortOrder,
      });
  },

  update: (id: string, patch: { text?: string; done?: boolean }): boolean => {
    const sets: Record<string, unknown> = {};
    if (patch.text !== undefined) sets.text = patch.text;
    if (patch.done !== undefined) sets.done = patch.done ? 1 : 0;
    const cols = Object.keys(sets);
    if (cols.length === 0) return false;
    return (
      getDb()
        .prepare(`UPDATE task_checklist SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...sets, id }).changes > 0
    );
  },

  remove: (id: string): boolean =>
    getDb().prepare('DELETE FROM task_checklist WHERE id = ?').run(id).changes > 0,

  removeByTask: (taskId: string): number =>
    getDb().prepare('DELETE FROM task_checklist WHERE task_id = ?').run(taskId).changes,
};