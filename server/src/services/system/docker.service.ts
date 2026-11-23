/**
 * ------------------------------------------------------------------
 * Docker Service
 * ------------------------------------------------------------------
 * Danh sách container + tài nguyên sử dụng qua Docker Engine API
 * (systeminformation). Trả `available: false` nếu máy không có Docker.
 * ------------------------------------------------------------------
 */

import * as si from 'systeminformation';
import { TTL } from '../../constants';
import type { ContainerInfo, ContainerList, ContainerStatus } from '../../types/system.type';
import { TtlCache } from '../../utils/async.util';
import { round } from '../../utils/number.util';

const statusOf = (state: string): ContainerStatus =>
  state === 'running' || state === 'paused' || state === 'exited' ? state : 'other';

export class DockerService {
  private readonly cache = new TtlCache(TTL.containers, () => this.load());

  list(): Promise<ContainerList> {
    return this.cache.get();
  }

  private async load(): Promise<ContainerList> {
    const info = await si.dockerInfo().catch(() => null);
    if (!info?.id) return { available: false, items: [] };

    const [containers, stats] = await Promise.all([
      si.dockerContainers(true),
      si.dockerContainerStats('*').catch(() => []),
    ]);
    const statsById = new Map(stats.map((s) => [s.id, s]));

    return {
      available: true,
      items: containers.map((c): ContainerInfo => {
        const s = statsById.get(c.id);
        return {
          id: c.id,
          name: c.name,
          image: c.image,
          status: statusOf(c.state),
          state: c.status,
          cpuPct: round(s?.cpuPercent ?? 0),
          memBytes: s?.memUsage ?? 0,
          ports: c.ports,
        };
      }),
    };
  }
}
