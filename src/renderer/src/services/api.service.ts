/**
 * ------------------------------------------------------------------
 * API Service
 * ------------------------------------------------------------------
 * Base HTTP client cho Go backend server. Chỉ xử lý request/response,
 * health check, và quản lý base URL. Các service cụ thể theo resource
 * (TargetService, ScanService, ...) sử dụng client này.
 *
 * Các hàm chính:
 * - setBaseUrl()   : Cập nhật base URL (gọi khi người dùng đổi server trong settings)
 * - get()          : Gửi GET request
 * - post()         : Gửi POST request (tự động JSON.stringify body)
 * - put()          : Gửi PUT request (tự động JSON.stringify body)
 * - del()          : Gửi DELETE request
 * - request()      : Gửi HTTP request với options đầy đủ (dùng cho method khác hoặc custom headers)
 * - healthCheck()  : Kiểm tra trạng thái kết nối đến backend (/health)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { ApiResponse } from '@renderer/types/api';
import { logger } from '@renderer/utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
const DEFAULT_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

// ─── Class ──────────────────────────────────────────────────────────────
class ApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const storedUrl = localStorage.getItem('server_url');
    this.baseUrl = baseUrl || (storedUrl ? `http://${storedUrl}` : DEFAULT_BASE_URL);
  }

  /**
   * Cập nhật base URL cho API calls.
   * Được gọi khi người dùng thay đổi server URL trong settings.
   */
  setBaseUrl(url: string): void {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    this.baseUrl = url;
  }

  /**
   * Generic request method cho tất cả API calls.
   * Xử lý JSON parsing, error handling, và response validation.
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

    const text = await res.text();

    // Remove BOM if present (U+FEFF at start)
    let cleanedText = text;
    if (cleanedText.charCodeAt(0) === 0xfeff) {
      cleanedText = cleanedText.slice(1);
    }

    cleanedText = cleanedText.trim();

    let json: ApiResponse<T>;
    try {
      json = JSON.parse(cleanedText);
    } catch (parseError) {
      logger.error('[ApiService] Failed to parse JSON. Raw response:', cleanedText);
      throw new Error(`Invalid JSON response: ${cleanedText.substring(0, 100)}...`);
    }

    let data: T;
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      if (!json.success) {
        throw new Error(json.error || `API error: ${res.status}`);
      }
      data = json.data as T;
    } else {
      data = json as unknown as T;
    }
    return data;
  }

  // Convenience methods

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Health

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

// ─── Singleton ──────────────────────────────────────────────────────────
export const apiService = new ApiService();
export default ApiService;
