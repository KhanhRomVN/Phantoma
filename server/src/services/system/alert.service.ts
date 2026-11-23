/**
 * ------------------------------------------------------------------
 * Alert Service
 * ------------------------------------------------------------------
 * Đánh giá các alert rule trên mỗi mẫu của SystemMonitorService.
 * Rule có `durationSec` chỉ bắn khi điều kiện đúng LIÊN TỤC đủ lâu.
 * Nếu monitor ngừng chạy (modal đóng, không autostart) quá ALERT_STALE_GAP_MS
 * thì bộ đếm liên tục bị reset — nên rule kéo dài nhiều phút cần
 * SYSTEM_MONITOR_AUTOSTART=true.
 * Trạng thái bật/tắt rule được lưu vào preferences.
 * ------------------------------------------------------------------
 */

import { ALERT_STALE_GAP_MS, DEFAULT_ALERT_RULES } from '../../constants';
import { AppError } from '../../errors/app.error';
import type { PreferencesStore } from '../../startup/preferences.store';
import type {
  ActiveAlert,
  AlertRule,
  AlertRuleDef,
  AlertSnapshot,
  ManagedService,
  MetricsSample,
  StorageVolume,
} from '../../types/system.type';
import { errorMessage } from '../../utils/error.util';
import { createLogger, F } from '../../utils/logger.util';
import type { ServiceManagerService } from './service-manager.service';
import type { StorageService } from './storage.service';
import type { SystemMonitorService } from './system-monitor.service';

const logger = createLogger('Alerts');

interface Context {
  sample: MetricsSample;
  volumes: StorageVolume[];
  services: ManagedService[];
}

export class AlertService {
  private readonly disabled: Set<string>;
  private readonly breachSince = new Map<string, number>();
  private readonly active = new Map<string, ActiveAlert>();
  private lastEvalAt = 0;
  private evaluating: Promise<void> | null = null;

  constructor(
    private readonly monitor: SystemMonitorService,
    private readonly storage: StorageService,
    private readonly services: ServiceManagerService,
    private readonly preferences: PreferencesStore,
  ) {
    this.disabled = new Set(preferences.getDisabledAlertRules());
    monitor.onSample((sample) => {
      this.evaluate(sample).catch((err) =>
        logger.warn('Evaluate failed', F('error', errorMessage(err))),
      );
    });
  }

  async snapshot(): Promise<AlertSnapshot> {
    await this.evaluate(await this.monitor.current());
    return {
      active: [...this.active.values()].sort((a, b) => b.raisedAt - a.raisedAt),
      rules: this.rules(),
    };
  }

  rules(): AlertRule[] {
    return DEFAULT_ALERT_RULES.map((r) => ({ ...r, enabled: !this.disabled.has(r.id) }));
  }

  setRuleEnabled(id: string, enabled: boolean): AlertRule[] {
    if (!DEFAULT_ALERT_RULES.some((r) => r.id === id))
      throw new AppError('alert rule not found', 404);
    if (enabled) this.disabled.delete(id);
    else {
      this.disabled.add(id);
      this.active.delete(id);
      this.breachSince.delete(id);
    }
    this.preferences.setDisabledAlertRules([...this.disabled]);
    return this.rules();
  }

  // ─── Evaluation ───────────────────────────────────────────────────────

  private evaluate(sample: MetricsSample): Promise<void> {
    this.evaluating ??= this.run(sample).finally(() => {
      this.evaluating = null;
    });
    return this.evaluating;
  }

  private async run(sample: MetricsSample): Promise<void> {
    if (sample.ts - this.lastEvalAt > ALERT_STALE_GAP_MS) this.breachSince.clear();
    this.lastEvalAt = sample.ts;

    const [volumes, services] = await Promise.all([
      this.storage.volumes().catch((): StorageVolume[] => []),
      this.services.all().catch((): ManagedService[] => []),
    ]);
    const ctx: Context = { sample, volumes, services };

    for (const rule of DEFAULT_ALERT_RULES) {
      const detail = this.disabled.has(rule.id) ? null : this.check(rule, ctx);
      if (detail === null) {
        this.breachSince.delete(rule.id);
        this.active.delete(rule.id);
        continue;
      }
      const since = this.breachSince.get(rule.id) ?? sample.ts;
      this.breachSince.set(rule.id, since);
      if (sample.ts - since < rule.durationSec * 1000) continue;

      const existing = this.active.get(rule.id);
      this.active.set(rule.id, {
        id: rule.id,
        ruleId: rule.id,
        title: rule.name,
        detail,
        severity: rule.severity,
        raisedAt: existing?.raisedAt ?? sample.ts,
      });
    }
  }

  /** Trả mô tả chi tiết nếu điều kiện đang vi phạm, ngược lại `null`. */
  private check(rule: AlertRuleDef, { sample, volumes, services }: Context): string | null {
    switch (rule.metric) {
      case 'cpu-load':
        return sample.cpu.load > rule.threshold ? `CPU at ${sample.cpu.load.toFixed(0)}%` : null;
      case 'memory-used':
        return sample.memory.usedPct > rule.threshold
          ? `Memory at ${sample.memory.usedPct.toFixed(0)}%`
          : null;
      case 'cpu-temp':
        return sample.cpu.tempC !== null && sample.cpu.tempC > rule.threshold
          ? `CPU at ${sample.cpu.tempC.toFixed(0)}°C`
          : null;
      case 'latency':
        return sample.network.latencyMs !== null && sample.network.latencyMs > rule.threshold
          ? `Latency ${sample.network.latencyMs.toFixed(0)} ms`
          : null;
      case 'disk-used': {
        const full = volumes.filter((v) => v.usePct > rule.threshold);
        return full.length
          ? full.map((v) => `${v.mount} ${v.usePct.toFixed(0)}%`).join(', ')
          : null;
      }
      case 'service-failed': {
        const failed = services.filter((s) => s.status === 'failed');
        if (!failed.length) return null;
        const names = failed
          .slice(0, 3)
          .map((s) => s.name)
          .join(', ');
        return failed.length > 3 ? `${names} and ${failed.length - 3} more` : names;
      }
    }
  }
}
