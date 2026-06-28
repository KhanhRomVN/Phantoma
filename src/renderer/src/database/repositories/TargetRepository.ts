import { BaseRepository } from './BaseRepository';
import { apiClient } from '../../services/ApiClient';
import type { TargetTab } from '../../features/Emulate/types/target.types';
import type { TargetDTO, CreateTargetDTO } from '@app/api/types';

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

function toCreateDTO(target: TargetTab | CreateTargetInput): CreateTargetDTO {
  return {
    id: 'id' in target ? target.id : undefined,
    title: target.title,
    url: target.url ?? null,
    icon: target.icon ?? null,
    platform: target.platform ?? null,
    executable_path: target.executable_path ?? (target as any).executablePath ?? null,
    startup_args: target.startup_args ?? (target as any).startupArgs ?? null,
    environment: target.environment ?? (target as any).environment ?? null,
  };
}

export interface TargetRow extends TargetDTO {}

export interface CreateTargetInput {
  id?: string;
  title: string;
  url?: string;
  icon?: string;
  platform?: string;
  executable_path?: string;
  startup_args?: string;
  environment?: string;
}

export class TargetRepository extends BaseRepository<TargetTab, CreateTargetInput> {
  constructor() {
    super('targets');
  }

  toModel(row: TargetRow): TargetTab {
    return toTargetTab(row);
  }

  toRow(model: TargetTab | CreateTargetInput): TargetRow {
    const dto = toCreateDTO(model);
    return {
      id: dto.id ?? '',
      title: dto.title,
      url: dto.url,
      icon: dto.icon,
      platform: dto.platform,
      last_used_at: null,
      executable_path: dto.executable_path,
      startup_args: dto.startup_args,
      environment: dto.environment,
      created_at: 0,
      updated_at: 0,
    };
  }

  async getAllTargets(): Promise<TargetTab[]> {
    const dtos = await apiClient.getTargets();
    return dtos.map(toTargetTab);
  }

  async getByPlatform(platform: string): Promise<TargetTab[]> {
    const all = await this.getAllTargets();
    return all.filter((t) => t.platform === platform);
  }

  async search(query: string): Promise<TargetTab[]> {
    const all = await this.getAllTargets();
    const q = query.toLowerCase();
    return all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.url?.toLowerCase().includes(q),
    );
  }

  async updateLastUsed(id: string): Promise<TargetTab | null> {
    try {
      const dto = await apiClient.updateTarget(id, { last_used_at: Date.now() });
      return toTargetTab(dto);
    } catch {
      return null;
    }
  }

  async saveTarget(target: TargetTab): Promise<TargetTab> {
    try {
      const dto = await apiClient.updateTarget(target.id, {
        title: target.title,
        url: target.url ?? null,
        icon: target.icon ?? null,
        platform: target.platform ?? null,
        executable_path: target.executablePath ?? null,
        startup_args: target.startupArgs ?? null,
        environment: target.environment ?? null,
      });
      return toTargetTab(dto);
    } catch {
      const dto = await apiClient.createTarget(toCreateDTO(target));
      return toTargetTab(dto);
    }
  }

  async saveTargets(targets: TargetTab[]): Promise<TargetTab[]> {
    const results: TargetTab[] = [];
    for (const t of targets) results.push(await this.saveTarget(t));
    return results;
  }

  async removeTarget(id: string): Promise<boolean> {
    return apiClient.deleteTarget(id);
  }

  async removeTargets(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (await apiClient.deleteTarget(id)) count++;
    }
    return count;
  }

  async clearAll(): Promise<number> {
    const all = await this.getAllTargets();
    let count = 0;
    for (const t of all) {
      if (await apiClient.deleteTarget(t.id)) count++;
    }
    return count;
  }
}

export const targetRepository = new TargetRepository();