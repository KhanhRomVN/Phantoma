import { BaseRepository } from './BaseRepository';
import { db } from '../Database';
import { TargetTab } from '../../features/Emulate/types/target.types';

export type TargetStatus = 'stored' | 'staged' | 'active';

export interface TargetRow {
  id: string;
  title: string;
  url: string | null;
  platform: string | null;
  status: TargetStatus;
  last_used_at: number | null;
  created_at: number;
  updated_at: number;
  executable_path: string | null;
  startup_args: string | null;
  environment: string | null;
}

export interface CreateTargetInput {
  id?: string;
  title: string;
  url?: string;
  platform?: string;
  status?: TargetStatus;
  executable_path?: string;
  startup_args?: string;
  environment?: string;
}

export class TargetRepository extends BaseRepository<TargetTab, CreateTargetInput> {
  constructor() {
    super('targets');
  }

  toModel(row: TargetRow): TargetTab {
    return {
      id: row.id,
      title: row.title,
      url: row.url || undefined,
      // favicon không có trong DB, sẽ được generate từ URL nếu cần
    };
  }

  toRow(model: TargetTab | CreateTargetInput): TargetRow {
    const baseRow: TargetRow = {
      id: 'id' in model && model.id ? model.id : crypto.randomUUID(),
      title: model.title,
      url: model.url || null,
      platform: 'platform' in model ? model.platform || null : null,
      status: 'status' in model ? model.status || 'stored' : 'stored',
      last_used_at: null,
      executable_path: 'executable_path' in model ? model.executable_path || null : null,
      startup_args: 'startup_args' in model ? model.startup_args || null : null,
      environment: 'environment' in model ? model.environment || null : null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Nếu là TargetTab, có thể lấy thêm thông tin từ favicon nếu có
    if ('id' in model && model.id) {
      // Có thể thêm logic để giữ created_at cũ hoặc xử lý favicon
    }

    return baseRow;
  }

  async getActiveTargets(): Promise<TargetTab[]> {
    // Lấy target có status = 'active' hoặc 'staged'
    const rows = await db.execute(
      `SELECT * FROM ${this.tableName} 
       WHERE status IN ('active', 'staged')
       ORDER BY updated_at DESC`
    );
    return rows.map(row => this.toModel(row));
  }

  async getByStatus(status: TargetStatus): Promise<TargetTab[]> {
    const rows = await this.getByField('status', status);
    return rows;
  }

  async getStored(): Promise<TargetTab[]> {
    return this.getByStatus('stored');
  }

  async getStaged(): Promise<TargetTab[]> {
    return this.getByStatus('staged');
  }

  async getActive(): Promise<TargetTab[]> {
    return this.getByStatus('active');
  }

  async getByPlatform(platform: string): Promise<TargetTab[]> {
    const rows = await this.getByField('platform', platform);
    return rows;
  }

  async search(query: string): Promise<TargetTab[]> {
    const rows = await db.execute(
      `SELECT * FROM ${this.tableName} 
       WHERE (title LIKE ? OR url LIKE ?) 
       ORDER BY updated_at DESC`,
      [`%${query}%`, `%${query}%`]
    );
    return rows.map(row => this.toModel(row));
  }

  async updateStatus(id: string, status: TargetStatus): Promise<TargetTab | null> {
    return this.update(id, { status } as any);
  }

  async updateLastUsed(id: string): Promise<TargetTab | null> {
    return this.update(id, { last_used_at: Date.now() } as any);
  }

  async saveTarget(target: TargetTab): Promise<TargetTab> {
    return this.upsert(target);
  }

  async saveTargets(targets: TargetTab[]): Promise<TargetTab[]> {
    return this.bulkUpsert(targets);
  }

  async removeTarget(id: string): Promise<boolean> {
    return this.delete(id);
  }

  async removeTargets(ids: string[]): Promise<number> {
    return this.bulkDelete(ids);
  }

  async clearAll(): Promise<number> {
    return this.deleteAll();
  }
}

// Export singleton instance
export const targetRepository = new TargetRepository();