import { getDb } from '../sqlite/connection';
import { mapTaskTag, type Row } from '../mappers/mappers';
import type { TaskTag } from '../../../domain/task/task.types';

export interface TaskTagRow {
  id: string;
  taskId: string;
  label: string;
  color: string;
}

export const taskTagRepository = {
  listByTask: (taskId: string): TaskTag[] =>
    (getDb().prepare('SELECT * FROM task_tags WHERE task_id = ?').all(taskId) as Row[]).map(mapTaskTag),

  insert: (t: TaskTagRow): void => {
    getDb()
      .prepare('INSERT INTO task_tags (id, task_id, label, color) VALUES (@id, @task_id, @label, @color)')
      .run({ id: t.id, task_id: t.taskId, label: t.label, color: t.color });
  },

  remove: (id: string): boolean => getDb().prepare('DELETE FROM task_tags WHERE id = ?').run(id).changes > 0,

  removeByTask: (taskId: string): number =>
    getDb().prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId).changes,
};