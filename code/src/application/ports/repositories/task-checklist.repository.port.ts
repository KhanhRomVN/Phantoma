import type { TaskChecklistItem } from '../../../domain/task/task.types';

export interface TaskChecklistRecordInput {
  id: string;
  taskId: string;
  text: string;
  done: boolean;
  sortOrder: number;
}

export interface TaskChecklistRepositoryPort {
  listByTask(taskId: string): TaskChecklistItem[];
  insert(item: TaskChecklistRecordInput): void;
  update(id: string, patch: { text?: string; done?: boolean }): boolean;
  remove(id: string): boolean;
  removeByTask(taskId: string): number;
}