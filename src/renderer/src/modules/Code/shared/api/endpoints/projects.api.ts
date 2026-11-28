// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { request } from '../client';

// ── Types ──
import type { CodeProject, CodeProjectInput } from '../types/project.types';

// ─── Constants ───────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => request<CodeProject[]>('GET', '/projects'),
  get: (id: string) => request<CodeProject>('GET', `/projects/${id}`),
  create: (input: CodeProjectInput & { name: string }) =>
    request<CodeProject>('POST', '/projects', input),
  update: (id: string, input: CodeProjectInput) =>
    request<CodeProject>('PUT', `/projects/${id}`, input),
  saveAll: (projects: CodeProjectInput[]) =>
    request<CodeProject[]>('PUT', '/projects', { projects }),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/projects/${id}`),
};
