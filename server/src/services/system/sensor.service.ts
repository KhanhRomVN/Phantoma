/**
 * ------------------------------------------------------------------
 * Sensor Service
 * ------------------------------------------------------------------
 * Nhiệt độ, quạt, điện áp, pin và công suất.
 *  - Linux: đọc trực tiếp `/sys/class/hwmon` (đủ CPU/NVMe/mainboard/quạt/điện áp)
 *  - Windows / macOS: chỉ có nhiệt độ CPU qua systeminformation khi phần cứng
 *    hoặc driver cho phép; các mục khác trả mảng rỗng (không giả lập số liệu).
 * ------------------------------------------------------------------
 */

import { TTL } from '../../constants';
import type {
  BatteryInfo,
  FanReading,
  SensorDetails,
  TemperatureReading,
  VoltageReading,
} from '../../types/system.type';
import { TtlCache } from '../../utils/async.util';
import { listDir, readNumberFile, readTextFile } from '../../utils/file.util';
import { positiveOrNull, round } from '../../utils/number.util';
import { isLinux } from '../../utils/platform.util';
import type { SystemProbeService } from './system-probe.service';

type Readings = Pick<SensorDetails, 'temperatures' | 'fans' | 'voltages'>;

const HWMON_ROOT = '/sys/class/hwmon';
const MAX_PLAUSIBLE_TEMP_C = 150;

export class SensorService {
  private readonly readings = new TtlCache(TTL.sensors, () => this.readAll());

  constructor(private readonly probe: SystemProbeService) {}

  async details(): Promise<SensorDetails> {
    const [readings, battery, powerW] = await Promise.all([
      this.readings.get().catch((): Readings => ({ temperatures: [], fans: [], voltages: [] })),
      this.readBattery(),
      this.probe.batteryPowerW.getStale().catch(() => null),
    ]);
    return { ...readings, battery, powerW };
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private readAll(): Promise<Readings> {
    return isLinux ? this.readHwmon() : this.readFromSystemInformation();
  }

  private async readHwmon(): Promise<Readings> {
    const out: Readings = { temperatures: [], fans: [], voltages: [] };

    for (const dir of await listDir(HWMON_ROOT)) {
      const base = `${HWMON_ROOT}/${dir}`;
      const chip = (await readTextFile(`${base}/name`)) ?? dir;

      for (const file of await listDir(base)) {
        const m = /^(temp|fan|in)(\d+)_input$/.exec(file);
        if (!m) continue;
        const [, kind, idx] = m;
        const raw = await readNumberFile(`${base}/${file}`);
        if (raw === null) continue;
        const label = `${chip} ${(await readTextFile(`${base}/${kind}${idx}_label`)) ?? `${kind}${idx}`}`;

        if (kind === 'temp') {
          const valueC = raw / 1000;
          if (valueC <= 0 || valueC > MAX_PLAUSIBLE_TEMP_C) continue;
          const limit =
            (await readNumberFile(`${base}/temp${idx}_crit`)) ??
            (await readNumberFile(`${base}/temp${idx}_max`));
          out.temperatures.push({
            label,
            valueC: round(valueC),
            maxC: limit ? round(limit / 1000) : null,
          } satisfies TemperatureReading);
        } else if (kind === 'fan') {
          const max = await readNumberFile(`${base}/fan${idx}_max`);
          out.fans.push({
            label,
            rpm: raw,
            maxRpm: max && max > 0 ? max : null,
          } satisfies FanReading);
        } else {
          out.voltages.push({ label, volts: round(raw / 1000, 3) } satisfies VoltageReading);
        }
      }
    }
    return out;
  }

  private async readFromSystemInformation(): Promise<Readings> {
    const temp = await this.probe.cpuTemperature.get().catch(() => null);
    const temperatures: TemperatureReading[] = [];
    const main = positiveOrNull(temp?.main);
    if (main !== null) temperatures.push({ label: 'CPU Package', valueC: round(main), maxC: null });
    (temp?.cores ?? []).forEach((c, i) => {
      const v = positiveOrNull(c);
      if (v !== null) temperatures.push({ label: `CPU Core ${i}`, valueC: round(v), maxC: null });
    });
    return { temperatures, fans: [], voltages: [] };
  }

  private async readBattery(): Promise<BatteryInfo | null> {
    const b = await this.probe.battery.get().catch(() => null);
    if (!b?.hasBattery) return null;
    return {
      percent: b.percent,
      charging: b.isCharging,
      acConnected: b.acConnected,
      timeRemainingMin: positiveOrNull(b.timeRemaining),
    };
  }
}
