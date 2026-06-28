/**
 * TargetService — CRUD operations for targets.
 * Uses ApiClient as the base HTTP client.
 */

import type { TargetDTO, CreateTargetDTO, UpdateTargetDTO } from '@app/api/types';
import { apiClient } from './ApiClient';

class TargetService {
  async getTargets(): Promise<TargetDTO[]> {
    return apiClient.request<TargetDTO[]>('/api/v1/targets');
  }

  async getTarget(id: string): Promise<TargetDTO> {
    return apiClient.request<TargetDTO>(`/api/v1/targets/${encodeURIComponent(id)}`);
  }

  async createTarget(input: CreateTargetDTO): Promise<TargetDTO> {
    return apiClient.request<TargetDTO>('/api/v1/targets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTarget(id: string, input: UpdateTargetDTO): Promise<TargetDTO> {
    return apiClient.request<TargetDTO>(`/api/v1/targets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteTarget(id: string): Promise<boolean> {
    const result = await apiClient.request<{ deleted: boolean }>(
      `/api/v1/targets/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    return result?.deleted ?? false;
  }

  async updateLastUsed(id: string): Promise<boolean> {
    const result = await apiClient.request<{ success: boolean }>(
      `/api/v1/targets/${encodeURIComponent(id)}/use`,
      { method: 'POST' },
    );
    return result?.success ?? false;
  }
}

// Singleton
export const targetService = new TargetService();
export default targetService;