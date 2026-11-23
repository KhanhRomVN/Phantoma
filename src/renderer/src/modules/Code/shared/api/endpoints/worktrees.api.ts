import { request } from '../client';
import type { CodeWorktree, CodeWorktreeInput } from '../types/project.types';

export const worktreesApi = {
  list: (projectId: string) => request<CodeWorktree[]>('GET', `/projects/${projectId}/worktrees`),
  create: (projectId: string, input: CodeWorktreeInput & { path: string }) =>
    request<CodeWorktree>('POST', `/projects/${projectId}/worktrees`, input),
  update: (projectId: string, id: string, input: CodeWorktreeInput) =>
    request<CodeWorktree>('PUT', `/projects/${projectId}/worktrees/${id}`, input),
  remove: (projectId: string, id: string) =>
    request<{ deleted: boolean }>('DELETE', `/projects/${projectId}/worktrees/${id}`),
};
