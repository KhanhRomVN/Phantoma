import type { SavedQueryInput, SavedQueryRecord } from '../../types';
import { request } from '../client';

export const queriesApi = {
  list: () => request<SavedQueryRecord[]>('GET', '/queries'),
  create: (input: SavedQueryInput) => request<SavedQueryRecord>('POST', '/queries', input),
  update: (id: string, input: Partial<SavedQueryInput>) =>
    request<SavedQueryRecord>('PUT', `/queries/${id}`, input),
  remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/queries/${id}`),
};
