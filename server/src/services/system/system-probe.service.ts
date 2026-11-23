/**
 * ------------------------------------------------------------------
 * System Probe Service
 * ------------------------------------------------------------------
 * Lớp truy cập phần cứng/OS duy nhất của System Monitor. Bọc
 * `systeminformation` (Windows / Linux / macOS) kèm cache TTL cho từng nguồn
 * dữ liệu chậm, và các fallback riêng từng nền tảng (đĩa trên Windows,
 * công suất pin trên Linux, độ trễ TCP).
 *
 * Các service khác không gọi `systeminformation` trực tiếp mà đi qua đây để
 * tránh spawn lệnh trùng lặp và để mọi TTL nằm ở một chỗ.
 * ------------------------------------------------------------------
 */

import * as si from 'systeminformation';
import type { Systeminformation } from 'systeminformation';
import type { SystemConfig } from '../../config';
import { HISTORY_SIZE, TTL } from '../../constants';
import type { DiskSample, NetworkQuality } from '../../types/system.type';
import { TtlCache } from '../../utils/async.util';
import { listDir, readNumberFile } from '../../utils/file.util';
import { tcpLatency } from '../../utils/network.util';
import { finiteOrNull, round, sumOrNull } from '../../utils/number.util';
import { isLinux, isMacOS, isWindows } from '../../utils/platform.util';
import { parseJsonList, tryPowerShell } from '../../utils/process.util';

const EMPTY_QUALITY: NetworkQuality = {
  target: null,
  latencyMs: null,
  avgLatencyMs: null,
  jitterMs: null,
  packetLossPct: null,
};

export class SystemProbeService {
  private readonly latencyWindow: (number | null)[] = [];
  private netSnapshot: Systeminformation.NetworkStatsData[] = [];

  // ── Dữ liệu động (TTL ngắn) ──
  readonly cpuSpeed = new TtlCache(TTL.cpuSpeed, () => si.cpuCurrentSpeed());
  readonly cpuTemperature = new TtlCache(TTL.cpuTemperature, () => si.cpuTemperature());
  readonly memory = new TtlCache(isLinux ? TTL.memoryLinux : TTL.memoryOther, () => si.mem());
  readonly diskThroughput = new TtlCache(isWindows ? TTL.diskIoWindows : TTL.diskIo, () =>
    this.readDiskThroughput(),
  );
  readonly graphics = new TtlCache(isMacOS ? TTL.graphicsMac : TTL.graphics, async () => {
    const { controllers } = await si.graphics();
    return controllers;
  });
  readonly processes = new TtlCache(TTL.processes, () => si.processes());
  readonly connections = new TtlCache(TTL.connections, () => si.networkConnections());
  readonly networkInterfaces = new TtlCache(TTL.networkInterfaces, async () => {
    const result = await si.networkInterfaces();
    return Array.isArray(result) ? result : [result];
  });
  readonly gateway = new TtlCache(TTL.gateway, () => si.networkGatewayDefault());
  readonly battery = new TtlCache(TTL.battery, () => si.battery());
  readonly batteryPowerW = new TtlCache(TTL.battery, () => this.readBatteryPowerW());
  readonly latency = new TtlCache(TTL.latency, () => this.measureLatency());

  // ── Dữ liệu tĩnh / ít đổi ──
  readonly fsSize = new TtlCache(TTL.fsSize, () => si.fsSize());
  readonly blockDevices = new TtlCache(TTL.blockDevices, () => si.blockDevices());
  readonly diskLayout = new TtlCache(TTL.diskLayout, () => si.diskLayout());
  readonly cpuInfo = new TtlCache(TTL.static, () => si.cpu());
  readonly osInfo = new TtlCache(TTL.static, () => si.osInfo());

  constructor(private readonly config: SystemConfig) {}

  /** Tải CPU hiện tại (so với lần gọi trước) — chỉ SystemMonitorService gọi mỗi tick. */
  currentLoad(): Promise<Systeminformation.CurrentLoadData> {
    return si.currentLoad();
  }

  /** Băng thông mỗi interface (cần ≥ 2 lần gọi mới có rx_sec/tx_sec); cập nhật snapshot. */
  async networkStats(): Promise<Systeminformation.NetworkStatsData[]> {
    this.netSnapshot = await si.networkStats('*');
    return this.netSnapshot;
  }

  /** Kết quả `networkStats()` gần nhất (rỗng nếu chưa gọi lần nào). */
  networkSnapshot(): Systeminformation.NetworkStatsData[] {
    return this.netSnapshot;
  }

  // ─── Platform-specific readers ────────────────────────────────────────

  private async readDiskThroughput(): Promise<DiskSample> {
    if (!isWindows) {
      const [fs, io] = await Promise.all([
        si.fsStats().catch(() => null),
        si.disksIO().catch(() => null),
      ]);
      return {
        readBps: finiteOrNull(fs?.rx_sec),
        writeBps: finiteOrNull(fs?.wx_sec),
        iops: sumOrNull(io?.rIO_sec, io?.wIO_sec),
      };
    }

    // Windows: WMI formatted counter (không phụ thuộc ngôn ngữ như typeperf)
    const raw = await tryPowerShell(
      'Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name=\'_Total\'" | ' +
        'Select-Object DiskReadBytesPerSec,DiskWriteBytesPerSec,DiskReadsPerSec,DiskWritesPerSec | ' +
        'ConvertTo-Json -Compress',
    );
    const row = parseJsonList<Record<string, number>>(raw)[0];
    if (!row) return { readBps: null, writeBps: null, iops: null };
    return {
      readBps: finiteOrNull(row.DiskReadBytesPerSec),
      writeBps: finiteOrNull(row.DiskWriteBytesPerSec),
      iops: sumOrNull(row.DiskReadsPerSec, row.DiskWritesPerSec),
    };
  }

  /** Công suất đang tiêu thụ của pin (W) — chỉ đọc được trên Linux có pin. */
  private async readBatteryPowerW(): Promise<number | null> {
    if (!isLinux) return null;
    const root = '/sys/class/power_supply';
    for (const name of await listDir(root)) {
      if (!name.startsWith('BAT')) continue;
      const powerUw = await readNumberFile(`${root}/${name}/power_now`);
      if (powerUw !== null && powerUw > 0) return round(powerUw / 1e6, 1);
      const [voltageUv, currentUa] = await Promise.all([
        readNumberFile(`${root}/${name}/voltage_now`),
        readNumberFile(`${root}/${name}/current_now`),
      ]);
      if (voltageUv && currentUa) return round((voltageUv * Math.abs(currentUa)) / 1e12, 1);
    }
    return null;
  }

  /** Đo 1 lần TCP handshake, ghi vào cửa sổ trượt rồi tính avg / jitter / packet loss. */
  private async measureLatency(): Promise<NetworkQuality> {
    const target = this.config.latencyTarget;
    if (!target) return EMPTY_QUALITY;

    this.latencyWindow.push(await tcpLatency(target.host, target.port));
    if (this.latencyWindow.length > HISTORY_SIZE) this.latencyWindow.shift();

    const valid = this.latencyWindow.filter((v): v is number => v !== null);
    const diffs = valid.slice(1).map((v, i) => Math.abs(v - valid[i]));
    const mean = (xs: number[]): number | null =>
      xs.length ? round(xs.reduce((s, v) => s + v, 0) / xs.length, 1) : null;

    const last = this.latencyWindow[this.latencyWindow.length - 1];
    return {
      target: `${target.host}:${target.port}`,
      latencyMs: last === null ? null : round(last, 1),
      avgLatencyMs: mean(valid),
      jitterMs: mean(diffs),
      packetLossPct: round(
        ((this.latencyWindow.length - valid.length) / this.latencyWindow.length) * 100,
        1,
      ),
    };
  }
}
