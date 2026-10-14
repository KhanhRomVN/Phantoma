/**
 * ------------------------------------------------------------------
 * Database Service
 * ------------------------------------------------------------------
 * Service quản lý đường dẫn database từ backend. Cung cấp các thao
 * tác lấy và cập nhật đường dẫn SQL database.
 *
 * ⚠ Route /api/v1/database/path được mount ở Phantoma/emulate service
 * (port 3002), KHÔNG phải server shell ở port 8080. Vì vậy service này
 * tự resolve base URL qua resolveEmulateBaseUrl() thay vì dùng apiService
 * singleton (vốn mặc định trỏ 8080 cho các API chung).
 *
 * Main functions:
 * - getDatabasePath()    : Lấy đường dẫn database hiện tại
 * - updateDatabasePath() : Cập nhật đường dẫn database mới
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import { resolveEmulateBaseUrl } from '@renderer/modules/Emulate/services/emulate-base-url';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface DatabasePathResponse {
  path: string;
}

interface UpdateDatabasePathResponse {
  path: string;
  status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
async function emulateRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveEmulateBaseUrl().replace(/\/$/, '');
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response from ${url}: ${text.substring(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status} on ${path}`);
  }

  // Tương thích với envelope { success, data } nếu có, ngược lại trả raw object
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    if (!json.success) throw new Error(json.error || `API error on ${path}`);
    return json.data as T;
  }
  return json as T;
}

// ─── Class ──────────────────────────────────────────────────────────────
class DatabaseService {
  async getDatabasePath(): Promise<string> {
    const result = await emulateRequest<DatabasePathResponse>('/api/v1/database/path');
    return result.path;
  }

  async updateDatabasePath(newPath: string): Promise<string> {
    const result = await emulateRequest<UpdateDatabasePathResponse>('/api/v1/database/path', {
      method: 'PUT',
      body: JSON.stringify({ path: newPath }),
    });
    return result.path;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const databaseService = new DatabaseService();
export default databaseService;