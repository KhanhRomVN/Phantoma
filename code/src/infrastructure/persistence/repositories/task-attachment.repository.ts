import { getDb } from '../sqlite/connection';
import { mapTaskAttachment, type Row } from '../mappers/mappers';
import type { TaskAttachment } from '../../../domain/task/task.types';

export interface TaskAttachmentRow {
  id: string;
  taskId: string;
  path: string;
  kind: 'file' | 'folder';
  sortOrder: number;
}

export const taskAttachmentRepository = {
  listByTask: (taskId: string): TaskAttachment[] =>
    (
      getDb()
        .prepare('SELECT * FROM task_attachments WHERE task_id = ? ORDER BY sort_order')
        .all(taskId) as Row[]
    ).map(mapTaskAttachment),

  insert: (a: TaskAttachmentRow): void => {
    getDb()
      .prepare(
        'INSERT INTO task_attachments (id, task_id, path, kind, sort_order) VALUES (@id, @task_id, @path, @kind, @sort_order)',
      )
      .run({ id: a.id, task_id: a.taskId, path: a.path, kind: a.kind, sort_order: a.sortOrder });
  },

  remove: (id: string): boolean =>
    getDb().prepare('DELETE FROM task_attachments WHERE id = ?').run(id).changes > 0,

  removeByTask: (taskId: string): number =>
    getDb().prepare('DELETE FROM task_attachments WHERE task_id = ?').run(taskId).changes,
};