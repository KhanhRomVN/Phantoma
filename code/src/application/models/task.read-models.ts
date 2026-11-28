import type { Task, TaskTag, TaskChecklistItem, TaskAttachment } from '../../domain/task/task.types';

// Read models for query results

export type TaskWithDetails = Task & {
  tags: TaskTag[];
  checklist: TaskChecklistItem[];
  attachments: TaskAttachment[];
  dependsOn: string[];
};