/**
 * ApiClient — Base HTTP client for Go backend server.
 * Only handles request/response, health check, and base URL management.
 * Resource-specific services (TargetService, ScanService, etc.) use this client.
 *
 * Usage:
 * import { apiClient } from '@/services/ApiClient';
 * const data = await apiClient.request('/api/v1/targets');
 */

import { ApiResponse } from '@renderer/types/api';

const DEFAULT_BASE_URL = 'http://localhost:8080';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Read from localStorage if available, otherwise use default
    const storedUrl = localStorage.getItem('server_url');
    this.baseUrl = baseUrl || (storedUrl ? `http://${storedUrl}` : DEFAULT_BASE_URL);
  }

  /**
   * Update the base URL for API calls.
   * This is called when the user changes the server URL in settings.
   */
  setBaseUrl(url: string): void {
    // Normalize: if the URL doesn't start with http:// or https://, prepend http://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  /**
   * Generic request method for all API calls.
   * Handles JSON parsing, error handling, and response validation.
   */
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    const url = `${this.baseUrl}/health`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      return json?.success === true && json?.data?.status === 'ok';
    } catch {
      return false;
    }
  }
}

// Singleton
export const apiClient = new ApiClient();
export default ApiClient;
