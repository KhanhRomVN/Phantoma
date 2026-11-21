import { getDb } from '../database/connection';
import { mapTask, type Task, type Row } from '../domain/mappers';

export interface TaskRow {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status?: 'todo' | 'progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  sessionId?: string | null;
  branchName?: string | null;
  startDate?: number | null;
  startTime?: string | null;
  endDate?: number | null;
  endTime?: string | null;
  archived?: boolean;
  workflowId?: string | null;
  sortOrder?: number;
}

const COLUMNS: Record<string, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  sessionId: 'session_id',
  branchName: 'branch_name',
  startDate: 'start_date',
  startTime: 'start_time',
  endDate: 'end_date',
  endTime: 'end_time',
  archived: 'archived',
  workflowId: 'workflow_id',
  sortOrder: 'sort_order',
};

function encode(key: string, value: unknown): unknown {
  return key === 'archived' ? (value ? 1 : 0) : value;
}

export const taskRepository = {
  listByProject: (projectId: string): Task[] =>
    (
      getDb()
        .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order, created_at')
        .all(projectId) as Row[]
    ).map(mapTask),

  get: (id: string): Task | null => {
    const row = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Row | undefined;
    return row ? mapTask(row) : null;
  },

  insert: (t: TaskRow): void => {
    const now = Date.now();
    getDb()
      .prepare(
        'INSERT INTO tasks (id, project_id, title, description, status, priority, session_id, branch_name, start_date, start_time, end_date, end_time, archived, workflow_id, sort_order, created_at, updated_at) VALUES (@id, @project_id, @title, @description, @status, @priority, @session_id, @branch_name, @start_date, @start_time, @end_date, @end_time, @archived, @workflow_id, @sort_order, @now, @now)',
      )
      .run({
        id: t.id,
        project_id: t.projectId,
        title: t.title,
        description: t.description ?? '',
        status: t.status ?? 'todo',
        priority: t.priority ?? 'medium',
        session_id: t.sessionId ?? null,
        branch_name: t.branchName ?? null,
        start_date: t.startDate ?? null,
        start_time: t.startTime ?? null,
        end_date: t.endDate ?? null,
        end_time: t.endTime ?? null,
        archived: t.archived ? 1 : 0,
        workflow_id: t.workflowId ?? null,
        sort_order: t.sortOrder ?? now,
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
        .prepare(`UPDATE tasks SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...sets, id }).changes > 0
    );
  },

  remove: (id: string): boolean => getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0,

  transaction: <T>(fn: () => T): T => getDb().transaction(fn)(),
};