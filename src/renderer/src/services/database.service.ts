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

class DatabaseService {
  /**
   * Get current database path from server.
   */
  async getDatabasePath(): Promise<string> {
    const result = await apiService.request<DatabasePathResponse>('/api/v1/database/path');
    return result.path;
  }

  /**
   * Update to a new database path.
   * @param newPath - New path to the SQL database file.
   */
  async updateDatabasePath(newPath: string): Promise<string> {
    const result = await apiService.request<UpdateDatabasePathResponse>('/api/v1/database/path', {
      method: 'PUT',
      body: JSON.stringify({ path: newPath }),
    });
    return result.path;
  }
}

export const databaseService = new DatabaseService();
export default databaseService;
