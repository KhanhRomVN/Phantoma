import type { TaskAttachment } from '../../../domain/task/task.types';

export interface TaskAttachmentRecordInput {
  id: string;
  taskId: string;
  path: string;
  kind: 'file' | 'folder';
  sortOrder: number;
}

export interface TaskAttachmentRepositoryPort {
  listByTask(taskId: string): TaskAttachment[];
  insert(a: TaskAttachmentRecordInput): void;
  remove(id: string): boolean;
  removeByTask(taskId: string): number;
}