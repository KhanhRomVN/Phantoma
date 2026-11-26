import type {
  ImportJob,
  Profile,
  ProfileInput,
  TransferJob,
  TransferOutcome,
  TransferPlanItem,
} from '../../types';
import { request } from '../client';

export const profilesApi = {
  list: (opts: { sourceId?: string; full?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (opts.sourceId) q.set('sourceId', opts.sourceId);
    if (opts.full) q.set('full', 'true');
    const qs = q.toString();
    return request<Profile[]>('GET', `/profiles${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<Profile>('GET', `/profiles/${id}?full=true`),
  create: (input: ProfileInput & { sourceId: string; email: string }) =>
    request<Profile>('POST', '/profiles', input),
  createMany: (profiles: (ProfileInput & { sourceId: string; email: string })[]) =>
    request<Profile[]>('POST', '/profiles/bulk', { profiles }),
  update: (id: string, input: ProfileInput) =>
    request<Profile>('PUT', `/profiles/${id}`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/profiles/${id}`),
  removeMany: (ids: string[]) =>
    request<{ deleted: number }>('POST', '/profiles/bulk-delete', { ids }),
  updateMany: (
    target: { ids: string[] } | { where: { group: string } },
    patch: ProfileInput,
  ) => request<{ updated: number }>('POST', '/profiles/bulk-update', { ...target, patch }),
  transfer: (input: {
    ids: string[];
    targetId: string;
    mode: 'move' | 'duplicate';
    policy: string;
    policies?: Record<string, string>;
  }) =>
    request<TransferOutcome>('POST', '/profiles/transfer', input),
  transferPreview: (ids: string[], targetId: string) =>
    request<TransferPlanItem[]>('POST', '/profiles/transfer/preview', { ids, targetId }),
  transferJob: {
    start: (input: {
      ids: string[];
      targetId: string;
      mode: 'move' | 'duplicate';
      policy: string;
      policies?: Record<string, string>;
    }) => request<TransferJob>('POST', '/profiles/transfer/jobs', input),
    get: (id: string) => request<TransferJob>('GET', `/profiles/transfer/jobs/${id}`),
    cancel: (id: string) => request<TransferJob>('POST', `/profiles/transfer/jobs/${id}/cancel`),
  },
  importJob: {
    start: (input: { path: string; targetId: string; folders: string[] }) =>
      request<ImportJob>('POST', '/profiles/import/jobs', input),
    get: (id: string) => request<ImportJob>('GET', `/profiles/import/jobs/${id}`),
    cancel: (id: string) => request<ImportJob>('POST', `/profiles/import/jobs/${id}/cancel`),
  },
  openFolder: (id: string) => request<{ path: string }>('POST', `/profiles/${id}/open-folder`),
};
