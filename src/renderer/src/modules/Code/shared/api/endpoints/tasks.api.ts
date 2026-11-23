import { request } from '../client';
import type { CodeTask, CodeTaskInput, CodeTaskUpdateInput } from '../types/task.types';

export const tasksApi = {
  list: (projectId: string) => request<CodeTask[]>('GET', `/projects/${projectId}/tasks`),
  get: (projectId: string, taskId: string) =>
    request<CodeTask>('GET', `/projects/${projectId}/tasks/${taskId}`),
  create: (projectId: string, input: CodeTaskInput) =>
    request<CodeTask>('POST', `/projects/${projectId}/tasks`, input),
  update: (projectId: string, taskId: string, input: CodeTaskUpdateInput) =>
    request<CodeTask>('PUT', `/projects/${projectId}/tasks/${taskId}`, input),
  remove: (projectId: string, taskId: string) =>
    request<{ deleted: boolean }>('DELETE', `/projects/${projectId}/tasks/${taskId}`),
};
