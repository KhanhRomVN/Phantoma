/**
 * DatabaseService — Quản lý cấu hình database path.
 * Sử dụng ApiClient để gọi API từ Go backend.
 */

import { apiClient } from './ApiClient';

interface DatabasePathResponse {
  path: string;
}

interface UpdateDatabasePathResponse {
  path: string;
  status: string;
}

class DatabaseService {
  /**
   * Lấy đường dẫn database hiện tại từ server.
   */
  async getDatabasePath(): Promise<string> {
    const result = await apiClient.request<DatabasePathResponse>('/api/v1/database/path');
    return result.path;
  }

  /**
   * Cập nhật đường dẫn database mới.
   * @param newPath - Đường dẫn mới đến file SQL database.
   */
  async updateDatabasePath(newPath: string): Promise<string> {
    const result = await apiClient.request<UpdateDatabasePathResponse>('/api/v1/database/path', {
      method: 'PUT',
      body: JSON.stringify({ path: newPath }),
    });
    return result.path;
  }
}

// Singleton
export const databaseService = new DatabaseService();
export default databaseService;