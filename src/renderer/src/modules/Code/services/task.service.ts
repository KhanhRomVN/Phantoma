/**
 * ------------------------------------------------------------------
 * Task Service — Renderer-side wrapper for task:* IPC channels
 * ------------------------------------------------------------------
 * All persistence goes through the main process (tasks.json per project).
 * This module exposes typed async helpers used by TaskManager UI.
 * ------------------------------------------------------------------
 */

// ─── Types (mirrors src/main/storage/TaskStorage.ts) ─────────────────

export type TaskStatus = 'todo' | 'progress' | 'review' | 'done';
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

// ─── IPC ─────────────────────────────────────────────────────────────

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

export const TASKS_CHANGED_EVENT = 'phantoma:tasks-changed';

const notifyChanged =
  <T>(projectPath: string) =>
  (value: T): T => {
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: projectPath }));
    return value;
  };

export const taskService = {
  list: (projectPath: string) => call<StoredTask[]>('task:list', projectPath),
  get: (projectPath: string, taskId: string) => call<StoredTask>('task:get', projectPath, taskId),
  create: (projectPath: string, input: CreateTaskInput) =>
    call<StoredTask>('task:create', projectPath, input).then(notifyChanged(projectPath)),
  update: (projectPath: string, taskId: string, updates: UpdateTaskInput) =>
    call<StoredTask>('task:update', projectPath, taskId, updates).then(notifyChanged(projectPath)),
  delete: (projectPath: string, taskId: string) =>
    call<void>('task:delete', projectPath, taskId).then(notifyChanged(projectPath)),
};