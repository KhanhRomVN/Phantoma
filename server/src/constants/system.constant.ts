import type { AlertRuleDef } from '../types/system.type';

// ─── Sampling ───────────────────────────────────────────────────────────

/** Số mẫu giữ trong ring buffer (khớp HISTORY = 60 của modal). */
export const HISTORY_SIZE = 60;

/** Sau khi request REST cuối cùng, monitor còn chạy thêm bấy lâu rồi tự dừng. */
export const MONITOR_IDLE_GRACE_MS = 15_000;

/** Mẫu cũ hơn ngưỡng này (x interval) thì GET /metrics sẽ lấy mẫu mới. */
export const MONITOR_STALE_FACTOR = 5;

export const SSE_HEARTBEAT_MS = 15_000;
export const SSE_MIN_INTERVAL_MS = 1_000;
export const SSE_MAX_INTERVAL_MS = 60_000;

// ─── Cache TTL (ms) cho các nguồn dữ liệu chậm ─────────────────────────

export const TTL = {
  cpuSpeed: 2_000,
  cpuTemperature: 3_000,
  diskIo: 2_000,
  /** Windows spawn PowerShell cho disk counter nên nới thưa hơn. */
  diskIoWindows: 3_000,
  graphics: 5_000,
  /** macOS gọi system_profiler rất chậm. */
  graphicsMac: 15_000,
  latency: 5_000,
  memoryLinux: 1_000,
  memoryOther: 3_000,
  fsSize: 30_000,
  blockDevices: 60_000,
  diskLayout: 60_000,
  networkInterfaces: 5_000,
  gateway: 30_000,
  connections: 5_000,
  processes: 2_000,
  services: 5_000,
  servicesWindows: 10_000,
  containers: 3_000,
  sensors: 2_000,
  battery: 10_000,
  static: 60 * 60 * 1000,
  dns: 60_000,
  publicIp: 5 * 60 * 1000,
  security: 60_000,
} as const;

// ─── Storage ────────────────────────────────────────────────────────────

/** Filesystem ảo — không hiển thị như "volume". */
export const PSEUDO_FS_TYPES = new Set([
  'tmpfs',
  'devtmpfs',
  'squashfs',
  'overlay',
  'efivarfs',
  'ramfs',
  'devfs',
  'autofs',
  'fuse.portal',
  'fuse.gvfsd-fuse',
]);

export const PSEUDO_MOUNT_PREFIXES = [
  '/snap/',
  '/var/lib/docker/',
  '/run/',
  '/sys/',
  '/proc/',
  '/dev/',
];

// ─── Network ────────────────────────────────────────────────────────────

/** Interface ảo bị loại khi cộng tổng băng thông (tránh đếm trùng lưu lượng container). */
export const VIRTUAL_IFACE_RE =
  /^(lo\d*|docker\d*|veth.*|br-.*|virbr.*|vmnet.*|utun\d*|awdl\d*|llw\d*|bridge\d*|loopback.*)$/i;

// ─── Runtime ────────────────────────────────────────────────────────────

export const PROCESS_LIMIT_DEFAULT = 100;
export const PROCESS_LIMIT_MAX = 500;
export const LOG_LIMIT_DEFAULT = 100;
export const LOG_LIMIT_MAX = 500;

/** Tên service hợp lệ khi điều khiển — chặn ký tự lạ trước khi đưa vào lệnh hệ thống. */
export const SERVICE_NAME_RE = /^[A-Za-z0-9@._:-]{1,128}$/;
export const SERVICE_ACTIONS = ['start', 'stop', 'restart'] as const;

// ─── Alerts ─────────────────────────────────────────────────────────────

/** Khoảng trống giữa 2 lần evaluate vượt ngưỡng này thì reset bộ đếm "liên tục". */
export const ALERT_STALE_GAP_MS = 15_000;

export const DEFAULT_ALERT_RULES: AlertRuleDef[] = [
  {
    id: 'r1',
    name: 'High CPU load',
    condition: 'CPU > 90% for 5 minutes',
    severity: 'warning',
    metric: 'cpu-load',
    threshold: 90,
    durationSec: 300,
  },
  {
    id: 'r2',
    name: 'Memory pressure',
    condition: 'RAM > 85% for 3 minutes',
    severity: 'warning',
    metric: 'memory-used',
    threshold: 85,
    durationSec: 180,
  },
  {
    id: 'r3',
    name: 'Disk almost full',
    condition: 'Any volume > 90%',
    severity: 'critical',
    metric: 'disk-used',
    threshold: 90,
    durationSec: 0,
  },
  {
    id: 'r4',
    name: 'CPU overheating',
    condition: 'Package > 88 C',
    severity: 'critical',
    metric: 'cpu-temp',
    threshold: 88,
    durationSec: 10,
  },
  {
    id: 'r5',
    name: 'Service down',
    condition: 'Any service in failed state',
    severity: 'critical',
    metric: 'service-failed',
    threshold: 1,
    durationSec: 0,
  },
  {
    id: 'r6',
    name: 'High latency',
    condition: 'Ping > 150 ms for 1 minute',
    severity: 'info',
    metric: 'latency',
    threshold: 150,
    durationSec: 60,
  },
];
