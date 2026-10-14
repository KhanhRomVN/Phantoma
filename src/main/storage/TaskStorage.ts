/**
 * ------------------------------------------------------------------
 * Task Storage — JSON File Based Implementation
 * ------------------------------------------------------------------
 * Stores tasks in ~/.phantoma/code:{slug}/tasks.json
 * Uses atomic write pattern to prevent corruption.
 * No native dependencies required.
 * ------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────

function getProjectSlug(projectPath: string): string {
  return Buffer.from(path.resolve(projectPath)).toString('base64url');
}

function getTasksFilePath(projectPath: string): string {
  const slug = getProjectSlug(projectPath);
  const baseDir = path.join(app.getPath('home'), '.phantoma', `code:${slug}`);
  return path.join(baseDir, 'tasks.json');
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJsonAtomic(filePath: string, data: any) {
  const tmpPath = `${filePath}.tmp`;
  try {
    ensureDir(filePath);
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error('[TaskStorage] Write failed:', err);
    throw err;
  }
}

function readJsonSafe(filePath: string): StoredTask[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('[TaskStorage] Corrupt file, returning empty array.', { filePath, err });
    return [];
  }
}

// ─── Service Class ────────────────────────────────────────────────

class TaskStorageService {
  
  public listTasks(projectPath: string): StoredTask[] {
    const filePath = getTasksFilePath(projectPath);
    return readJsonSafe(filePath);
  }

  public getTask(projectPath: string, taskId: string): StoredTask | undefined {
    const tasks = this.listTasks(projectPath);
    return tasks.find(t => t.id === taskId);
  }

  public createTask(projectPath: string, input: CreateTaskInput): StoredTask {
    const tasks = this.listTasks(projectPath);
    
    const newTask: StoredTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      sessionId: input.sessionId ?? null,
      branchName: input.branchName ?? null,
      dueDate: input.dueDate ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    tasks.push(newTask);
    this.saveTasks(projectPath, tasks);
    return newTask;
  }

  public updateTask(projectPath: string, taskId: string, updates: UpdateTaskInput): StoredTask | undefined {
    const tasks = this.listTasks(projectPath);
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (index === -1) return undefined;

    const existing = tasks[index];
    const updated: StoredTask = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    tasks[index] = updated;
    this.saveTasks(projectPath, tasks);
    return updated;
  }

  public deleteTask(projectPath: string, taskId: string): boolean {
    const tasks = this.listTasks(projectPath);
    const initialLength = tasks.length;
    const filtered = tasks.filter(t => t.id !== taskId);
    
    if (filtered.length === initialLength) return false;

    this.saveTasks(projectPath, filtered);
    return true;
  }

  private saveTasks(projectPath: string, tasks: StoredTask[]) {
    const filePath = getTasksFilePath(projectPath);
    writeJsonAtomic(filePath, tasks);
  }

  // Compatibility method for lifecycle cleanup
  public closeAll(): void {
    // No-op for JSON storage
  }
}

export const taskStorage = new TaskStorageService();