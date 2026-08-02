/**
 * TargetService — CRUD operations for targets.
 * Uses ApiClient as the base HTTP client.
 */

import type { TargetDTO, CreateTargetDTO, UpdateTargetDTO } from '@renderer/types/api';
import { apiClient } from './ApiClient';

class TargetService {
  async getTargets(): Promise<TargetDTO[]> {
    return apiClient.request<TargetDTO[]>('/api/v1/emulate-targets');
  }

  async getTarget(id: string): Promise<TargetDTO> {
    return apiClient.request<TargetDTO>(`/api/v1/emulate-targets/${encodeURIComponent(id)}`);
  }

  async createTarget(input: CreateTargetDTO): Promise<TargetDTO> {
    return apiClient.request<TargetDTO>('/api/v1/emulate-targets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTarget(id: string, input: UpdateTargetDTO): Promise<TargetDTO> {
    return apiClient.request<TargetDTO>(`/api/v1/emulate-targets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteTarget(id: string): Promise<boolean> {
    const result = await apiClient.request<{ deleted: boolean }>(
      `/api/v1/emulate-targets/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    return result?.deleted ?? false;
  }

  async updateLastUsed(id: string): Promise<boolean> {
    const result = await apiClient.request<{ success: boolean }>(
      `/api/v1/emulate-targets/${encodeURIComponent(id)}/use`,
      { method: 'POST' },
    );
    return result?.success ?? false;
  }

  // ─── Filter ───

  async getFilter(targetId: string): Promise<TargetFilterDTO | null> {
    try {
      return await apiClient.request<TargetFilterDTO>(
        `/api/v1/emulate-targets/${encodeURIComponent(targetId)}/filter`,
      );
    } catch {
      return null;
    }
  }

  async saveFilter(targetId: string, input: CreateTargetFilterDTO): Promise<TargetFilterDTO> {
    return apiClient.request<TargetFilterDTO>(
      `/api/v1/emulate-targets/${encodeURIComponent(targetId)}/filter`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    );
  }

  async deleteFilter(targetId: string): Promise<boolean> {
    const result = await apiClient.request<{ deleted: boolean }>(
      `/api/v1/emulate-targets/${encodeURIComponent(targetId)}/filter`,
      { method: 'DELETE' },
    );
    return result?.deleted ?? false;
  }
}

// Types for filter API
export interface TargetFilterDTO {
  id: string;
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

export interface CreateTargetFilterDTO {
  emulate_target_id: string;
  method: string;
  host: string;
  status: string;
  type: string;
}

// Singleton
export const targetService = new TargetService();
export default targetService;