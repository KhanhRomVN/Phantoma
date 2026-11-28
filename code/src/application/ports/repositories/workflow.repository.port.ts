import type { Workflow } from '../../../domain/workflow/workflow.types';

export interface WorkflowRecordInput {
  id: string;
  taskId: string;
  content: string;
}

export interface WorkflowRepositoryPort {
  getByTask(taskId: string): Workflow | null;
  insert(w: WorkflowRecordInput): void;
  update(taskId: string, content: string): boolean;
  remove(taskId: string): boolean;
}