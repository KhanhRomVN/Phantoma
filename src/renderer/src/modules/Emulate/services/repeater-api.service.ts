// Repeater API Service — HTTP client for Go backend repeater endpoints.
// Uses apiClient to call REST API at /api/v1/emulate-targets/{targetId}/repeater/...
import { apiClient } from '@renderer/services/ApiClient';
import type { ApiResponse } from '@renderer/types/api';

// =============================================================================
// Domain types — mirror server/internal/domain/emulate/repeater.go
// =============================================================================

export interface RepeaterRequest {
  id: string;
  emulate_target_id: string;
  method: string;
  url: string;
  body: string;
  params: string;   // JSON array of ParamItem
  headers: string;  // JSON array of HeaderItem
  created_at: number;
  updated_at: number;
}

export interface CreateRepeaterRequestInput {
  method: string;
  url: string;
  body?: string;
  params?: string;
  headers?: string;
}

export interface UpdateRepeaterRequestInput {
  method?: string;
  url?: string;
  body?: string;
  params?: string;
  headers?: string;
}

export interface RepeaterPayload {
  id: string;
  emulate_repeater_request_id: string;
  name: string;
  payload_values: string;
  enabled: number;
  created_at: number;
}

export interface UpsertRepeaterPayloadInput {
  name: string;
  payload_values?: string;
  enabled?: number;
}

export interface RepeaterHistory {
  id: string;
  emulate_repeater_request_id: string | null;
  method: string;
  url: string;
  status: number | null;
  statuses: string;       // JSON object
  timestamp: number;
  end_time: number | null;
  duration: number;
  payload_count: number;
  payload_summary: string;
  request_headers: string; // JSON object
  request_body: string;
  created_at: number;
}

export interface CreateRepeaterHistoryInput {
  method: string;
  url: string;
  status?: number;
  statuses?: string;
  timestamp: number;
  end_time?: number;
  duration?: number;
  payload_count?: number;
  payload_summary?: string;
  request_headers?: string;
  request_body?: string;
}

export interface RepeaterHistoryRun {
  id: string;
  history_id: string;
  payload_name: string;
  payload_value: string;
  status: number | null;
  duration: number | null;
  method: string;
  url: string;
  params: string;           // JSON object
  request_headers: string;  // JSON object
  request_body: string;
  response_headers: string; // JSON object
  response_body: string;
  created_at: number;
}

export interface CreateRepeaterHistoryRunInput {
  payload_name: string;
  payload_value: string;
  status?: number;
  duration?: number;
  method?: string;
  url?: string;
  params?: string;
  request_headers?: string;
  request_body?: string;
  response_headers?: string;
  response_body?: string;
}

export interface SaveHistoryInput {
  history: CreateRepeaterHistoryInput;
  runs: CreateRepeaterHistoryRunInput[];
}

// =============================================================================
// API Service
// =============================================================================

class RepeaterApi {
  private basePath(targetId: string): string {
    return `/api/v1/emulate-targets/${targetId}/repeater`;
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ── Requests ──────────────────────────────────────────────────

  async listRequests(targetId: string): Promise<ApiResponse<RepeaterRequest[]>> {
    return this.wrap(() =>
      apiClient.request<RepeaterRequest[]>(`${this.basePath(targetId)}/requests`),
    );
  }

  async getRequest(targetId: string, requestId: string): Promise<ApiResponse<RepeaterRequest>> {
    return this.wrap(() =>
      apiClient.request<RepeaterRequest>(`${this.basePath(targetId)}/requests/${requestId}`),
    );
  }

  async createRequest(
    targetId: string,
    input: CreateRepeaterRequestInput,
  ): Promise<ApiResponse<RepeaterRequest>> {
    return this.wrap(() =>
      apiClient.request<RepeaterRequest>(`${this.basePath(targetId)}/requests`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  }

  async updateRequest(
    targetId: string,
    requestId: string,
    input: UpdateRepeaterRequestInput,
  ): Promise<ApiResponse<RepeaterRequest>> {
    return this.wrap(() =>
      apiClient.request<RepeaterRequest>(`${this.basePath(targetId)}/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    );
  }

  async deleteRequest(
    targetId: string,
    requestId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      apiClient.request<{ deleted: boolean }>(`${this.basePath(targetId)}/requests/${requestId}`, {
        method: 'DELETE',
      }),
    );
  }

  // ── Payloads ──────────────────────────────────────────────────

  async listPayloads(
    targetId: string,
    requestId: string,
  ): Promise<ApiResponse<RepeaterPayload[]>> {
    return this.wrap(() =>
      apiClient.request<RepeaterPayload[]>(
        `${this.basePath(targetId)}/requests/${requestId}/payloads`,
      ),
    );
  }

  async upsertPayload(
    targetId: string,
    requestId: string,
    input: UpsertRepeaterPayloadInput,
  ): Promise<ApiResponse<RepeaterPayload>> {
    return this.wrap(() =>
      apiClient.request<RepeaterPayload>(
        `${this.basePath(targetId)}/requests/${requestId}/payloads`,
        { method: 'PUT', body: JSON.stringify(input) },
      ),
    );
  }

  async deletePayload(
    targetId: string,
    requestId: string,
    payloadId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      apiClient.request<{ deleted: boolean }>(
        `${this.basePath(targetId)}/requests/${requestId}/payloads/${payloadId}`,
        { method: 'DELETE' },
      ),
    );
  }

  // ── History ───────────────────────────────────────────────────

  async listHistoryByTarget(targetId: string): Promise<ApiResponse<RepeaterHistory[]>> {
    return this.wrap(() =>
      apiClient.request<RepeaterHistory[]>(`${this.basePath(targetId)}/history`),
    );
  }

  async listHistoryByRequest(
    targetId: string,
    requestId: string,
  ): Promise<ApiResponse<RepeaterHistory[]>> {
    return this.wrap(() =>
      apiClient.request<RepeaterHistory[]>(
        `${this.basePath(targetId)}/requests/${requestId}/history`,
      ),
    );
  }

  async saveHistory(
    targetId: string,
    requestId: string,
    input: SaveHistoryInput,
  ): Promise<ApiResponse<RepeaterHistory>> {
    return this.wrap(() =>
      apiClient.request<RepeaterHistory>(
        `${this.basePath(targetId)}/requests/${requestId}/history`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    );
  }

  async getHistoryRuns(
    targetId: string,
    historyId: string,
  ): Promise<ApiResponse<RepeaterHistoryRun[]>> {
    return this.wrap(() =>
      apiClient.request<RepeaterHistoryRun[]>(
        `${this.basePath(targetId)}/history/${historyId}/runs`,
      ),
    );
  }

  async deleteHistory(
    targetId: string,
    historyId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.wrap(() =>
      apiClient.request<{ deleted: boolean }>(`${this.basePath(targetId)}/history/${historyId}`, {
        method: 'DELETE',
      }),
    );
  }
}

export const repeaterApi = new RepeaterApi();
export default repeaterApi;