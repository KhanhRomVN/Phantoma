/**
 * ------------------------------------------------------------------
 * Database Service
 * ------------------------------------------------------------------
 * Service quản lý đường dẫn database từ backend. Cung cấp các thao
 * tác lấy và cập nhật đường dẫn SQL database.
 *
 * Main functions:
 * - getDatabasePath()    : Lấy đường dẫn database hiện tại
 * - updateDatabasePath() : Cập nhật đường dẫn database mới
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { apiService } from './api.service';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface DatabasePathResponse {
  path: string;
}

interface UpdateDatabasePathResponse {
  path: string;
  status: string;
}

// ─── Class ──────────────────────────────────────────────────────────────
class DatabaseService {
  async getDatabasePath(): Promise<string> {
    const result = await apiService.request<DatabasePathResponse>('/api/v1/database/path');
    return result.path;
  }

  async updateDatabasePath(newPath: string): Promise<string> {
    const result = await apiService.request<UpdateDatabasePathResponse>('/api/v1/database/path', {
      method: 'PUT',
      body: JSON.stringify({ path: newPath }),
    });
    return result.path;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const databaseService = new DatabaseService();
export default databaseService;