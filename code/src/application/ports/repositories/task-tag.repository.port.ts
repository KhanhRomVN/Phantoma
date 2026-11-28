import type { TaskTag } from '../../../domain/task/task.types';

export interface TaskTagRecordInput {
  id: string;
  taskId: string;
  label: string;
  color: string;
}

export interface TaskTagRepositoryPort {
  listByTask(taskId: string): TaskTag[];
  insert(t: TaskTagRecordInput): void;
  remove(id: string): boolean;
  removeByTask(taskId: string): number;
}