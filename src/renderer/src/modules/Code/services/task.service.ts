/**
 * ------------------------------------------------------------------
 * Task Service — Renderer-side wrapper for task:* IPC channels
 * ------------------------------------------------------------------
 * All persistence goes through the main process (tasks.json per project).
 * This module exposes typed async helpers used by TaskManager UI.
 * ------------------------------------------------------------------
 */

// ─── Types (mirrors src/main/storage/TaskStorage.ts) ─────────────────

export type TaskStatus = 'todo' | 'progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskTag {
  id: string;
  label: string;
  color: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskAttachment {
  path: string;
  kind: 'file' | 'folder';
}

export interface TaskExtras {
  tags: TaskTag[];
  checklist: TaskChecklistItem[];
  attachments: TaskAttachment[];
}

export const dialogService = {
  selectPaths: async (kind: 'file' | 'folder', multiple = true): Promise<string[]> => {
    const res = await window.api.invoke('dialog:select-paths', { kind, multiple });
    return res?.success ? (res.paths as string[]) : [];
  },
};

export interface StoredTask extends TaskExtras {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  sessionId: string | null;
  branchName: string | null;
  startDate: number | null;
  startTime: string | null;
  endDate: number | null;
  endTime: string | null;
  dependsOn: string[];
  archived: boolean;
  workflowId: string | null;
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTaskInput extends Partial<TaskExtras> {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sessionId?: string | null;
  branchName?: string | null;
  startDate?: number | null;
  startTime?: string | null;
  endDate?: number | null;
  endTime?: string | null;
  dependsOn?: string[];
}

export interface UpdateTaskInput extends Partial<TaskExtras> {
  archived?: boolean;
  order?: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sessionId?: string | null;
  branchName?: string | null;
  startDate?: number | null;
  startTime?: string | null;
  endDate?: number | null;
  endTime?: string | null;
  dependsOn?: string[];
}

// ─── Schedule & dependency helpers ───────────────────────────────────

type Schedule = Pick<StoredTask, 'startDate' | 'startTime' | 'endDate' | 'endTime'>;
type DependencyNode = Pick<StoredTask, 'id' | 'dependsOn'>;

function atTime(day: number, time: string | null, endOfDay: boolean): number {
  const d = new Date(day);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  } else if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime();
}

export const getTaskStartMs = (t: Schedule): number | null =>
  t.startDate === null ? null : atTime(t.startDate, t.startTime, false);

export const getTaskEndMs = (t: Schedule): number | null =>
  t.endDate === null ? null : atTime(t.endDate, t.endTime, true);

export const isTaskOverdue = (t: Schedule & Pick<StoredTask, 'status'>): boolean => {
  const end = getTaskEndMs(t);
  return end !== null && end < Date.now() && t.status !== 'done';
};

const formatDayMonth = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export function formatTaskRange(t: Schedule): string | null {
  const start =
    t.startDate !== null
      ? `${formatDayMonth(t.startDate)}${t.startTime ? ` ${t.startTime}` : ''}`
      : null;
  const end =
    t.endDate !== null ? `${formatDayMonth(t.endDate)}${t.endTime ? ` ${t.endTime}` : ''}` : null;
  if (start && end) return `${start} → ${end}`;
  return end ?? start;
}

export function getBlockers(task: Pick<StoredTask, 'dependsOn'>, all: StoredTask[]): StoredTask[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  const blockers = new Map<string, StoredTask>();
  const seen = new Set<string>();
  const walk = (ids: string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const t = byId.get(id);
      if (!t) continue;
      if (t.archived) walk(t.dependsOn ?? []);
      else if (t.status !== 'done') blockers.set(t.id, t);
    }
  };
  walk(task.dependsOn ?? []);
  return [...blockers.values()];
}

export function getUnfinishedChain(
  task: Pick<StoredTask, 'dependsOn'>,
  all: StoredTask[],
): StoredTask[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  const chain: StoredTask[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const t = byId.get(id);
    if (!t) return;
    if (!t.archived && t.status === 'done') return;
    (t.dependsOn ?? []).forEach(visit);
    if (!t.archived) chain.push(t);
  };
  (task.dependsOn ?? []).forEach(visit);
  return chain;
}

export function getAncestorIds(taskId: string, all: DependencyNode[]): Set<string> {
  const byId = new Map(all.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const stack = [...(byId.get(taskId)?.dependsOn ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(byId.get(id)?.dependsOn ?? []));
  }
  return seen;
}

export function getDescendantIds(taskId: string, all: DependencyNode[]): Set<string> {
  const seen = new Set<string>();
  const stack = [taskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const t of all) {
      if ((t.dependsOn ?? []).includes(current) && !seen.has(t.id)) {
        seen.add(t.id);
        stack.push(t.id);
      }
    }
  }
  return seen;
}

// ─── API integration ─────────────────────────────────────────────────

import { codeApi, type CodeTask } from './code-api.service';
import { useCodeStore } from '../hooks/useCodeStore';

export const TASKS_CHANGED_EVENT = 'phantoma:tasks-changed';

function mapCodeTaskToStored(task: CodeTask): StoredTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    sessionId: task.sessionId,
    branchName: task.branchName,
    startDate: task.startDate,
    startTime: task.startTime,
    endDate: task.endDate,
    endTime: task.endTime,
    dependsOn: task.dependsOn,
    archived: task.archived,
    workflowId: task.workflowId,
    order: task.sortOrder,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    tags: task.tags,
    checklist: task.checklist,
    attachments: task.attachments,
  };
}

async function getProjectIdByPath(projectPath: string): Promise<string> {
  // ASSUMED: id server = id localStorage (useProjectSync tạo project với id local), nên map path -> id qua store thay vì so khớp worktree.path
  const local = useCodeStore.getState().projects.find((p) => p.path === projectPath);
  if (local) return local.id;
  const projects = await codeApi.projects.list();
  const project = projects.find((p) => p.worktrees.some((w) => w.path === projectPath));
  if (!project) throw new Error(`Project not found for path: ${projectPath}`);
  return project.id;
}

const notifyChanged = (projectPath: string) => {
  window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: projectPath }));
};

export const taskService = {
  list: async (projectPath: string): Promise<StoredTask[]> => {
    const projectId = await getProjectIdByPath(projectPath);
    const tasks = await codeApi.tasks.list(projectId);
    return tasks.map(mapCodeTaskToStored);
  },

  get: async (projectPath: string, taskId: string): Promise<StoredTask> => {
    const projectId = await getProjectIdByPath(projectPath);
    const task = await codeApi.tasks.get(projectId, taskId);
    return mapCodeTaskToStored(task);
  },

  create: async (projectPath: string, input: CreateTaskInput): Promise<StoredTask> => {
    const projectId = await getProjectIdByPath(projectPath);
    const task = await codeApi.tasks.create(projectId, input);
    notifyChanged(projectPath);
    return mapCodeTaskToStored(task);
  },

  update: async (projectPath: string, taskId: string, updates: UpdateTaskInput): Promise<StoredTask> => {
    const projectId = await getProjectIdByPath(projectPath);
    const task = await codeApi.tasks.update(projectId, taskId, updates);
    notifyChanged(projectPath);
    return mapCodeTaskToStored(task);
  },

  delete: async (projectPath: string, taskId: string): Promise<void> => {
    const projectId = await getProjectIdByPath(projectPath);
    await codeApi.tasks.remove(projectId, taskId);
    notifyChanged(projectPath);
  },
};