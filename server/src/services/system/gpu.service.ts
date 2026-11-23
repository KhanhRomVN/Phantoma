/**
 * ------------------------------------------------------------------
 * GPU Service
 * ------------------------------------------------------------------
 * Thông tin chi tiết GPU. Số liệu động (tải, VRAM, nhiệt độ, công suất)
 * chỉ có khi driver cung cấp (NVIDIA qua nvidia-smi); GPU khác trả `null`.
 * Danh sách tiến trình dùng GPU chỉ hỗ trợ NVIDIA compute apps.
 * ------------------------------------------------------------------
 */

import path from 'path';
import { TtlCache } from '../../utils/async.util';
import type { GpuDetails, GpuDevice, GpuProcess } from '../../types/system.type';
import { finiteOrNull, mibToBytes, positiveOrNull } from '../../utils/number.util';
import { tryCommand } from '../../utils/process.util';
import type { SystemProbeService } from './system-probe.service';

export class GpuService {
  private readonly nvidiaProcesses = new TtlCache(3_000, () => this.readNvidiaProcesses());

  constructor(private readonly probe: SystemProbeService) {}

  async details(): Promise<GpuDetails> {
    const controllers = await this.probe.graphics.getStale();
    const devices = controllers.map((c, index): GpuDevice => ({
      index,
      vendor: c.vendor,
      model: c.model || c.name || 'Unknown GPU',
      driverVersion: c.driverVersion ?? null,
      bus: c.busAddress ?? c.bus ?? null,
      vramTotalBytes: mibToBytes(c.memoryTotal ?? c.vram),
      vramUsedBytes: mibToBytes(c.memoryUsed),
      utilizationGpu: finiteOrNull(c.utilizationGpu),
      utilizationMemory: finiteOrNull(c.utilizationMemory),
      temperatureC: positiveOrNull(c.temperatureGpu),
      powerDrawW: positiveOrNull(c.powerDraw),
      powerLimitW: positiveOrNull(c.powerLimit),
      clockCoreMHz: positiveOrNull(c.clockCore),
      clockMemoryMHz: positiveOrNull(c.clockMemory),
      fanPercent: finiteOrNull(c.fanSpeed),
    }));

    const hasNvidia = devices.some((d) => /nvidia/i.test(d.vendor));
    const processes = hasNvidia ? await this.nvidiaProcesses.get().catch(() => []) : [];
    return { devices, processes };
  }

  /** `nvidia-smi --query-compute-apps`: mỗi dòng "pid, process_name, used_memory(MiB)". */
  private async readNvidiaProcesses(): Promise<GpuProcess[]> {
    const out = await tryCommand('nvidia-smi', [
      '--query-compute-apps=pid,process_name,used_memory',
      '--format=csv,noheader,nounits',
    ]);
    return out
      .split('\n')
      .map((line) => line.split(',').map((s) => s.trim()))
      .filter((cols) => cols.length >= 3 && /^\d+$/.test(cols[0]))
      .map(([pid, name, mem]) => ({
        pid: Number(pid),
        name: path.basename(name),
        vramBytes: mibToBytes(Number(mem)),
      }));
  }
}
