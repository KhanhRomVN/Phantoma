import { TASKS_CHANGED_EVENT } from './task.service';

export interface WorkflowInfo {
  workflowId: string;
  taskId: string;
  content: string;
}

export interface WorkflowRef {
  workflowId: string;
  taskId: string;
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

const notifyChanged =
  <T>(projectPath: string) =>
  (value: T): T => {
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: projectPath }));
    return value;
  };

export const workflowService = {
  get: (projectPath: string, taskId: string) =>
    call<WorkflowInfo>('workflow:get', projectPath, taskId),
  create: (projectPath: string, taskId: string, content: string) =>
    call<WorkflowRef>('workflow:create', projectPath, taskId, content).then(
      notifyChanged(projectPath),
    ),
  update: (projectPath: string, taskId: string, oldContent: string, newContent: string) =>
    call<WorkflowInfo>('workflow:update', projectPath, taskId, oldContent, newContent).then(
      notifyChanged(projectPath),
    ),
};