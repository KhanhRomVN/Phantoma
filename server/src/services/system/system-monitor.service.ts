/**
 * ------------------------------------------------------------------
 * System Monitor Service
 * ------------------------------------------------------------------
 * Bộ lấy mẫu số liệu live (CPU, RAM, GPU, mạng, đĩa) cho SystemStatsModal.
 *
 * - Lấy mẫu mỗi `sampleIntervalMs`, giữ 60 mẫu gần nhất trong ring buffer.
 * - Chỉ chạy khi có người dùng: SSE subscriber, hoặc request REST gần đây
 *   (tự dừng sau MONITOR_IDLE_GRACE_MS). Đặt SYSTEM_MONITOR_AUTOSTART=true
 *   để chạy liên tục (cần cho alert "kéo dài X phút" khi modal đóng).
 * - Nguồn chậm (GPU, nhiệt độ, đĩa, độ trễ) đọc theo kiểu stale-while-revalidate
 *   nên không bao giờ làm chậm 1 tick.
 * ------------------------------------------------------------------
 */

import type { SystemConfig } from '../../config';
import {
  HISTORY_SIZE,
  MONITOR_IDLE_GRACE_MS,
  MONITOR_STALE_FACTOR,
  VIRTUAL_IFACE_RE,
} from '../../constants';
import type {
  CpuSample,
  DiskSample,
  GpuSample,
  MemorySample,
  MetricsSample,
  NetworkSample,
} from '../../types/system.type';
import { errorMessage } from '../../utils/error.util';
import { createLogger, F } from '../../utils/logger.util';
import {
  finiteOrNull,
  mibToBytes,
  positiveOrNull,
  round,
  sumOrNull,
} from '../../utils/number.util';
import type { SystemProbeService } from './system-probe.service';

const logger = createLogger('SystemMonitor');

type SampleListener = (sample: MetricsSample) => void;

const EMPTY_DISK: DiskSample = { readBps: null, writeBps: null, iops: null };

export class SystemMonitorService {
  private readonly buffer: MetricsSample[] = [];
  private readonly listeners = new Set<SampleListener>();
  private timer: NodeJS.Timeout | null = null;
  private inflight: Promise<MetricsSample> | null = null;
  private leases = 0;
  private keepAliveUntil = 0;

  constructor(
    private readonly probe: SystemProbeService,
    private readonly config: SystemConfig,
  ) {
    if (config.autostart) this.start();
  }

  get intervalMs(): number {
    return this.config.sampleIntervalMs;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.onTimer(), this.config.sampleIntervalMs);
    this.timer.unref();
    this.onTimer();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Đánh dấu "đang có người xem" cho các request REST; monitor sẽ chạy thêm một lúc. */
  touch(): void {
    this.keepAliveUntil = Date.now() + MONITOR_IDLE_GRACE_MS;
    this.start();
  }

  /** Đăng ký nhận mẫu (SSE). Monitor chạy chừng nào còn subscriber; trả hàm huỷ đăng ký. */
  subscribe(listener: SampleListener): () => void {
    this.listeners.add(listener);
    this.leases++;
    this.start();
    return () => {
      if (this.listeners.delete(listener)) this.leases--;
    };
  }

  /** Nhận mẫu nhưng KHÔNG giữ monitor chạy (dành cho AlertService). */
  onSample(listener: SampleListener): void {
    this.listeners.add(listener);
  }

  // ─── Data access ──────────────────────────────────────────────────────

  history(limit = HISTORY_SIZE): MetricsSample[] {
    return this.buffer.slice(-limit);
  }

  /** Mẫu mới nhất; nếu quá cũ (hoặc chưa có) thì lấy mẫu mới ngay. */
  async current(): Promise<MetricsSample> {
    this.touch();
    const latest = this.buffer[this.buffer.length - 1];
    const maxAge = this.config.sampleIntervalMs * MONITOR_STALE_FACTOR;
    if (latest && Date.now() - latest.ts < maxAge) return latest;
    return this.sample();
  }

  // ─── Sampling ─────────────────────────────────────────────────────────

  private onTimer(): void {
    if (this.leases === 0 && !this.config.autostart && Date.now() > this.keepAliveUntil) {
      this.stop();
      return;
    }
    this.sample().catch((err) => logger.warn('Sampling failed', F('error', errorMessage(err))));
  }

  private sample(): Promise<MetricsSample> {
    this.inflight ??= this.collect()
      .then((sample) => {
        this.buffer.push(sample);
        if (this.buffer.length > HISTORY_SIZE) this.buffer.shift();
        this.emit(sample);
        return sample;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  private emit(sample: MetricsSample): void {
    for (const listener of this.listeners) {
      try {
        listener(sample);
      } catch (err) {
        logger.warn('Sample listener failed', F('error', errorMessage(err)));
      }
    }
  }

  private async collect(): Promise<MetricsSample> {
    const p = this.probe;

    // Nguồn chậm: kích hoạt refresh nền, dùng giá trị đã có (nếu có) cho tick này.
    p.cpuSpeed.refresh();
    p.cpuTemperature.refresh();
    p.graphics.refresh();
    p.diskThroughput.refresh();
    p.latency.refresh();
    p.batteryPowerW.refresh();

    const [load, memory, netStats] = await Promise.all([
      p.currentLoad().catch(() => null),
      p.memory.getStale().catch(() => null),
      p.networkStats().catch(() => null),
    ]);

    return {
      ts: Date.now(),
      cpu: this.buildCpu(load),
      memory: this.buildMemory(memory),
      gpu: this.buildGpu(),
      network: this.buildNetwork(netStats),
      disk: p.diskThroughput.peek() ?? EMPTY_DISK,
      powerW: p.batteryPowerW.peek() ?? null,
    };
  }

  // ─── Builders ─────────────────────────────────────────────────────────

  private buildCpu(load: Awaited<ReturnType<SystemProbeService['currentLoad']>> | null): CpuSample {
    const temp = this.probe.cpuTemperature.peek();
    const speed = this.probe.cpuSpeed.peek();
    return {
      load: round(load?.currentLoad ?? 0),
      cores: (load?.cpus ?? []).map((c) => round(c.load)),
      freqGHz: positiveOrNull(speed?.avg),
      tempC: positiveOrNull(temp?.main) ?? positiveOrNull(temp?.max),
    };
  }

  private buildMemory(
    mem: Awaited<ReturnType<SystemProbeService['memory']['get']>> | null,
  ): MemorySample {
    const total = mem?.total ?? 0;
    const available = mem?.available ?? 0;
    const used = Math.max(0, total - available);
    return {
      totalBytes: total,
      usedBytes: used,
      availableBytes: available,
      usedPct: total > 0 ? round((used / total) * 100) : 0,
      swapTotalBytes: mem?.swaptotal ?? 0,
      swapUsedBytes: mem?.swapused ?? 0,
    };
  }

  private buildGpu(): GpuSample | null {
    const controllers = this.probe.graphics.peek();
    if (!controllers?.length) return null;
    const gpu = controllers.find((c) => c.utilizationGpu !== undefined) ?? controllers[0];
    return {
      load: finiteOrNull(gpu.utilizationGpu),
      vramUsedBytes: mibToBytes(gpu.memoryUsed),
      vramTotalBytes: mibToBytes(gpu.memoryTotal ?? gpu.vram),
      tempC: positiveOrNull(gpu.temperatureGpu),
      powerW: positiveOrNull(gpu.powerDraw),
    };
  }

  private buildNetwork(
    stats: Awaited<ReturnType<SystemProbeService['networkStats']>> | null,
  ): NetworkSample {
    const physical = (stats ?? []).filter((s) => !VIRTUAL_IFACE_RE.test(s.iface));
    return {
      downBps: sumOrNull(...physical.map((s) => finiteOrNull(s.rx_sec))),
      upBps: sumOrNull(...physical.map((s) => finiteOrNull(s.tx_sec))),
      latencyMs: this.probe.latency.peek()?.latencyMs ?? null,
    };
  }
}
