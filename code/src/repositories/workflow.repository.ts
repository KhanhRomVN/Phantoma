import { getDb } from '../database/connection';
import { mapWorkflow, type Workflow, type Row } from '../domain/mappers';

export interface WorkflowRow {
  id: string;
  taskId: string;
  content: string;
}

export const workflowRepository = {
  getByTask: (taskId: string): Workflow | null => {
    const row = getDb().prepare('SELECT * FROM workflows WHERE task_id = ?').get(taskId) as Row | undefined;
    return row ? mapWorkflow(row) : null;
  },

  insert: (w: WorkflowRow): void => {
    const now = Date.now();
    getDb()
      .prepare(
        'INSERT INTO workflows (id, task_id, content, created_at, updated_at) VALUES (@id, @task_id, @content, @now, @now)',
      )
      .run({ id: w.id, task_id: w.taskId, content: w.content, now });
  },

  update: (taskId: string, content: string): boolean => {
    return (
      getDb()
        .prepare('UPDATE workflows SET content = @content, updated_at = @now WHERE task_id = @task_id')
        .run({ content, now: Date.now(), task_id: taskId }).changes > 0
    );
  },

  remove: (taskId: string): boolean =>
    getDb().prepare('DELETE FROM workflows WHERE task_id = ?').run(taskId).changes > 0,
};