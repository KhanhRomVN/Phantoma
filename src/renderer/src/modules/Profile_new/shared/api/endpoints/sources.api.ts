import type { ProfileSource, SourceInput } from '../../types';
import { request } from '../client';

export const sourcesApi = {
  list: () => request<ProfileSource[]>('GET', '/sources'),
  create: (input: SourceInput & { name: string }) =>
    request<ProfileSource>('POST', '/sources', input),
  update: (id: string, input: SourceInput) =>
    request<ProfileSource>('PUT', `/sources/${id}`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/sources/${id}`),
  import: (input: { name?: string; location: string }) =>
    request<ProfileSource>('POST', '/sources/import', input),
  sync: (id: string) =>
    request<{ found: number; created: number; skipped: number }>('POST', `/sources/${id}/sync`),
};
