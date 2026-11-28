import type { Task } from '../../../domain/task/task.types';

export interface TaskRecordInput {
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

export interface TaskRepositoryPort {
  listByProject(projectId: string): Task[];
  get(id: string): Task | null;
  insert(t: TaskRecordInput): void;
  update(id: string, patch: Record<string, unknown>): boolean;
  remove(id: string): boolean;
  transaction<T>(fn: () => T): T;
}