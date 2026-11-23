import { request } from '../client';
import type { CodeWorkflow } from '../types/workflow.types';

export const workflowsApi = {
  get: (taskId: string) => request<CodeWorkflow>('GET', `/tasks/${taskId}/workflow`),
  create: (taskId: string, content: string) =>
    request<CodeWorkflow>('POST', `/tasks/${taskId}/workflow`, { content }),
  update: (taskId: string, oldContent: string, newContent: string) =>
    request<CodeWorkflow>('PUT', `/tasks/${taskId}/workflow`, { oldContent, newContent }),
};
