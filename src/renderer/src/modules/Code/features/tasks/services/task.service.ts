import { codeApi, type CodeTask } from '../../../shared/api/code.api';
import { useCodeStore } from '../../../shared/stores/code.store';

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