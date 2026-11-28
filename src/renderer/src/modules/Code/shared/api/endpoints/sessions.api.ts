// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { request } from '../client';

// ── Types ──
import type { CodeWorkspaceInput, CodeSession, CodeSessionInput } from '../types/session.types';

// ─── Constants ───────────────────────────────────────────────────────────────
export const sessionsApi = {
  create: (input: CodeSessionInput) => request<CodeSession>('POST', '/sessions', input),
  update: (id: string, input: CodeSessionInput) =>
    request<CodeSession>('PUT', `/sessions/${id}`, input),
  saveWorkspace: (id: string, input: CodeWorkspaceInput) =>
    request<CodeSession>('PUT', `/sessions/${id}/workspace`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/sessions/${id}`),
};
