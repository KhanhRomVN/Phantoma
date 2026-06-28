import { useDatabase } from '../providers/DatabaseProvider';

interface QueryResult<T = any> {
  rows: T[];
  lastInsertRowid?: number;
  changes?: number;
}

export class Database {
  private static instance: Database;
  private initialized = false;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Kiểm tra kết nối từ DatabaseProvider
      const result = await window.api.invoke('sqlite:validate', '');
      if (result && result.valid) {
        this.initialized = true;
        await this.createTables();
        console.log('[Database] Initialized successfully');
      } else {
        console.warn('[Database] No valid database connection, retrying...');
      }
    } catch (err) {
      console.error('[Database] Init error:', err);
      throw err;
    }
  }

  private async createTables(): Promise<void> {
    // Migration đã được chuyển sang main process (src/main/core/database/migration.ts)
    // và chạy tự động khi database connection được mở qua IPC.
    // Hàm này giữ lại để tương thích ngược, không thực hiện migration.
    console.log('[Database] Schema migration is handled by main process');
  }

  async execute<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await window.api.invoke('sqlite:execute', {
        query,
        params
      });
      return result.rows || [];
    } catch (err) {
      console.error('[Database] Execute error:', err);
      throw err;
    }
  }

  async executeSingle<T = any>(query: string, params: any[] = []): Promise<T | null> {
    const rows = await this.execute<T>(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(query: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    try {
      const result = await window.api.invoke('sqlite:execute', {
        query,
        params
      });
      return {
        lastInsertRowid: result.lastInsertRowid || 0,
        changes: result.changes || 0
      };
    } catch (err) {
      console.error('[Database] Run error:', err);
      throw err;
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await this.run('COMMIT');
      return result;
    } catch (err) {
      await this.run('ROLLBACK');
      throw err;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const db = Database.getInstance();