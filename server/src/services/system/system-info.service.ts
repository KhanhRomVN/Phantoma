/**
 * ------------------------------------------------------------------
 * System Info Service
 * ------------------------------------------------------------------
 * Thông tin tĩnh/ít đổi: tổng quan hệ thống (Overview), chi tiết CPU
 * và phân bổ bộ nhớ (Memory).
 * ------------------------------------------------------------------
 */

import os from 'os';
import type { CpuDetails, MemoryDetails, SystemOverview } from '../../types/system.type';
import { positiveOrNull } from '../../utils/number.util';
import { isWindows, PLATFORM } from '../../utils/platform.util';
import type { SystemProbeService } from './system-probe.service';

/** Load average 1/5/15 phút; Windows không có khái niệm này nên trả `null`. */
function loadAverage(): [number, number, number] | null {
  if (isWindows) return null;
  const [a, b, c] = os.loadavg();
  return [Number(a.toFixed(2)), Number(b.toFixed(2)), Number(c.toFixed(2))];
}

export class SystemInfoService {
  constructor(private readonly probe: SystemProbeService) {}

  async overview(): Promise<SystemOverview> {
    const [osInfo, cpu] = await Promise.all([this.probe.osInfo.get(), this.probe.cpuInfo.get()]);
    const uptimeSec = Math.round(os.uptime());
    return {
      hostname: osInfo.hostname || os.hostname(),
      platform: PLATFORM,
      os: `${osInfo.distro} ${osInfo.release}`.trim(),
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      uptimeSec,
      bootTime: Date.now() - uptimeSec * 1000,
      loadAverage: loadAverage(),
      cpuModel: `${cpu.manufacturer} ${cpu.brand}`.trim(),
      logicalCores: cpu.cores,
      physicalCores: cpu.physicalCores,
      totalMemoryBytes: os.totalmem(),
    };
  }

  async cpu(): Promise<CpuDetails> {
    const cpu = await this.probe.cpuInfo.get();
    return {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      physicalCores: cpu.physicalCores,
      logicalCores: cpu.cores,
      baseGHz: positiveOrNull(cpu.speed),
      minGHz: positiveOrNull(cpu.speedMin),
      maxGHz: positiveOrNull(cpu.speedMax),
      governor: cpu.governor || null,
      virtualization: cpu.virtualization,
      cache: {
        l1dBytes: cpu.cache.l1d,
        l1iBytes: cpu.cache.l1i,
        l2Bytes: cpu.cache.l2,
        l3Bytes: cpu.cache.l3,
      },
      loadAverage: loadAverage(),
    };
  }

  async memory(): Promise<MemoryDetails> {
    const mem = await this.probe.memory.getStale();
    // si.used = total - free (đã gồm cache) → ứng dụng = total - free - buff/cache
    const buffCache = mem.buffcache;
    const applications = Math.max(0, mem.total - mem.free - buffCache);
    const other = Math.max(0, buffCache - mem.cached - mem.buffers);
    return {
      totalBytes: mem.total,
      usedBytes: Math.max(0, mem.total - mem.available),
      freeBytes: mem.free,
      availableBytes: mem.available,
      cachedBytes: mem.cached,
      buffersBytes: mem.buffers,
      swap: { totalBytes: mem.swaptotal, usedBytes: mem.swapused, freeBytes: mem.swapfree },
      composition: {
        applicationsBytes: applications,
        cacheBytes: mem.cached,
        buffersBytes: mem.buffers,
        otherBytes: other,
        freeBytes: mem.free,
      },
    };
  }
}
