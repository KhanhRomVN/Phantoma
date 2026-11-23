/**
 * ------------------------------------------------------------------
 * Env Config
 * ------------------------------------------------------------------
 * Nạp `.env` (side-effect import — phải được import trước mọi module khác)
 * và parse biến môi trường thành object có kiểu.
 *
 * Biến cho System Monitor:
 *   SYSTEM_SAMPLE_INTERVAL_MS  chu kỳ lấy mẫu (500–10000, mặc định 1000)
 *   SYSTEM_MONITOR_AUTOSTART   true = lấy mẫu liên tục kể cả khi không ai xem
 *   SYSTEM_LATENCY_TARGET      host:port để đo độ trễ TCP (mặc định 1.1.1.1:443, `off` = tắt)
 *   SYSTEM_PUBLIC_IP_URL       URL https trả về IP public (mặc định tắt — tránh lộ IP ra ngoài)
 *   SYSTEM_CONTROL_ENABLED     true = cho phép start/stop/restart service
 *   SYSTEM_ALLOW_REMOTE        true = cho phép máy khác gọi /system/* (mặc định chỉ loopback)
 * ------------------------------------------------------------------
 */

import 'dotenv/config';

// ─── Helpers ────────────────────────────────────────────────────────────

const readString = (key: string, fallback: string): string => {
  const val = process.env[key];
  return val && val !== '' ? val : fallback;
};

const readInt = (key: string, fallback: number, min?: number, max?: number): number => {
  const parsed = parseInt(readString(key, String(fallback)), 10);
  if (Number.isNaN(parsed)) throw new Error(`${key} must be a valid number`);
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
};

const readBool = (key: string, fallback: boolean): boolean =>
  ['1', 'true', 'yes', 'on'].includes(readString(key, String(fallback)).toLowerCase());

export interface LatencyTarget {
  host: string;
  port: number;
}

function parseLatencyTarget(raw: string): LatencyTarget | null {
  if (raw.toLowerCase() === 'off') return null;
  const idx = raw.lastIndexOf(':');
  const host = idx > 0 ? raw.slice(0, idx) : raw;
  const port = idx > 0 ? parseInt(raw.slice(idx + 1), 10) : 443;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SYSTEM_LATENCY_TARGET must look like host:port (or "off")');
  }
  return { host, port };
}

// ─── Config ─────────────────────────────────────────────────────────────

const appEnv = readString('ENV', 'development');
const nodeEnv = process.env.NODE_ENV ?? '';

export const envConfig = {
  env: appEnv,
  port: readInt('PORT', 8080, 1, 65535), // ASSUMED: fallback = DEFAULT_SERVER_PORT in src/shared/ports.ts
  isProduction: nodeEnv === 'production' || appEnv === 'production',
  /** Welcome UI bỏ qua prompt khi chạy dev (giữ nguyên hành vi cũ: chỉ xét NODE_ENV). */
  isDevMode: nodeEnv === 'development',
  system: {
    sampleIntervalMs: readInt('SYSTEM_SAMPLE_INTERVAL_MS', 1000, 500, 10_000),
    autostart: readBool('SYSTEM_MONITOR_AUTOSTART', false),
    latencyTarget: parseLatencyTarget(readString('SYSTEM_LATENCY_TARGET', '1.1.1.1:443')),
    publicIpUrl: process.env.SYSTEM_PUBLIC_IP_URL || null,
    controlEnabled: readBool('SYSTEM_CONTROL_ENABLED', false),
    allowRemote: readBool('SYSTEM_ALLOW_REMOTE', false),
  },
};

export type SystemConfig = typeof envConfig.system;
