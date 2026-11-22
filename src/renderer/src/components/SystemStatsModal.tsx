/**
 * ------------------------------------------------------------------
 * SystemStatsModal
 * ------------------------------------------------------------------
 * Modal giám sát toàn bộ hệ thống với sidebar nhiều tab: Overview,
 * CPU, Memory, GPU, Storage, Network, Processes, Services,
 * Containers, Ports, Sensors, Logs, Alerts, Security.
 * Hiện dùng mockData (số liệu live được giả lập bằng random walk),
 * sẽ thay bằng API thật sau này.
 *
 * Main features:
 * - Sidebar điều hướng theo nhóm, indicator trượt mượt (layoutId)
 * - Live metrics giả lập, tạm dừng/tiếp tục, đổi tần suất làm mới
 * - Biểu đồ area SVG, ring gauge, heatmap core, stacked bar
 * - Bảng process (search/sort), service/alert toggle, log stream
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useId, useState, type ReactNode } from 'react';

// ── UI ──
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  CheckCircle,
  Clock,
  Container,
  Cpu,
  Fan,
  HardDrive,
  LayoutDashboard,
  ListTree,
  Lock,
  MemoryStick,
  Monitor,
  Network,
  Pause,
  Play,
  Plug,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  Thermometer,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// ── Components ──
import { Modal } from './ui/Modal';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface SystemStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId =
  | 'overview'
  | 'cpu'
  | 'memory'
  | 'gpu'
  | 'storage'
  | 'network'
  | 'processes'
  | 'services'
  | 'containers'
  | 'ports'
  | 'sensors'
  | 'logs'
  | 'alerts'
  | 'security';

interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

interface Series {
  data: number[];
  color: string;
}

interface Metrics {
  cpu: number[];
  mem: number[];
  gpu: number[];
  up: number[];
  down: number[];
  read: number[];
  write: number[];
  temp: number[];
  power: number[];
  latency: number[];
  cores: number[];
}

type SvcStatus = 'running' | 'stopped' | 'failed';
type Severity = 'critical' | 'warning' | 'info';
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// ─── Constants ──────────────────────────────────────────────────────────
const C = {
  cyan: '#5CE1E6',
  violet: '#A78BFA',
  amber: '#FBBF24',
  green: '#34D399',
  red: '#F87171',
  blue: '#60A5FA',
  pink: '#F472B6',
} as const;

const HISTORY = 60;

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Monitor',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'cpu', label: 'Processor', icon: Cpu },
      { id: 'memory', label: 'Memory', icon: MemoryStick },
      { id: 'gpu', label: 'Graphics', icon: Monitor },
      { id: 'storage', label: 'Storage', icon: HardDrive },
      { id: 'network', label: 'Network', icon: Network },
    ],
  },
  {
    group: 'Runtime',
    items: [
      { id: 'processes', label: 'Processes', icon: ListTree },
      { id: 'services', label: 'Services', icon: Activity },
      { id: 'containers', label: 'Containers', icon: Container },
      { id: 'ports', label: 'Open ports', icon: Plug },
    ],
  },
  {
    group: 'Health',
    items: [
      { id: 'sensors', label: 'Sensors', icon: Thermometer },
      { id: 'logs', label: 'System logs', icon: ScrollText },
      { id: 'alerts', label: 'Alerts', icon: Bell, badge: '3', badgeColor: C.amber },
      { id: 'security', label: 'Security', icon: ShieldCheck },
    ],
  },
];

const TAB_META: Record<TabId, { title: string; desc: string }> = {
  overview: { title: 'Overview', desc: 'Tổng quan sức khỏe và tài nguyên toàn hệ thống' },
  cpu: { title: 'Processor', desc: 'Tải, xung nhịp, nhiệt độ và từng core' },
  memory: { title: 'Memory', desc: 'RAM, cache, swap và tiến trình dùng nhiều bộ nhớ' },
  gpu: { title: 'Graphics', desc: 'GPU, VRAM, xung nhịp và tiến trình đồ họa' },
  storage: { title: 'Storage', desc: 'Dung lượng ổ đĩa, tốc độ đọc/ghi và SMART' },
  network: { title: 'Network', desc: 'Băng thông, độ trễ, interface và kết nối' },
  processes: { title: 'Processes', desc: 'Danh sách tiến trình đang chạy' },
  services: { title: 'Services', desc: 'Dịch vụ nền và trạng thái hoạt động' },
  containers: { title: 'Containers', desc: 'Container đang chạy và tài nguyên sử dụng' },
  ports: { title: 'Open ports', desc: 'Cổng mạng đang lắng nghe' },
  sensors: { title: 'Sensors', desc: 'Nhiệt độ, quạt, điện áp và công suất' },
  logs: { title: 'System logs', desc: 'Luồng log hệ thống theo thời gian thực' },
  alerts: { title: 'Alerts', desc: 'Cảnh báo đang hoạt động và quy tắc giám sát' },
  security: { title: 'Security', desc: 'Điểm bảo mật, kiểm tra cấu hình và đăng nhập' },
};

// ─── Mock Data ──────────────────────────────────────────────────────────
const PROCESSES = [
  {
    pid: 1204,
    name: 'phantoma',
    user: 'khanhromvn',
    cpu: 14.2,
    mem: 612,
    threads: 34,
    state: 'running',
  },
  {
    pid: 1388,
    name: 'electron (renderer)',
    user: 'khanhromvn',
    cpu: 9.8,
    mem: 884,
    threads: 22,
    state: 'running',
  },
  {
    pid: 2210,
    name: 'code-server',
    user: 'khanhromvn',
    cpu: 7.4,
    mem: 540,
    threads: 18,
    state: 'running',
  },
  {
    pid: 2981,
    name: 'chromium',
    user: 'khanhromvn',
    cpu: 6.1,
    mem: 1210,
    threads: 41,
    state: 'running',
  },
  {
    pid: 3320,
    name: 'tsserver',
    user: 'khanhromvn',
    cpu: 5.3,
    mem: 702,
    threads: 12,
    state: 'running',
  },
  {
    pid: 811,
    name: 'postgres',
    user: 'postgres',
    cpu: 2.9,
    mem: 318,
    threads: 9,
    state: 'sleeping',
  },
  { pid: 905, name: 'dockerd', user: 'root', cpu: 2.4, mem: 224, threads: 27, state: 'sleeping' },
  {
    pid: 1450,
    name: 'node (profile-server)',
    user: 'khanhromvn',
    cpu: 1.8,
    mem: 196,
    threads: 11,
    state: 'sleeping',
  },
  {
    pid: 1451,
    name: 'node (proxy)',
    user: 'khanhromvn',
    cpu: 1.2,
    mem: 171,
    threads: 10,
    state: 'sleeping',
  },
  {
    pid: 702,
    name: 'redis-server',
    user: 'redis',
    cpu: 0.9,
    mem: 64,
    threads: 4,
    state: 'sleeping',
  },
  { pid: 640, name: 'nginx', user: 'www-data', cpu: 0.4, mem: 48, threads: 5, state: 'sleeping' },
  {
    pid: 590,
    name: 'pipewire',
    user: 'khanhromvn',
    cpu: 0.3,
    mem: 38,
    threads: 6,
    state: 'sleeping',
  },
  { pid: 1102, name: 'Xorg', user: 'root', cpu: 0.8, mem: 142, threads: 8, state: 'running' },
  { pid: 410, name: 'sshd', user: 'root', cpu: 0.1, mem: 12, threads: 1, state: 'sleeping' },
];

const SERVICES: {
  name: string;
  desc: string;
  status: SvcStatus;
  uptime: string;
  restarts: number;
}[] = [
  {
    name: 'phantoma-shell',
    desc: 'Shell backend (port 8080)',
    status: 'running',
    uptime: '3d 12h',
    restarts: 0,
  },
  {
    name: 'phantoma-emulate',
    desc: 'Emulate service (port 3002)',
    status: 'running',
    uptime: '3d 12h',
    restarts: 1,
  },
  {
    name: 'phantoma-profile',
    desc: 'Profile server (port 3033)',
    status: 'running',
    uptime: '1d 04h',
    restarts: 0,
  },
  {
    name: 'phantoma-proxy',
    desc: 'Proxy server (port 3044)',
    status: 'running',
    uptime: '1d 04h',
    restarts: 2,
  },
  {
    name: 'foxhole-vpn',
    desc: 'VPN to SOCKS5 bridge',
    status: 'stopped',
    uptime: '-',
    restarts: 0,
  },
  {
    name: 'cloudflare-warp',
    desc: 'WARP SOCKS5 on 127.0.0.1',
    status: 'failed',
    uptime: '-',
    restarts: 5,
  },
  {
    name: 'postgresql',
    desc: 'Database server',
    status: 'running',
    uptime: '12d 02h',
    restarts: 0,
  },
  { name: 'docker', desc: 'Container runtime', status: 'running', uptime: '12d 02h', restarts: 0 },
];

const CONTAINERS = [
  { name: 'pg-main', image: 'postgres:16', status: 'running', cpu: 3.2, mem: 31, ports: '5432' },
  {
    name: 'redis-cache',
    image: 'redis:7-alpine',
    status: 'running',
    cpu: 0.8,
    mem: 9,
    ports: '6379',
  },
  {
    name: 'nginx-edge',
    image: 'nginx:1.27',
    status: 'running',
    cpu: 0.4,
    mem: 6,
    ports: '80, 443',
  },
  {
    name: 'grafana',
    image: 'grafana/grafana',
    status: 'running',
    cpu: 2.1,
    mem: 22,
    ports: '3000',
  },
  { name: 'minio', image: 'minio/minio', status: 'paused', cpu: 0, mem: 14, ports: '9000' },
  { name: 'old-worker', image: 'node:20-slim', status: 'exited', cpu: 0, mem: 0, ports: '-' },
];

const PORTS = [
  { port: 22, proto: 'TCP', process: 'sshd', addr: '0.0.0.0', state: 'LISTEN' },
  { port: 80, proto: 'TCP', process: 'nginx', addr: '0.0.0.0', state: 'LISTEN' },
  { port: 443, proto: 'TCP', process: 'nginx', addr: '0.0.0.0', state: 'LISTEN' },
  { port: 3002, proto: 'TCP', process: 'phantoma-emulate', addr: '127.0.0.1', state: 'LISTEN' },
  { port: 3033, proto: 'TCP', process: 'phantoma-profile', addr: '127.0.0.1', state: 'LISTEN' },
  { port: 3044, proto: 'TCP', process: 'phantoma-proxy', addr: '127.0.0.1', state: 'LISTEN' },
  { port: 5432, proto: 'TCP', process: 'postgres', addr: '127.0.0.1', state: 'LISTEN' },
  { port: 6379, proto: 'TCP', process: 'redis-server', addr: '127.0.0.1', state: 'LISTEN' },
  { port: 8080, proto: 'TCP', process: 'phantoma-shell', addr: '127.0.0.1', state: 'LISTEN' },
  { port: 5353, proto: 'UDP', process: 'avahi-daemon', addr: '0.0.0.0', state: 'OPEN' },
];

const DISKS = [
  {
    name: 'nvme0n1p2',
    mount: '/',
    fs: 'ext4',
    used: 234,
    total: 500,
    type: 'NVMe SSD',
    smart: 'Healthy',
  },
  {
    name: 'nvme0n1p3',
    mount: '/home',
    fs: 'ext4',
    used: 412,
    total: 900,
    type: 'NVMe SSD',
    smart: 'Healthy',
  },
  {
    name: 'sda1',
    mount: '/mnt/data',
    fs: 'btrfs',
    used: 1620,
    total: 2000,
    type: 'HDD 7200rpm',
    smart: 'Warning',
  },
  {
    name: 'nvme0n1p1',
    mount: '/boot/efi',
    fs: 'vfat',
    used: 0.2,
    total: 0.5,
    type: 'NVMe SSD',
    smart: 'Healthy',
  },
];

const INTERFACES = [
  { name: 'eth0', ip: '192.168.1.24', state: 'up', rx: '128.7 GB', tx: '45.2 GB' },
  { name: 'wlan0', ip: '192.168.1.31', state: 'up', rx: '12.4 GB', tx: '3.1 GB' },
  { name: 'docker0', ip: '172.17.0.1', state: 'up', rx: '4.2 GB', tx: '2.8 GB' },
  { name: 'tailscale0', ip: '100.88.12.5', state: 'up', rx: '820 MB', tx: '410 MB' },
  { name: 'lo', ip: '127.0.0.1', state: 'up', rx: '9.6 GB', tx: '9.6 GB' },
];

const TEMP_SENSORS = [
  { name: 'CPU Package', offset: 0, max: 95 },
  { name: 'CPU Core 0', offset: -3, max: 95 },
  { name: 'CPU Core 4', offset: 2, max: 95 },
  { name: 'GPU Core', offset: -6, max: 90 },
  { name: 'NVMe Composite', offset: -14, max: 75 },
  { name: 'Motherboard', offset: -22, max: 70 },
];

const FANS = [
  { name: 'CPU Fan', rpm: 1480, max: 2400 },
  { name: 'Case Fan 1', rpm: 920, max: 1800 },
  { name: 'Case Fan 2', rpm: 880, max: 1800 },
  { name: 'GPU Fan', rpm: 1320, max: 3200 },
];

const RAILS = [
  { name: '+12V', value: '12.08 V' },
  { name: '+5V', value: '5.02 V' },
  { name: '+3.3V', value: '3.31 V' },
  { name: 'VCore', value: '1.19 V' },
  { name: 'DIMM', value: '1.36 V' },
  { name: 'Battery', value: '98 %' },
];

const ACTIVE_ALERTS: { title: string; detail: string; sev: Severity; time: string }[] = [
  {
    title: 'Disk /mnt/data above 80%',
    detail: 'sda1 is using 1620 of 2000 GB',
    sev: 'warning',
    time: '4m ago',
  },
  {
    title: 'Service cloudflare-warp failed',
    detail: 'Exited with code 1 after 5 restarts',
    sev: 'critical',
    time: '18m ago',
  },
  {
    title: 'SMART warning on sda',
    detail: 'Reallocated sector count increased',
    sev: 'warning',
    time: '1h ago',
  },
];

const ALERT_RULES: { id: string; name: string; cond: string; sev: Severity }[] = [
  { id: 'r1', name: 'High CPU load', cond: 'CPU > 90% for 5 minutes', sev: 'warning' },
  { id: 'r2', name: 'Memory pressure', cond: 'RAM > 85% for 3 minutes', sev: 'warning' },
  { id: 'r3', name: 'Disk almost full', cond: 'Any volume > 90%', sev: 'critical' },
  { id: 'r4', name: 'CPU overheating', cond: 'Package > 88 C', sev: 'critical' },
  { id: 'r5', name: 'Service down', cond: 'Any managed service not running', sev: 'critical' },
  { id: 'r6', name: 'High latency', cond: 'Ping > 150 ms for 1 minute', sev: 'info' },
];

const SECURITY_CHECKS: { name: string; detail: string; status: 'ok' | 'warn' | 'bad' }[] = [
  { name: 'Firewall', detail: 'ufw active, default deny incoming', status: 'ok' },
  { name: 'Disk encryption', detail: 'LUKS enabled on /home', status: 'ok' },
  { name: 'System updates', detail: '14 packages can be upgraded', status: 'warn' },
  { name: 'SSH root login', detail: 'PermitRootLogin is disabled', status: 'ok' },
  { name: 'Open ports', detail: '2 ports exposed on 0.0.0.0 (80, 443)', status: 'warn' },
  { name: 'Failed service', detail: 'cloudflare-warp is in failed state', status: 'bad' },
];

const LOGIN_EVENTS = [
  { user: 'khanhromvn', from: 'tty2', time: 'Today 08:12', ok: true },
  { user: 'khanhromvn', from: '192.168.1.40 (ssh)', time: 'Yesterday 22:41', ok: true },
  { user: 'root', from: '45.133.1.9 (ssh)', time: 'Yesterday 03:17', ok: false },
  { user: 'admin', from: '45.133.1.9 (ssh)', time: 'Yesterday 03:17', ok: false },
];

const LOG_SEED: { time: string; level: LogLevel; src: string; msg: string }[] = [
  { time: '08:41:02', level: 'info', src: 'systemd', msg: 'Started Phantoma Shell Backend.' },
  { time: '08:41:05', level: 'info', src: 'phantoma-profile', msg: 'Listening on 127.0.0.1:3033' },
  {
    time: '08:42:11',
    level: 'debug',
    src: 'phantoma-proxy',
    msg: 'Health check passed for 12 proxies',
  },
  {
    time: '08:44:37',
    level: 'warn',
    src: 'smartd',
    msg: 'Device /dev/sda: Reallocated sector count increased',
  },
  {
    time: '08:46:20',
    level: 'error',
    src: 'cloudflare-warp',
    msg: 'Failed to bind SOCKS5 listener: address in use',
  },
  {
    time: '08:46:21',
    level: 'warn',
    src: 'systemd',
    msg: 'cloudflare-warp.service: Scheduled restart job',
  },
  {
    time: '08:47:09',
    level: 'info',
    src: 'docker',
    msg: 'Container pg-main health status: healthy',
  },
  { time: '08:49:44', level: 'debug', src: 'kernel', msg: 'nvme0: queue depth reached 32' },
];

const LOG_TEMPLATES: { level: LogLevel; src: string; msg: string }[] = [
  { level: 'info', src: 'phantoma-shell', msg: 'GET /health 200 2ms' },
  { level: 'debug', src: 'phantoma-proxy', msg: 'Rotated upstream connection pool' },
  { level: 'info', src: 'docker', msg: 'Container redis-cache health status: healthy' },
  { level: 'warn', src: 'kernel', msg: 'CPU temperature above threshold, throttling' },
  { level: 'error', src: 'sshd', msg: 'Failed password for invalid user admin' },
  { level: 'debug', src: 'systemd', msg: 'Reloaded configuration of unit nginx.service' },
  { level: 'info', src: 'postgres', msg: 'checkpoint complete: wrote 412 buffers' },
];

const GPU_PROCESSES = [
  { name: 'electron (renderer)', vram: 812, util: 14 },
  { name: 'chromium', vram: 640, util: 9 },
  { name: 'Xorg', vram: 210, util: 3 },
  { name: 'phantoma', vram: 128, util: 2 },
];

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: C.blue,
  warn: C.amber,
  error: C.red,
  debug: '#8891A4',
};

const SEV_COLOR: Record<Severity, string> = {
  critical: C.red,
  warning: C.amber,
  info: C.blue,
};

const SVC_COLOR: Record<SvcStatus, string> = {
  running: C.green,
  stopped: '#8891A4',
  failed: C.red,
};

// ─── Helpers ────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const last = (a: number[]) => a[a.length - 1];
const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

const seed = (base: number, spread: number, lo = 0, hi = 100) =>
  Array.from({ length: HISTORY }, (_, i) =>
    clamp(base + Math.sin(i / 6) * spread + (Math.random() - 0.5) * spread, lo, hi),
  );

const roll = (arr: number[], step: number, lo = 0, hi = 100) => [
  ...arr.slice(1),
  clamp(last(arr) + (Math.random() - 0.5) * step, lo, hi),
];

const initMetrics = (): Metrics => ({
  cpu: seed(45, 18),
  mem: seed(62, 4, 30, 95),
  gpu: seed(32, 22),
  up: seed(4, 3, 0, 30),
  down: seed(12, 8, 0, 60),
  read: seed(80, 40, 0, 400),
  write: seed(30, 20, 0, 300),
  temp: seed(62, 5, 30, 95),
  power: seed(64, 12, 10, 200),
  latency: seed(12, 4, 1, 80),
  cores: Array.from({ length: 16 }, () => Math.random() * 70 + 10),
});

const nextMetrics = (m: Metrics): Metrics => ({
  cpu: roll(m.cpu, 14),
  mem: roll(m.mem, 1.2, 30, 95),
  gpu: roll(m.gpu, 18),
  up: roll(m.up, 3, 0, 30),
  down: roll(m.down, 8, 0, 60),
  read: roll(m.read, 60, 0, 400),
  write: roll(m.write, 40, 0, 300),
  temp: roll(m.temp, 3, 30, 95),
  power: roll(m.power, 10, 10, 200),
  latency: roll(m.latency, 4, 1, 80),
  cores: m.cores.map((c) => clamp(c + (Math.random() - 0.5) * 22, 2, 100)),
});

const loadColor = (v: number, base: string) => (v >= 85 ? C.red : v >= 65 ? C.amber : base);
const tempColor = (v: number, max: number) =>
  v >= max * 0.9 ? C.red : v >= max * 0.75 ? C.amber : C.green;
const pad2 = (n: number) => String(n).padStart(2, '0');
const nowTime = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

// ─── Hooks ──────────────────────────────────────────────────────────────
function useMetrics(active: boolean, intervalMs: number): Metrics {
  const [m, setM] = useState<Metrics>(initMetrics);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setM((prev) => nextMetrics(prev)), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
  return m;
}

// ─── Primitives ─────────────────────────────────────────────────────────
function Card({
  title,
  icon,
  right,
  children,
  className,
}: {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card-background/60 p-4', className)}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-medium text-text-secondary">
            {icon}
            {title}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium"
      style={{ color, backgroundColor: `${color}1A` }}
    >
      {children}
    </span>
  );
}

function Bar({ value, color, h = 4 }: { value: number; color: string; h?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-text-secondary/10" style={{ height: h }}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${clamp(value, 0, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <span className="text-[11.5px] text-text-secondary">{k}</span>
      <span className="truncate font-mono text-[11.5px] text-text-primary">{v}</span>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md bg-text-secondary/10 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === o.id
              ? 'bg-card-background text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-8 w-56 items-center gap-2 rounded-md bg-input-background px-2.5">
      <Search className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-secondary/50"
      />
    </div>
  );
}

function Ring({
  value,
  size = 104,
  stroke = 9,
  color,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value, 0, 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 text-text-secondary">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function AreaChart({
  series,
  height = 140,
  max,
  grid = true,
}: {
  series: Series[];
  height?: number;
  max?: number;
  grid?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const w = 600;
  const top = max ?? Math.max(1, ...series.flatMap((s) => s.data)) * 1.15;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="block w-full text-text-secondary"
      style={{ height }}
    >
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {grid &&
        [0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={w}
            y1={height * g}
            y2={height * g}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      {series.map((s, i) => {
        const pts = s.data.map(
          (v, j) =>
            `${((j / (s.data.length - 1)) * w).toFixed(1)},${(height - (v / top) * (height - 6) - 3).toFixed(1)}`,
        );
        const line = 'M' + pts.join(' L');
        return (
          <g key={i}>
            <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${uid}-${i})`} />
            <path
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth={1.6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

function Stat({
  label,
  value,
  unit,
  color,
  icon,
  series,
  foot,
  max,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  icon: ReactNode;
  series?: number[];
  foot?: string;
  max?: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] text-text-secondary">
          <span style={{ color }}>{icon}</span>
          {label}
        </span>
        {foot && <span className="truncate text-[10.5px] text-text-secondary">{foot}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-[26px] font-semibold leading-none tabular-nums text-text-primary">
          {value}
        </span>
        {unit && <span className="text-xs text-text-secondary">{unit}</span>}
      </div>
      {series && (
        <div className="-mx-4 -mb-4 mt-3">
          <AreaChart series={[{ data: series, color }]} height={44} grid={false} max={max} />
        </div>
      )}
    </Card>
  );
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-3 py-2 text-left text-[10.5px] font-medium uppercase tracking-wide text-text-secondary',
        className,
      )}
    >
      {children}
    </th>
  );
}

// ─── Tab: Overview ──────────────────────────────────────────────────────
function Overview({ m }: { m: Metrics }) {
  const cpu = last(m.cpu);
  const mem = last(m.mem);
  const gpu = last(m.gpu);
  const temp = last(m.temp);
  const score = clamp(Math.round(100 - (cpu * 0.25 + mem * 0.25 + 15 + (temp - 30) * 0.3)), 0, 100);
  const scoreColor = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  const topProcs = [...PROCESSES].sort((a, b) => b.cpu - a.cpu).slice(0, 5);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Processor"
          value={cpu.toFixed(0)}
          unit="%"
          color={C.cyan}
          icon={<Cpu className="h-3.5 w-3.5" />}
          series={m.cpu}
          max={100}
          foot={`${temp.toFixed(0)}°C`}
        />
        <Stat
          label="Memory"
          value={mem.toFixed(0)}
          unit="%"
          color={C.violet}
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          series={m.mem}
          max={100}
          foot={`${(mem * 0.2).toFixed(1)} / 20 GB`}
        />
        <Stat
          label="Graphics"
          value={gpu.toFixed(0)}
          unit="%"
          color={C.amber}
          icon={<Monitor className="h-3.5 w-3.5" />}
          series={m.gpu}
          max={100}
          foot="4.2 / 12 GB VRAM"
        />
        <Stat
          label="Network"
          value={last(m.down).toFixed(1)}
          unit="MB/s"
          color={C.green}
          icon={<Network className="h-3.5 w-3.5" />}
          series={m.down}
          foot={`Up ${last(m.up).toFixed(1)} MB/s`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card
          title="Resource timeline"
          icon={<Activity className="h-3.5 w-3.5" />}
          className="lg:col-span-2"
          right={
            <Legend
              items={[
                { label: 'CPU', color: C.cyan },
                { label: 'Memory', color: C.violet },
                { label: 'GPU', color: C.amber },
              ]}
            />
          }
        >
          <AreaChart
            height={190}
            max={100}
            series={[
              { data: m.cpu, color: C.cyan },
              { data: m.mem, color: C.violet },
              { data: m.gpu, color: C.amber },
            ]}
          />
          <div className="mt-2 flex justify-between text-[10.5px] text-text-secondary">
            <span>-60s</span>
            <span>-30s</span>
            <span>now</span>
          </div>
        </Card>

        <Card title="Health score" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-4">
            <Ring value={score} color={scoreColor}>
              <span className="font-mono text-2xl font-bold leading-none text-text-primary">
                {score}
              </span>
              <span className="mt-0.5 text-[10px] text-text-secondary">of 100</span>
            </Ring>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {[
                { k: 'Performance', v: 100 - cpu * 0.6 },
                { k: 'Thermals', v: 100 - (temp - 30) },
                { k: 'Stability', v: 94 },
              ].map((r) => (
                <div key={r.k}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-text-secondary">{r.k}</span>
                    <span className="font-mono text-text-primary">{r.v.toFixed(0)}</span>
                  </div>
                  <Bar value={r.v} color={scoreColor} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Top processes" icon={<ListTree className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-2.5">
            {topProcs.map((p) => (
              <div key={p.pid}>
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="truncate text-text-primary">{p.name}</span>
                  <span className="font-mono text-text-secondary">{p.cpu.toFixed(1)}%</span>
                </div>
                <Bar value={p.cpu * 4} color={C.cyan} h={3} />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Active alerts"
          icon={<Bell className="h-3.5 w-3.5" />}
          right={<Pill color={C.amber}>{ACTIVE_ALERTS.length} open</Pill>}
        >
          <div className="flex flex-col gap-2">
            {ACTIVE_ALERTS.map((a) => (
              <div
                key={a.title}
                className="flex items-start gap-2.5 rounded-lg bg-text-secondary/5 px-2.5 py-2"
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: SEV_COLOR[a.sev] }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-text-primary">{a.title}</p>
                  <p className="text-[10.5px] text-text-secondary">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="System info" icon={<Server className="h-3.5 w-3.5" />}>
          <KV k="Hostname" v="phantoma-dev" />
          <KV k="OS" v="Ubuntu 24.04 LTS" />
          <KV k="Kernel" v="6.8.0-45-generic" />
          <KV k="Architecture" v="x86_64" />
          <KV k="Uptime" v="3d 12h 45m" />
          <KV k="Load average" v="1.42  1.18  0.97" />
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: CPU ───────────────────────────────────────────────────────────
function CpuTab({ m }: { m: Metrics }) {
  const cpu = last(m.cpu);
  const heat = (v: number) => `hsla(${160 - v * 1.4}, 70%, 50%, ${0.2 + v / 160})`;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Utilization"
          value={cpu.toFixed(0)}
          unit="%"
          color={C.cyan}
          icon={<Cpu className="h-3.5 w-3.5" />}
          series={m.cpu}
          max={100}
        />
        <Stat
          label="Frequency"
          value={(3.2 + (cpu / 100) * 1.4).toFixed(2)}
          unit="GHz"
          color={C.violet}
          icon={<Zap className="h-3.5 w-3.5" />}
          foot="Boost 4.6 GHz"
        />
        <Stat
          label="Temperature"
          value={last(m.temp).toFixed(0)}
          unit="°C"
          color={tempColor(last(m.temp), 95)}
          icon={<Thermometer className="h-3.5 w-3.5" />}
          series={m.temp}
          max={100}
        />
        <Stat
          label="Load average"
          value="1.42"
          color={C.amber}
          icon={<Activity className="h-3.5 w-3.5" />}
          foot="1m / 5m / 15m"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Utilization history" className="lg:col-span-2">
          <AreaChart series={[{ data: m.cpu, color: C.cyan }]} height={170} max={100} />
        </Card>
        <Card title="Details">
          <KV k="Model" v="AMD Ryzen 7 5800X" />
          <KV k="Cores / Threads" v="8 / 16" />
          <KV k="L1 cache" v="512 KB" />
          <KV k="L2 cache" v="4 MB" />
          <KV k="L3 cache" v="32 MB" />
          <KV k="Governor" v="schedutil" />
          <KV k="Average" v={`${avg(m.cpu).toFixed(1)} %`} />
        </Card>
      </div>

      <Card
        title="Per-core activity"
        icon={<Cpu className="h-3.5 w-3.5" />}
        right={<span className="text-[10.5px] text-text-secondary">16 logical cores</span>}
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {m.cores.map((c, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-lg py-3 transition-colors duration-500"
              style={{ backgroundColor: heat(c) }}
            >
              <span className="text-[10px] text-text-secondary">Core {i}</span>
              <span className="font-mono text-[15px] font-semibold tabular-nums text-text-primary">
                {c.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Memory ────────────────────────────────────────────────────────
function MemoryTab({ m }: { m: Metrics }) {
  const mem = last(m.mem);
  const used = mem * 0.2;
  const segments = [
    { label: 'Applications', pct: mem * 0.68, color: C.violet },
    { label: 'Cache', pct: 14, color: C.cyan },
    { label: 'Buffers', pct: 4, color: C.blue },
    { label: 'Shared', pct: 2, color: C.pink },
  ];
  const free = clamp(100 - segments.reduce((s, x) => s + x.pct, 0), 0, 100);
  const consumers = [...PROCESSES].sort((a, b) => b.mem - a.mem).slice(0, 6);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="In use"
          value={used.toFixed(1)}
          unit="GB"
          color={C.violet}
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          series={m.mem}
          max={100}
        />
        <Stat
          label="Available"
          value={(20 - used).toFixed(1)}
          unit="GB"
          color={C.green}
          icon={<CheckCircle className="h-3.5 w-3.5" />}
          foot="of 20 GB"
        />
        <Stat
          label="Cached"
          value="2.8"
          unit="GB"
          color={C.cyan}
          icon={<HardDrive className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Swap"
          value="1.1"
          unit="GB"
          color={C.amber}
          icon={<Activity className="h-3.5 w-3.5" />}
          foot="of 8 GB"
        />
      </div>

      <Card title="Memory composition" icon={<MemoryStick className="h-3.5 w-3.5" />}>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-text-secondary/10">
          {segments.map((s) => (
            <div
              key={s.label}
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {segments.map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-1.5 text-[11.5px] text-text-secondary"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
              <span className="font-mono text-text-primary">
                {((s.pct / 100) * 20).toFixed(1)} GB
              </span>
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[11.5px] text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-text-secondary/30" />
            Free
            <span className="font-mono text-text-primary">{((free / 100) * 20).toFixed(1)} GB</span>
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Usage history" className="lg:col-span-2">
          <AreaChart series={[{ data: m.mem, color: C.violet }]} height={170} max={100} />
        </Card>
        <Card title="Top consumers">
          <div className="flex flex-col gap-2.5">
            {consumers.map((p) => (
              <div key={p.pid}>
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="truncate text-text-primary">{p.name}</span>
                  <span className="font-mono text-text-secondary">{p.mem} MB</span>
                </div>
                <Bar value={(p.mem / 1300) * 100} color={C.violet} h={3} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: GPU ───────────────────────────────────────────────────────────
function GpuTab({ m }: { m: Metrics }) {
  const gpu = last(m.gpu);
  const vram = 4.2 + (gpu / 100) * 1.6;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="GPU load"
          value={gpu.toFixed(0)}
          unit="%"
          color={C.amber}
          icon={<Monitor className="h-3.5 w-3.5" />}
          series={m.gpu}
          max={100}
        />
        <Stat
          label="VRAM"
          value={vram.toFixed(1)}
          unit="GB"
          color={C.violet}
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          foot="of 12 GB"
        />
        <Stat
          label="Temperature"
          value={(last(m.temp) - 6).toFixed(0)}
          unit="°C"
          color={tempColor(last(m.temp) - 6, 90)}
          icon={<Thermometer className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Board power"
          value={(last(m.power) * 2.1).toFixed(0)}
          unit="W"
          color={C.cyan}
          icon={<Zap className="h-3.5 w-3.5" />}
          foot="TDP 220 W"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="GPU utilization" className="lg:col-span-2">
          <AreaChart series={[{ data: m.gpu, color: C.amber }]} height={170} max={100} />
        </Card>
        <Card title="Details">
          <KV k="Model" v="NVIDIA GeForce RTX 3070" />
          <KV k="Driver" v="560.35.03" />
          <KV k="Core clock" v={`${(1200 + gpu * 9).toFixed(0)} MHz`} />
          <KV k="Memory clock" v="7001 MHz" />
          <KV k="Fan speed" v={`${(30 + gpu * 0.5).toFixed(0)} %`} />
          <KV k="Encoder" v="3 %" />
          <KV k="Decoder" v="1 %" />
        </Card>
      </div>

      <Card title="GPU processes" icon={<ListTree className="h-3.5 w-3.5" />}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Process</Th>
              <Th className="w-32">VRAM</Th>
              <Th className="w-48">Load</Th>
            </tr>
          </thead>
          <tbody>
            {GPU_PROCESSES.map((p) => (
              <tr key={p.name} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 text-[12px] text-text-primary">{p.name}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{p.vram} MB</td>
                <td className="px-3 py-2">
                  <Bar value={p.util * 4} color={C.amber} h={3} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Tab: Storage ───────────────────────────────────────────────────────
function StorageTab({ m }: { m: Metrics }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Read"
          value={last(m.read).toFixed(0)}
          unit="MB/s"
          color={C.cyan}
          icon={<ArrowDown className="h-3.5 w-3.5" />}
          series={m.read}
        />
        <Stat
          label="Write"
          value={last(m.write).toFixed(0)}
          unit="MB/s"
          color={C.pink}
          icon={<ArrowUp className="h-3.5 w-3.5" />}
          series={m.write}
        />
        <Stat
          label="IOPS"
          value={(last(m.read) * 11 + last(m.write) * 9).toFixed(0)}
          color={C.violet}
          icon={<Activity className="h-3.5 w-3.5" />}
          foot="read + write"
        />
        <Stat
          label="Queue depth"
          value={(last(m.cpu) / 12 + 1).toFixed(1)}
          color={C.amber}
          icon={<HardDrive className="h-3.5 w-3.5" />}
        />
      </div>

      <Card
        title="Disk throughput"
        right={
          <Legend
            items={[
              { label: 'Read', color: C.cyan },
              { label: 'Write', color: C.pink },
            ]}
          />
        }
      >
        <AreaChart
          series={[
            { data: m.read, color: C.cyan },
            { data: m.write, color: C.pink },
          ]}
          height={160}
        />
      </Card>

      <Card title="Volumes" icon={<HardDrive className="h-3.5 w-3.5" />}>
        <div className="flex flex-col gap-4">
          {DISKS.map((d) => {
            const pct = (d.used / d.total) * 100;
            return (
              <div key={d.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[12.5px] text-text-primary">{d.mount}</span>
                    <span className="text-[11px] text-text-secondary">
                      {d.name} · {d.fs} · {d.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill color={d.smart === 'Healthy' ? C.green : C.amber}>{d.smart}</Pill>
                    <span className="font-mono text-[11.5px] text-text-secondary">
                      {d.used} / {d.total} GB
                    </span>
                  </div>
                </div>
                <Bar value={pct} color={loadColor(pct, C.cyan)} h={6} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Network ───────────────────────────────────────────────────────
function NetworkTab({ m }: { m: Metrics }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Download"
          value={last(m.down).toFixed(1)}
          unit="MB/s"
          color={C.green}
          icon={<ArrowDown className="h-3.5 w-3.5" />}
          series={m.down}
          foot="Total 128.7 GB"
        />
        <Stat
          label="Upload"
          value={last(m.up).toFixed(1)}
          unit="MB/s"
          color={C.cyan}
          icon={<ArrowUp className="h-3.5 w-3.5" />}
          series={m.up}
          foot="Total 45.2 GB"
        />
        <Stat
          label="Latency"
          value={last(m.latency).toFixed(0)}
          unit="ms"
          color={loadColor(last(m.latency), C.violet)}
          icon={<Clock className="h-3.5 w-3.5" />}
          series={m.latency}
        />
        <Stat
          label="Connections"
          value={(240 + last(m.down) * 2).toFixed(0)}
          color={C.amber}
          icon={<Network className="h-3.5 w-3.5" />}
          foot="established"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card
          title="Bandwidth"
          className="lg:col-span-2"
          right={
            <Legend
              items={[
                { label: 'Download', color: C.green },
                { label: 'Upload', color: C.cyan },
              ]}
            />
          }
        >
          <AreaChart
            series={[
              { data: m.down, color: C.green },
              { data: m.up, color: C.cyan },
            ]}
            height={170}
          />
        </Card>
        <Card title="Connectivity">
          <KV k="Gateway" v="192.168.1.1" />
          <KV k="DNS" v="1.1.1.1 / 8.8.8.8" />
          <KV k="Public IP" v="203.0.113.42" />
          <KV k="Packet loss" v="0.0 %" />
          <KV k="Jitter" v={`${(last(m.latency) / 6).toFixed(1)} ms`} />
          <KV k="Avg latency" v={`${avg(m.latency).toFixed(1)} ms`} />
        </Card>
      </div>

      <Card title="Interfaces" icon={<Network className="h-3.5 w-3.5" />}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Name</Th>
              <Th>Address</Th>
              <Th>State</Th>
              <Th>Received</Th>
              <Th>Sent</Th>
            </tr>
          </thead>
          <tbody>
            {INTERFACES.map((i) => (
              <tr
                key={i.name}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
              >
                <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{i.name}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{i.ip}</td>
                <td className="px-3 py-2">
                  <Pill color={C.green}>{i.state}</Pill>
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{i.rx}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{i.tx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Tab: Processes ─────────────────────────────────────────────────────
function ProcessesTab() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'cpu' | 'mem' | 'pid'>('cpu');
  const rows = PROCESSES.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).sort(
    (a, b) => (sort === 'pid' ? a.pid - b.pid : b[sort] - a[sort]),
  );
  return (
    <Card
      title={`${rows.length} processes`}
      icon={<ListTree className="h-3.5 w-3.5" />}
      right={
        <div className="flex items-center gap-2">
          <Chips
            value={sort}
            onChange={setSort}
            options={[
              { id: 'cpu', label: 'CPU' },
              { id: 'mem', label: 'Memory' },
              { id: 'pid', label: 'PID' },
            ]}
          />
          <SearchBox value={query} onChange={setQuery} placeholder="Filter processes" />
        </div>
      }
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <Th className="w-20">PID</Th>
            <Th>Name</Th>
            <Th>User</Th>
            <Th className="w-44">CPU</Th>
            <Th className="w-28">Memory</Th>
            <Th className="w-20">Threads</Th>
            <Th className="w-24">State</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.pid}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
            >
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{p.pid}</td>
              <td className="px-3 py-2 text-[12px] text-text-primary">{p.name}</td>
              <td className="px-3 py-2 text-[12px] text-text-secondary">{p.user}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-10 font-mono text-[12px] text-text-primary">
                    {p.cpu.toFixed(1)}
                  </span>
                  <Bar value={p.cpu * 4} color={loadColor(p.cpu * 4, C.cyan)} h={3} />
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{p.mem} MB</td>
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{p.threads}</td>
              <td className="px-3 py-2">
                <Pill color={p.state === 'running' ? C.green : '#8891A4'}>{p.state}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ─── Tab: Services ──────────────────────────────────────────────────────
function ServicesTab() {
  const [items, setItems] = useState(SERVICES);
  const toggle = (name: string) =>
    setItems((prev) =>
      prev.map((s) =>
        s.name === name ? { ...s, status: s.status === 'running' ? 'stopped' : 'running' } : s,
      ),
    );
  const counts = {
    running: items.filter((s) => s.status === 'running').length,
    stopped: items.filter((s) => s.status === 'stopped').length,
    failed: items.filter((s) => s.status === 'failed').length,
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Running"
          value={String(counts.running)}
          color={C.green}
          icon={<CheckCircle className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Stopped"
          value={String(counts.stopped)}
          color="#8891A4"
          icon={<Pause className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Failed"
          value={String(counts.failed)}
          color={C.red}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
      </div>
      <Card title="Managed services" icon={<Activity className="h-3.5 w-3.5" />}>
        <div className="flex flex-col">
          {items.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  s.status === 'running' && 'animate-pulse',
                )}
                style={{ backgroundColor: SVC_COLOR[s.status] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12.5px] text-text-primary">{s.name}</p>
                <p className="truncate text-[11px] text-text-secondary">{s.desc}</p>
              </div>
              <span className="w-20 text-right font-mono text-[11.5px] text-text-secondary">
                {s.uptime}
              </span>
              <span className="w-24 text-right text-[11px] text-text-secondary">
                {s.restarts} restarts
              </span>
              <Pill color={SVC_COLOR[s.status]}>{s.status}</Pill>
              <button
                onClick={() => toggle(s.name)}
                className="flex h-7 w-16 items-center justify-center gap-1 rounded-md bg-primary/10 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
              >
                {s.status === 'running' ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {s.status === 'running' ? 'Stop' : s.status === 'failed' ? 'Retry' : 'Start'}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Containers ────────────────────────────────────────────────────
function ContainersTab() {
  const statusColor = (s: string) =>
    s === 'running' ? C.green : s === 'paused' ? C.amber : '#8891A4';
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {CONTAINERS.map((c) => (
        <Card key={c.name}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Container className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-[12.5px] text-text-primary">{c.name}</p>
                <p className="truncate text-[11px] text-text-secondary">{c.image}</p>
              </div>
            </div>
            <Pill color={statusColor(c.status)}>{c.status}</Pill>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-text-secondary">CPU</span>
                <span className="font-mono text-text-primary">{c.cpu.toFixed(1)}%</span>
              </div>
              <Bar value={c.cpu * 6} color={C.cyan} h={3} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-text-secondary">Memory</span>
                <span className="font-mono text-text-primary">{c.mem} MB</span>
              </div>
              <Bar value={c.mem * 2} color={C.violet} h={3} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Ports</span>
            <span className="font-mono text-text-primary">{c.ports}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Ports ─────────────────────────────────────────────────────────
function PortsTab() {
  const [query, setQuery] = useState('');
  const rows = PORTS.filter(
    (p) => String(p.port).includes(query) || p.process.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Card
      title={`${rows.length} listening sockets`}
      icon={<Plug className="h-3.5 w-3.5" />}
      right={<SearchBox value={query} onChange={setQuery} placeholder="Port or process" />}
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <Th className="w-24">Port</Th>
            <Th className="w-24">Protocol</Th>
            <Th>Process</Th>
            <Th>Bind address</Th>
            <Th className="w-28">State</Th>
            <Th className="w-28">Exposure</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={`${p.proto}-${p.port}`}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
            >
              <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{p.port}</td>
              <td className="px-3 py-2 text-[12px] text-text-secondary">{p.proto}</td>
              <td className="px-3 py-2 text-[12px] text-text-primary">{p.process}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{p.addr}</td>
              <td className="px-3 py-2">
                <Pill color={C.green}>{p.state}</Pill>
              </td>
              <td className="px-3 py-2">
                <Pill color={p.addr === '0.0.0.0' ? C.amber : C.cyan}>
                  {p.addr === '0.0.0.0' ? 'Public' : 'Local'}
                </Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ─── Tab: Sensors ───────────────────────────────────────────────────────
function SensorsTab({ m }: { m: Metrics }) {
  const base = last(m.temp);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Temperatures" icon={<Thermometer className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-3">
            {TEMP_SENSORS.map((s) => {
              const v = base + s.offset;
              return (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-[11.5px]">
                    <span className="text-text-secondary">{s.name}</span>
                    <span className="font-mono text-text-primary">{v.toFixed(0)}°C</span>
                  </div>
                  <Bar value={(v / s.max) * 100} color={tempColor(v, s.max)} h={5} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Fans" icon={<Fan className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-3">
            {FANS.map((f) => {
              const rpm = f.rpm + (base - 62) * 14;
              return (
                <div key={f.name}>
                  <div className="mb-1 flex justify-between text-[11.5px]">
                    <span className="text-text-secondary">{f.name}</span>
                    <span className="font-mono text-text-primary">{rpm.toFixed(0)} RPM</span>
                  </div>
                  <Bar value={(rpm / f.max) * 100} color={C.cyan} h={5} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Power draw" icon={<Zap className="h-3.5 w-3.5" />} className="lg:col-span-2">
          <AreaChart series={[{ data: m.power, color: C.amber }]} height={150} />
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-xl font-semibold text-text-primary">
              {last(m.power).toFixed(0)}
            </span>
            <span className="text-xs text-text-secondary">
              W now · avg {avg(m.power).toFixed(0)} W
            </span>
          </div>
        </Card>
        <Card title="Voltage rails">
          {RAILS.map((r) => (
            <KV key={r.name} k={r.name} v={r.value} />
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Logs ──────────────────────────────────────────────────────────
function LogsTab({ live, intervalMs }: { live: boolean; intervalMs: number }) {
  const [logs, setLogs] = useState(LOG_SEED);
  const [level, setLevel] = useState<'all' | LogLevel>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(
      () => {
        const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
        setLogs((prev) => [...prev.slice(-199), { ...t, time: nowTime() }]);
      },
      Math.max(intervalMs * 2, 2000),
    );
    return () => clearInterval(timer);
  }, [live, intervalMs]);

  const rows = logs
    .filter((l) => level === 'all' || l.level === level)
    .filter((l) => `${l.src} ${l.msg}`.toLowerCase().includes(query.toLowerCase()))
    .slice()
    .reverse();

  return (
    <Card
      title={`${rows.length} entries`}
      icon={<ScrollText className="h-3.5 w-3.5" />}
      right={
        <div className="flex items-center gap-2">
          <Chips
            value={level}
            onChange={setLevel}
            options={[
              { id: 'all', label: 'All' },
              { id: 'info', label: 'Info' },
              { id: 'warn', label: 'Warn' },
              { id: 'error', label: 'Error' },
              { id: 'debug', label: 'Debug' },
            ]}
          />
          <SearchBox value={query} onChange={setQuery} placeholder="Search logs" />
        </div>
      }
    >
      <div className="flex flex-col font-mono text-[11.5px]">
        <AnimatePresence initial={false}>
          {rows.slice(0, 80).map((l, i) => (
            <motion.div
              key={`${l.time}-${l.src}-${l.msg}-${rows.length - i}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-start gap-3 border-b border-border py-1.5 last:border-b-0"
            >
              <span className="shrink-0 text-text-secondary">{l.time}</span>
              <span
                className="w-12 shrink-0 font-semibold uppercase"
                style={{ color: LEVEL_COLOR[l.level] }}
              >
                {l.level}
              </span>
              <span className="w-36 shrink-0 truncate text-text-secondary">{l.src}</span>
              <span className="min-w-0 flex-1 break-words text-text-primary">{l.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// ─── Tab: Alerts ────────────────────────────────────────────────────────
function AlertsTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALERT_RULES.map((r) => [r.id, true])),
  );
  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Active alerts"
        icon={<Bell className="h-3.5 w-3.5" />}
        right={<Pill color={C.amber}>{ACTIVE_ALERTS.length} open</Pill>}
      >
        <div className="flex flex-col gap-2">
          {ACTIVE_ALERTS.map((a) => (
            <div
              key={a.title}
              className="flex items-center gap-3 rounded-lg bg-text-secondary/5 px-3 py-2.5"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: SEV_COLOR[a.sev] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-text-primary">{a.title}</p>
                <p className="truncate text-[11px] text-text-secondary">{a.detail}</p>
              </div>
              <span className="text-[11px] text-text-secondary">{a.time}</span>
              <Pill color={SEV_COLOR[a.sev]}>{a.sev}</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Alert rules" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
        <div className="flex flex-col">
          {ALERT_RULES.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-text-primary">{r.name}</p>
                <p className="font-mono text-[11px] text-text-secondary">{r.cond}</p>
              </div>
              <Pill color={SEV_COLOR[r.sev]}>{r.sev}</Pill>
              <button
                onClick={() => setEnabled((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                aria-pressed={enabled[r.id]}
                className={cn(
                  'relative h-[18px] w-8 shrink-0 rounded-md transition-colors',
                  enabled[r.id] ? 'bg-primary/40' : 'bg-text-secondary/20',
                )}
              >
                <span
                  className={cn(
                    'absolute top-[2px] h-3.5 w-3.5 rounded-[4px] bg-white shadow transition-all',
                    enabled[r.id] ? 'left-[16px]' : 'left-[2px]',
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Security ──────────────────────────────────────────────────────
function SecurityTab() {
  const okCount = SECURITY_CHECKS.filter((c) => c.status === 'ok').length;
  const score = Math.round((okCount / SECURITY_CHECKS.length) * 100);
  const color = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  const statusColor = { ok: C.green, warn: C.amber, bad: C.red } as const;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Security score" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-4">
            <Ring value={score} size={112} color={color}>
              <span className="font-mono text-3xl font-bold leading-none text-text-primary">
                {score}
              </span>
              <span className="mt-0.5 text-[10px] text-text-secondary">of 100</span>
            </Ring>
            <div className="text-[12px] text-text-secondary">
              <p>
                <span className="font-mono text-text-primary">{okCount}</span> of{' '}
                {SECURITY_CHECKS.length} checks passed
              </p>
              <p className="mt-1">Last scan 2 minutes ago</p>
            </div>
          </div>
        </Card>
        <Card title="Configuration checks" className="lg:col-span-2">
          <div className="flex flex-col">
            {SECURITY_CHECKS.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
              >
                {c.status === 'ok' ? (
                  <CheckCircle
                    className="h-4 w-4 shrink-0"
                    style={{ color: statusColor[c.status] }}
                  />
                ) : (
                  <AlertTriangle
                    className="h-4 w-4 shrink-0"
                    style={{ color: statusColor[c.status] }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-text-primary">{c.name}</p>
                  <p className="truncate text-[11px] text-text-secondary">{c.detail}</p>
                </div>
                <Pill color={statusColor[c.status]}>
                  {c.status === 'ok' ? 'Passed' : c.status === 'warn' ? 'Review' : 'Failed'}
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Recent logins" icon={<Lock className="h-3.5 w-3.5" />}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>User</Th>
              <Th>Source</Th>
              <Th>Time</Th>
              <Th className="w-28">Result</Th>
            </tr>
          </thead>
          <tbody>
            {LOGIN_EVENTS.map((e, i) => (
              <tr
                key={i}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
              >
                <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{e.user}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{e.from}</td>
                <td className="px-3 py-2 text-[12px] text-text-secondary">{e.time}</td>
                <td className="px-3 py-2">
                  <Pill color={e.ok ? C.green : C.red}>{e.ok ? 'Success' : 'Failed'}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function SystemStatsModal({ isOpen, onClose }: SystemStatsModalProps) {
  // ── State ──
  const [tab, setTab] = useState<TabId>('overview');
  const [live, setLive] = useState(true);
  const [intervalMs, setIntervalMs] = useState(1000);
  const m = useMetrics(isOpen && live, intervalMs);
  const meta = TAB_META[tab];

  // ── Render helpers ──
  const renderTab = () => {
    switch (tab) {
      case 'overview':
        return <Overview m={m} />;
      case 'cpu':
        return <CpuTab m={m} />;
      case 'memory':
        return <MemoryTab m={m} />;
      case 'gpu':
        return <GpuTab m={m} />;
      case 'storage':
        return <StorageTab m={m} />;
      case 'network':
        return <NetworkTab m={m} />;
      case 'processes':
        return <ProcessesTab />;
      case 'services':
        return <ServicesTab />;
      case 'containers':
        return <ContainersTab />;
      case 'ports':
        return <PortsTab />;
      case 'sensors':
        return <SensorsTab m={m} />;
      case 'logs':
        return <LogsTab live={live && isOpen} intervalMs={intervalMs} />;
      case 'alerts':
        return <AlertsTab />;
      case 'security':
        return <SecurityTab />;
    }
  };

  // ── Render ──
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="h-[88vh] max-h-[88vh] w-[94vw] max-w-[1360px] overflow-hidden"
    >
      <div className="flex h-full min-h-0">
        {/* Sidebar */}
        <aside className="flex w-[236px] shrink-0 flex-col border-r border-border bg-panel-background">
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Server className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-text-primary">phantoma-dev</p>
              <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.green }} />
                Linux · x64
              </p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
            {NAV.map((g) => (
              <div key={g.group} className="mb-4">
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
                  {g.group}
                </p>
                <div className="flex flex-col gap-0.5">
                  {g.items.map((item) => {
                    const active = tab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={cn(
                          'relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[12.5px] transition-colors',
                          active
                            ? 'text-text-primary'
                            : 'text-text-secondary hover:bg-text-secondary/10 hover:text-text-primary',
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sys-nav-active"
                            className="absolute inset-0 rounded-md bg-primary/10"
                            transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
                          />
                        )}
                        <Icon
                          className={cn('relative h-4 w-4 shrink-0', active && 'text-primary')}
                        />
                        <span className="relative flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className="relative rounded px-1.5 text-[10px] font-semibold"
                            style={{
                              color: item.badgeColor,
                              backgroundColor: `${item.badgeColor}1A`,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              Uptime
              <span className="ml-auto font-mono text-text-primary">3d 12h 45m</span>
            </div>
            <p className="mt-2 text-[10.5px] text-text-secondary/70">
              Mock data · chưa kết nối API
            </p>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-text-primary">{meta.title}</h2>
              <p className="truncate text-[12px] text-text-secondary">{meta.desc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium"
                style={{
                  color: live ? C.green : '#8891A4',
                  backgroundColor: live ? `${C.green}1A` : 'rgba(136,145,164,0.12)',
                }}
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full bg-current', live && 'animate-pulse')}
                />
                {live ? 'Live' : 'Paused'}
              </span>
              <Chips
                value={String(intervalMs)}
                onChange={(v) => setIntervalMs(Number(v))}
                options={[
                  { id: '1000', label: '1s' },
                  { id: '2000', label: '2s' },
                  { id: '5000', label: '5s' },
                ]}
              />
              <button
                onClick={() => setLive((v) => !v)}
                aria-label={live ? 'Pause' : 'Resume'}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/20 hover:text-text-primary"
              >
                {live ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/20 hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default SystemStatsModal;
