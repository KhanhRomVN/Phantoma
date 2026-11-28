// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { request } from '../client';

// ── Types ──
import type { CodeWorkflow } from '../types/workflow.types';

// ─── Constants ───────────────────────────────────────────────────────────────
export const workflowsApi = {
  get: (taskId: string) => request<CodeWorkflow>('GET', `/tasks/${taskId}/workflow`),
  create: (taskId: string, content: string) =>
    request<CodeWorkflow>('POST', `/tasks/${taskId}/workflow`, { content }),
  update: (taskId: string, oldContent: string, newContent: string) =>
    request<CodeWorkflow>('PUT', `/tasks/${taskId}/workflow`, { oldContent, newContent }),
};
