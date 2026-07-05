import { targetService } from './TargetService';
import type { TargetTab } from '../features/Emulate/types/target.types';
import { CreateTargetDTO, TargetDTO, UpdateTargetDTO } from '@renderer/types/api';

/**
 * DataService - Centralized data access layer
 * Giao tiếp với Go backend qua REST API thay vì SQLite IPC.
 *
 * Usage:
 * import { dataService } from '@/services/DataService';
 * const targets = await dataService.getTargets();
 */

// ── Helpers ────────────────────────────────────────────────────────

function toTargetTab(dto: TargetDTO): TargetTab {
  return {
    id: dto.id,
    title: dto.title,
    url: dto.url ?? undefined,
    icon: dto.icon ?? undefined,
    favicon: dto.icon ?? undefined,
    platform: dto.platform ?? undefined,
    executablePath: dto.executable_path ?? undefined,
    startupArgs: dto.startup_args ?? undefined,
    environment: dto.environment ?? undefined,
  };
}

function toCreateDTO(target: TargetTab): CreateTargetDTO {
  return {
    id: target.id,
    title: target.title,
    url: target.url ?? null,
    icon: target.icon ?? null,
    platform: target.platform ?? null,
    executable_path: target.executablePath ?? null,
    startup_args: target.startupArgs ?? null,
    environment: target.environment ?? null,
  };
}

function toUpdateDTO(target: Partial<TargetTab>): UpdateTargetDTO {
  const dto: UpdateTargetDTO = {};
  if (target.title !== undefined) dto.title = target.title;
  if (target.url !== undefined) dto.url = target.url ?? null;
  if (target.icon !== undefined) dto.icon = target.icon ?? null;
  if (target.platform !== undefined) dto.platform = target.platform ?? null;
  if (target.executablePath !== undefined) dto.executable_path = target.executablePath ?? null;
  if (target.startupArgs !== undefined) dto.startup_args = target.startupArgs ?? null;
  if (target.environment !== undefined) dto.environment = target.environment ?? null;
  return dto;
}

// ── DataService ────────────────────────────────────────────────────

class DataService {
  private static instance: DataService;

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // === Target CRUD ===

  async getTargets(): Promise<TargetTab[]> {
    const dtos = await targetService.getTargets();
    return dtos.map(toTargetTab);
  }

  async getTargetById(id: string): Promise<TargetTab | null> {
    try {
      const dto = await targetService.getTarget(id);
      return toTargetTab(dto);
    } catch {
      return null;
    }
  }

  async getTargetsByPlatform(platform: string): Promise<TargetTab[]> {
    const all = await this.getTargets();
    return all.filter((t) => t.platform === platform);
  }

  async searchTargets(query: string): Promise<TargetTab[]> {
    const all = await this.getTargets();
    const q = query.toLowerCase();
    return all.filter((t) => t.title.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q));
  }

  async saveTarget(target: TargetTab): Promise<TargetTab> {
    // Check if target exists first
    try {
      const existing = await targetService.getTarget(target.id);
      if (existing) {
        // Target exists → update
        const dto = await targetService.updateTarget(target.id, toUpdateDTO(target));
        return toTargetTab(dto);
      }
    } catch (error: any) {
      const message = error?.message || '';
      const status = error?.status || 0;
      const isNotFound =
        message.includes('missing target id') ||
        message.includes('not found') ||
        status === 400 ||
        status === 404;
      if (!isNotFound) {
        throw error;
      }
    }

    // Create new target
    const dto = await targetService.createTarget(toCreateDTO(target));
    return toTargetTab(dto);
  }

  async saveTargets(targets: TargetTab[]): Promise<TargetTab[]> {
    const results: TargetTab[] = [];
    for (const target of targets) {
      results.push(await this.saveTarget(target));
    }
    return results;
  }

  async createTarget(input: Omit<TargetTab, 'id'> & { id?: string }): Promise<TargetTab> {
    const dto: CreateTargetDTO = {
      id: input.id,
      title: input.title,
      url: input.url ?? null,
      icon: input.icon ?? input.favicon ?? null,
      platform: input.platform ?? 'web',
      executable_path: input.executablePath ?? null,
      startup_args: input.startupArgs ?? null,
      environment: input.environment ?? null,
    };
    const result = await targetService.createTarget(dto);
    return toTargetTab(result);
  }

  async deleteTarget(id: string): Promise<boolean> {
    return targetService.deleteTarget(id);
  }

  async deleteTargets(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const deleted = await targetService.deleteTarget(id);
      if (deleted) count++;
    }
    return count;
  }

  async clearAllTargets(): Promise<number> {
    const all = await this.getTargets();
    let count = 0;
    for (const t of all) {
      const deleted = await targetService.deleteTarget(t.id);
      if (deleted) count++;
    }
    return count;
  }

  async countTargets(): Promise<number> {
    const all = await this.getTargets();
    return all.length;
  }

  async targetExists(id: string): Promise<boolean> {
    const target = await this.getTargetById(id);
    return target !== null;
  }

  // === Utility ===

  async initialize(): Promise<void> {
    // Không cần làm gì — database do Go backend quản lý
  }

  isInitialized(): boolean {
    return true;
  }
}

// Export singleton
export const dataService = DataService.getInstance();
export default DataService;
