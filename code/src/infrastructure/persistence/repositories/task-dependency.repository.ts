import { getDb } from '../sqlite/connection';

export const taskDependencyRepository = {
  listByTask: (taskId: string): string[] =>
    (getDb().prepare('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?').all(taskId) as any[]).map(
      (r) => r.depends_on_id as string,
    ),

  insert: (taskId: string, dependsOnId: string): void => {
    try {
      getDb()
        .prepare('INSERT INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)')
        .run(taskId, dependsOnId);
    } catch {
      // Ignore duplicate
    }
  },

  remove: (taskId: string, dependsOnId: string): boolean =>
    getDb().prepare('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?').run(taskId, dependsOnId)
      .changes > 0,

  removeByTask: (taskId: string): number =>
    getDb().prepare('DELETE FROM task_dependencies WHERE task_id = ?').run(taskId).changes,
};