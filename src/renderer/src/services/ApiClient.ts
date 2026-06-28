/**
 * API Client — giao tiếp với Go backend server.
 * 
 * Usage:
 * import { apiClient } from '@/services/ApiClient';
 * const targets = await apiClient.getTargets();
 */

import type {
  TargetDTO,
  CreateTargetDTO,
  UpdateTargetDTO,
  ApiResponse,
} from '@app/api/types';

const BASE_URL = 'http://localhost:8080';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const json: ApiResponse<T> = await res.json();

    if (!json.success) {
      throw new Error(json.error || `API error: ${res.status}`);
    }

    return json.data as T;
  }

  // ── Health ──────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      const json = await res.json();
      return json?.status === 'ok';
    } catch {
      return false;
    }
  }

  // ── Targets CRUD ────────────────────────────────────────────────

  async getTargets(): Promise<TargetDTO[]> {
    return this.request<TargetDTO[]>('/api/v1/targets');
  }

  async getTarget(id: string): Promise<TargetDTO> {
    return this.request<TargetDTO>(`/api/v1/targets/${encodeURIComponent(id)}`);
  }

  async createTarget(input: CreateTargetDTO): Promise<TargetDTO> {
    return this.request<TargetDTO>('/api/v1/targets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTarget(id: string, input: UpdateTargetDTO): Promise<TargetDTO> {
    return this.request<TargetDTO>(`/api/v1/targets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteTarget(id: string): Promise<boolean> {
    const result = await this.request<{ deleted: boolean }>(
      `/api/v1/targets/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    return result?.deleted ?? false;
  }
}

// Singleton
export const apiClient = new ApiClient();
export default ApiClient;