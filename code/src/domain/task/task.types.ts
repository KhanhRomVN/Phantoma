export type TaskStatus = 'todo' | 'progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  projectId: string;
  workflowId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  sessionId: string | null;
  branchName: string | null;
  startDate: number | null;
  startTime: string | null;
  endDate: number | null;
  endTime: string | null;
  archived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskTag {
  id: string;
  taskId: string;
  label: string;
  color: string;
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  text: string;
  done: boolean;
  sortOrder: number;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  path: string;
  kind: 'file' | 'folder';
  sortOrder: number;
}