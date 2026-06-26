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
    // Tạo bảng targets với schema đầy đủ
    const createTargetsTable = `
      CREATE TABLE IF NOT EXISTS targets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT,
        platform TEXT,
        status TEXT DEFAULT 'stored' CHECK (status IN ('stored', 'staged', 'active')),
        last_used_at INTEGER,
        executable_path TEXT,
        startup_args TEXT,
        environment TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `;

    // Tạo chỉ mục
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform);
      CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at);
      CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
      CREATE INDEX IF NOT EXISTS idx_targets_last_used ON targets(last_used_at);
    `;

    await this.run(createTargetsTable);
    await this.run(createIndexes);

    // Migration: Thêm các column nếu chưa có (cho DB cũ)
    await this.migrateAddStatusColumn();
    
    console.log('[Database] Tables created/verified with migrations');
  }

  /**
   * Migration: Add status column if not exists
   */
  private async migrateAddStatusColumn(): Promise<void> {
    try {
      const result = await this.execute(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='targets'`
      );
      
      if (result.length > 0) {
        const createSQL = result[0].sql;
        if (!createSQL.includes('status TEXT')) {
          await this.run(`ALTER TABLE targets ADD COLUMN status TEXT DEFAULT 'stored'`);
          console.log('[Database] Migration: Added status column');
        }
        if (!createSQL.includes('executable_path')) {
          await this.run(`ALTER TABLE targets ADD COLUMN executable_path TEXT`);
          console.log('[Database] Migration: Added executable_path column');
        }
        if (!createSQL.includes('startup_args')) {
          await this.run(`ALTER TABLE targets ADD COLUMN startup_args TEXT`);
          console.log('[Database] Migration: Added startup_args column');
        }
        if (!createSQL.includes('environment')) {
          await this.run(`ALTER TABLE targets ADD COLUMN environment TEXT`);
          console.log('[Database] Migration: Added environment column');
        }
        if (!createSQL.includes('last_used_at')) {
          await this.run(`ALTER TABLE targets ADD COLUMN last_used_at INTEGER`);
          console.log('[Database] Migration: Added last_used_at column');
        }
      }
    } catch (err) {
      console.warn('[Database] Migration columns:', err);
    }
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