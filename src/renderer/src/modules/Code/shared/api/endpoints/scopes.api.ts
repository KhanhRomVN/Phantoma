// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { request } from '../client';

// ─── Constants ───────────────────────────────────────────────────────────────
export const scopesApi = {
  list: (worktreeId: string) =>
    request<Array<{ id: string; worktreeId: string; path: string; createdAt: string }>>(
      'GET',
      `/worktrees/${worktreeId}/scopes`,
    ),
  set: (worktreeId: string, paths: string[]) =>
    request<Array<{ id: string; worktreeId: string; path: string; createdAt: string }>>(
      'PUT',
      `/worktrees/${worktreeId}/scopes`,
      { paths },
    ),
  get: (worktreeId: string, scopeId: string) =>
    request<{ id: string; worktreeId: string; path: string; createdAt: string }>(
      'GET',
      `/worktrees/${worktreeId}/scopes/${scopeId}`,
    ),
  remove: (worktreeId: string, scopeId: string) =>
    request<{ deleted: boolean }>('DELETE', `/worktrees/${worktreeId}/scopes/${scopeId}`),
};
