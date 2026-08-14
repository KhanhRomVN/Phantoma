/**
 * ------------------------------------------------------------------
 * Task Types
 * ------------------------------------------------------------------
 * Type definitions for todo task management system.
 * Tasks follow a workflow: pending → in_progress → review → completed
 * ------------------------------------------------------------------
 */

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  reviewNotes?: string;
  completedAt?: number;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  search?: string;
}
