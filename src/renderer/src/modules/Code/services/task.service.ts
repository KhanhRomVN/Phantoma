/**
 * ------------------------------------------------------------------
 * Task Service — Renderer-side wrapper for task:* IPC channels
 * ------------------------------------------------------------------
 * All persistence goes through SQLite in the main process.
 * This module exposes typed async helpers used by TaskManager UI.
 * ------------------------------------------------------------------
 */

// ─── Types (mirrors src/main/services/TaskStorage.ts) ────────────────

export type TaskStatus = 'todo' | 'progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface StoredTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  sessionId: string | null;
  branchName: string | null;
  dueDate: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sessionId?: string | null;
  branchName?: string | null;
  dueDate?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sessionId?: string | null;
  branchName?: string | null;
  dueDate?: number | null;
}

interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function call<T>(channel: string, ...args: any[]): Promise<T> {
  const res: IpcResult<T> = await window.api.invoke(channel, ...args);
  if (!res.success) throw new Error(res.error || `IPC ${channel} failed`);
  return res.data as T;
}

export const taskService = {
  list: (projectPath: string) => call<StoredTask[]>('task:list', projectPath),
  get: (projectPath: string, taskId: string) => call<StoredTask>('task:get', projectPath, taskId),
  create: (projectPath: string, input: CreateTaskInput) =>
    call<StoredTask>('task:create', projectPath, input),
  update: (projectPath: string, taskId: string, updates: UpdateTaskInput) =>
    call<StoredTask>('task:update', projectPath, taskId, updates),
  delete: (projectPath: string, taskId: string) =>
    call<void>('task:delete', projectPath, taskId),
};