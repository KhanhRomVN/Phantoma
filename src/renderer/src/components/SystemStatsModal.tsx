/**
 * ------------------------------------------------------------------
 * SystemStatsModal
 * ------------------------------------------------------------------
 * Modal giám sát toàn bộ hệ thống với sidebar nhiều tab: Overview,
 * CPU, Memory, GPU, Storage, Network, Processes, Services,
 * Containers, Ports, Sensors, Logs, Alerts, Security.
 * Dữ liệu lấy từ API `/api/v1/system/*` của server (REST + SSE
 * qua `services/system-monitor.service.ts`).
 *
 * Main features:
 * - Sidebar điều hướng theo nhóm, indicator trượt mượt (layoutId)
 * - Live metrics qua SSE, tạm dừng/tiếp tục, đổi tần suất làm mới
 * - Biểu đồ area SVG, ring gauge, heatmap core, stacked bar
 * - Bảng process (search/sort), service/alert toggle, log stream
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

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

// ── Services ──
import { openMetricsStream, systemMonitorApi } from '@renderer/services/system-monitor.service';
import type { LogEntry, MetricsSample } from '@renderer/types/system-monitor';

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
  latest: MetricsSample | null;
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
      { id: 'alerts', label: 'Alerts', icon: Bell, badgeColor: C.amber },
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
const MB = 1_000_000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const last = (a: number[]) => a[a.length - 1];
const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

const loadColor = (v: number, base: string) => (v >= 85 ? C.red : v >= 65 ? C.amber : base);
const tempColor = (v: number, max: number) =>
  v >= max * 0.9 ? C.red : v >= max * 0.75 ? C.amber : C.green;
const pad2 = (n: number) => String(n).padStart(2, '0');
const clockTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const fmtBytes = (n: number | null | undefined): string => {
  if (n == null) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${i === 0 || v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
};
const fmtGB = (n: number | null | undefined) => (n == null ? 'N/A' : (n / 1024 ** 3).toFixed(1));
const fmtNum = (v: number | null | undefined, digits = 0, unit = '') =>
  v == null ? 'N/A' : `${v.toFixed(digits)}${unit}`;
const fmtDuration = (sec: number | null | undefined): string => {
  if (sec == null) return '-';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const mi = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  parts.push(`${mi}m`);
  return parts.join(' ');
};
const fmtAgo = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const series = (
  samples: MetricsSample[],
  pick: (s: MetricsSample) => number | null | undefined,
): number[] => {
  const values = samples.slice(-HISTORY).map((s) => pick(s) ?? 0);
  if (values.length === 0) return Array<number>(HISTORY).fill(0);
  return [...Array<number>(HISTORY - values.length).fill(values[0]), ...values];
};

const toMetrics = (samples: MetricsSample[]): Metrics => ({
  cpu: series(samples, (s) => s.cpu.load),
  mem: series(samples, (s) => s.memory.usedPct),
  gpu: series(samples, (s) => s.gpu?.load),
  up: series(samples, (s) => (s.network.upBps ?? 0) / MB),
  down: series(samples, (s) => (s.network.downBps ?? 0) / MB),
  read: series(samples, (s) => (s.disk.readBps ?? 0) / MB),
  write: series(samples, (s) => (s.disk.writeBps ?? 0) / MB),
  temp: series(samples, (s) => s.cpu.tempC),
  power: series(samples, (s) => s.powerW),
  latency: series(samples, (s) => s.network.latencyMs),
  cores: samples.length ? samples[samples.length - 1].cpu.cores : [],
  latest: samples.length ? samples[samples.length - 1] : null,
});

// ─── Hooks ──────────────────────────────────────────────────────────────
type StreamStatus = 'connecting' | 'live' | 'error';

function useMetrics(active: boolean, intervalMs: number): { m: Metrics; status: StreamStatus } {
  const [samples, setSamples] = useState<MetricsSample[]>([]);
  const [status, setStatus] = useState<StreamStatus>('connecting');

  useEffect(() => {
    if (!active) return;
    setStatus('connecting');
    return openMetricsStream(intervalMs, {
      onOpen: () => setStatus('live'),
      onError: () => setStatus('error'),
      onHistory: (history) => setSamples(history.slice(-HISTORY)),
      onSample: (sample) => setSamples((prev) => [...prev.slice(-(HISTORY - 1)), sample]),
    });
  }, [active, intervalMs]);

  const m = useMemo(() => toMetrics(samples), [samples]);
  return { m, status };
}

function useApi<T>(
  fetcher: () => Promise<T>,
  opts: { pollMs?: number; key?: string; enabled?: boolean } = {},
) {
  const { pollMs = 0, key = '', enabled = true } = opts;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          }));
        }
      }
    };
    run();
    const timer = pollMs > 0 ? setInterval(run, pollMs) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled, pollMs, key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function Placeholder({
  loading,
  error,
  text,
}: {
  loading: boolean;
  error: string | null;
  text?: string;
}) {
  return (
    <Card>
      <p className="py-6 text-center text-[12px] text-text-secondary">
        {error
          ? `Không tải được dữ liệu: ${error}`
          : loading
            ? 'Đang tải...'
            : (text ?? 'Không có dữ liệu')}
      </p>
    </Card>
  );
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
function Overview({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const info = useApi(() => systemMonitorApi.overview(), { pollMs });
  const procs = useApi(() => systemMonitorApi.processes({ sort: 'cpu', limit: 5 }), { pollMs });
  const alerts = useApi(() => systemMonitorApi.alerts(), { pollMs });
  const cpu = last(m.cpu);
  const mem = last(m.mem);
  const gpu = last(m.gpu);
  const temp = last(m.temp);
  const memory = m.latest?.memory;
  const gpuSample = m.latest?.gpu ?? null;
  const hasTemp = m.latest?.cpu.tempC != null;
  const active = alerts.data?.active ?? [];
  const stability = clamp(
    100 -
      active.reduce((s, a) => s + (a.severity === 'critical' ? 20 : a.severity === 'warning' ? 8 : 2), 0),
    0,
    100,
  );
  const thermals = hasTemp ? clamp(100 - (temp - 30), 0, 100) : 100;
  const score = clamp(
    Math.round(100 - (cpu * 0.25 + mem * 0.25 + (hasTemp ? (temp - 30) * 0.3 : 0))),
    0,
    100,
  );
  const scoreColor = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  const topProcs = procs.data?.items ?? [];
  const sys = info.data;
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
          foot={hasTemp ? `${temp.toFixed(0)}°C` : undefined}
        />
        <Stat
          label="Memory"
          value={mem.toFixed(0)}
          unit="%"
          color={C.violet}
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          series={m.mem}
          max={100}
          foot={memory ? `${fmtGB(memory.usedBytes)} / ${fmtGB(memory.totalBytes)} GB` : undefined}
        />
        <Stat
          label="Graphics"
          value={gpuSample ? gpu.toFixed(0) : 'N/A'}
          unit={gpuSample ? '%' : undefined}
          color={C.amber}
          icon={<Monitor className="h-3.5 w-3.5" />}
          series={m.gpu}
          max={100}
          foot={
            gpuSample
              ? `${fmtGB(gpuSample.vramUsedBytes)} / ${fmtGB(gpuSample.vramTotalBytes)} GB VRAM`
              : 'No GPU data'
          }
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
                { k: 'Thermals', v: thermals },
                { k: 'Stability', v: stability },
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
            {topProcs.length === 0 && (
              <p className="text-[11.5px] text-text-secondary">
                {procs.error ?? (procs.loading ? 'Đang tải...' : 'Không có dữ liệu')}
              </p>
            )}
            {topProcs.map((p) => (
              <div key={p.pid}>
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="truncate text-text-primary">{p.name}</span>
                  <span className="font-mono text-text-secondary">{p.cpuPct.toFixed(1)}%</span>
                </div>
                <Bar value={p.cpuPct * 4} color={C.cyan} h={3} />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Active alerts"
          icon={<Bell className="h-3.5 w-3.5" />}
          right={<Pill color={active.length ? C.amber : C.green}>{active.length} open</Pill>}
        >
          <div className="flex flex-col gap-2">
            {active.length === 0 && (
              <p className="text-[11.5px] text-text-secondary">
                {alerts.error ?? (alerts.loading ? 'Đang tải...' : 'Không có cảnh báo nào')}
              </p>
            )}
            {active.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 rounded-lg bg-text-secondary/5 px-2.5 py-2"
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: SEV_COLOR[a.severity] }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-text-primary">{a.title}</p>
                  <p className="text-[10.5px] text-text-secondary">{fmtAgo(a.raisedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="System info" icon={<Server className="h-3.5 w-3.5" />}>
          {sys ? (
            <>
              <KV k="Hostname" v={sys.hostname} />
              <KV k="OS" v={sys.os} />
              <KV k="Kernel" v={sys.kernel} />
              <KV k="Architecture" v={sys.arch} />
              <KV k="Uptime" v={fmtDuration(sys.uptimeSec)} />
              <KV
                k="Load average"
                v={sys.loadAverage ? sys.loadAverage.map((v) => v.toFixed(2)).join('  ') : 'N/A'}
              />
            </>
          ) : (
            <p className="text-[11.5px] text-text-secondary">
              {info.error ?? 'Đang tải...'}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: CPU ───────────────────────────────────────────────────────────
function CpuTab({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const details = useApi(() => systemMonitorApi.cpu(), { pollMs });
  const d = details.data;
  const cpu = last(m.cpu);
  const freq = m.latest?.cpu.freqGHz ?? null;
  const tempC = m.latest?.cpu.tempC ?? null;
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
          value={fmtNum(freq, 2)}
          unit={freq != null ? 'GHz' : undefined}
          color={C.violet}
          icon={<Zap className="h-3.5 w-3.5" />}
          foot={d?.maxGHz != null ? `Boost ${d.maxGHz.toFixed(1)} GHz` : undefined}
        />
        <Stat
          label="Temperature"
          value={fmtNum(tempC, 0)}
          unit={tempC != null ? '°C' : undefined}
          color={tempColor(last(m.temp), 95)}
          icon={<Thermometer className="h-3.5 w-3.5" />}
          series={m.temp}
          max={100}
        />
        <Stat
          label="Load average"
          value={d?.loadAverage ? d.loadAverage[0].toFixed(2) : 'N/A'}
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
          {d ? (
            <>
              <KV k="Model" v={d.brand} />
              <KV k="Cores / Threads" v={`${d.physicalCores} / ${d.logicalCores}`} />
              <KV k="L1 cache" v={fmtBytes(d.cache.l1dBytes + d.cache.l1iBytes)} />
              <KV k="L2 cache" v={fmtBytes(d.cache.l2Bytes)} />
              <KV k="L3 cache" v={fmtBytes(d.cache.l3Bytes)} />
              <KV k="Governor" v={d.governor ?? 'N/A'} />
              <KV k="Average" v={`${avg(m.cpu).toFixed(1)} %`} />
            </>
          ) : (
            <p className="text-[11.5px] text-text-secondary">{details.error ?? 'Đang tải...'}</p>
          )}
        </Card>
      </div>

      <Card
        title="Per-core activity"
        icon={<Cpu className="h-3.5 w-3.5" />}
        right={
          <span className="text-[10.5px] text-text-secondary">{m.cores.length} logical cores</span>
        }
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
function MemoryTab({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const details = useApi(() => systemMonitorApi.memory(), { pollMs });
  const consumers = useApi(() => systemMonitorApi.processes({ sort: 'mem', limit: 6 }), { pollMs });
  const d = details.data;
  if (!d) return <Placeholder loading={details.loading} error={details.error} />;
  const total = d.totalBytes;
  const pct = (bytes: number) => (total > 0 ? (bytes / total) * 100 : 0);
  const segments = [
    { label: 'Applications', bytes: d.composition.applicationsBytes, color: C.violet },
    { label: 'Cache', bytes: d.composition.cacheBytes, color: C.cyan },
    { label: 'Buffers', bytes: d.composition.buffersBytes, color: C.blue },
    { label: 'Other', bytes: d.composition.otherBytes, color: C.pink },
  ];
  const items = consumers.data?.items ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="In use"
          value={fmtGB(m.latest?.memory.usedBytes ?? d.usedBytes)}
          unit="GB"
          color={C.violet}
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          series={m.mem}
          max={100}
        />
        <Stat
          label="Available"
          value={fmtGB(d.availableBytes)}
          unit="GB"
          color={C.green}
          icon={<CheckCircle className="h-3.5 w-3.5" />}
          foot={`of ${fmtGB(total)} GB`}
        />
        <Stat
          label="Cached"
          value={fmtGB(d.cachedBytes)}
          unit="GB"
          color={C.cyan}
          icon={<HardDrive className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Swap"
          value={fmtGB(d.swap.usedBytes)}
          unit="GB"
          color={C.amber}
          icon={<Activity className="h-3.5 w-3.5" />}
          foot={`of ${fmtGB(d.swap.totalBytes)} GB`}
        />
      </div>

      <Card title="Memory composition" icon={<MemoryStick className="h-3.5 w-3.5" />}>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-text-secondary/10">
          {segments.map((s) => (
            <div
              key={s.label}
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${pct(s.bytes)}%`, backgroundColor: s.color }}
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
              <span className="font-mono text-text-primary">{fmtBytes(s.bytes)}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[11.5px] text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-text-secondary/30" />
            Free
            <span className="font-mono text-text-primary">{fmtBytes(d.composition.freeBytes)}</span>
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Usage history" className="lg:col-span-2">
          <AreaChart series={[{ data: m.mem, color: C.violet }]} height={170} max={100} />
        </Card>
        <Card title="Top consumers">
          <div className="flex flex-col gap-2.5">
            {items.length === 0 && (
              <p className="text-[11.5px] text-text-secondary">
                {consumers.error ?? (consumers.loading ? 'Đang tải...' : 'Không có dữ liệu')}
              </p>
            )}
            {items.map((p) => (
              <div key={p.pid}>
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="truncate text-text-primary">{p.name}</span>
                  <span className="font-mono text-text-secondary">{fmtBytes(p.memBytes)}</span>
                </div>
                <Bar value={p.memPct} color={C.violet} h={3} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: GPU ───────────────────────────────────────────────────────────
function GpuTab({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const details = useApi(() => systemMonitorApi.gpu(), { pollMs });
  const d = details.data;
  const g = m.latest?.gpu ?? null;
  if (!d) return <Placeholder loading={details.loading} error={details.error} />;
  const dev = d.devices[0];
  if (!dev && !g) {
    return <Placeholder loading={false} error={null} text="Không phát hiện GPU trên máy này" />;
  }
  const load = g?.load ?? dev?.utilizationGpu ?? null;
  const vramUsed = g?.vramUsedBytes ?? dev?.vramUsedBytes ?? null;
  const vramTotal = g?.vramTotalBytes ?? dev?.vramTotalBytes ?? null;
  const temp = g?.tempC ?? dev?.temperatureC ?? null;
  const power = g?.powerW ?? dev?.powerDrawW ?? null;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="GPU load"
          value={fmtNum(load, 0)}
          unit={load != null ? '%' : undefined}
          color={C.amber}
          icon={<Monitor className="h-3.5 w-3.5" />}
          series={m.gpu}
          max={100}
        />
        <Stat
          label="VRAM"
          value={fmtGB(vramUsed)}
          unit="GB"
          color={C.violet}
          icon={<MemoryStick className="h-3.5 w-3.5" />}
          foot={`of ${fmtGB(vramTotal)} GB`}
        />
        <Stat
          label="Temperature"
          value={fmtNum(temp, 0)}
          unit={temp != null ? '°C' : undefined}
          color={temp != null ? tempColor(temp, 90) : C.green}
          icon={<Thermometer className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Board power"
          value={fmtNum(power, 0)}
          unit={power != null ? 'W' : undefined}
          color={C.cyan}
          icon={<Zap className="h-3.5 w-3.5" />}
          foot={dev?.powerLimitW != null ? `Limit ${dev.powerLimitW.toFixed(0)} W` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="GPU utilization" className="lg:col-span-2">
          <AreaChart series={[{ data: m.gpu, color: C.amber }]} height={170} max={100} />
        </Card>
        <Card title="Details">
          {dev ? (
            <>
              <KV k="Model" v={`${dev.vendor} ${dev.model}`} />
              <KV k="Driver" v={dev.driverVersion ?? 'N/A'} />
              <KV k="Bus" v={dev.bus ?? 'N/A'} />
              <KV k="Core clock" v={fmtNum(dev.clockCoreMHz, 0, ' MHz')} />
              <KV k="Memory clock" v={fmtNum(dev.clockMemoryMHz, 0, ' MHz')} />
              <KV k="Fan speed" v={fmtNum(dev.fanPercent, 0, ' %')} />
              <KV k="Memory util" v={fmtNum(dev.utilizationMemory, 0, ' %')} />
            </>
          ) : (
            <p className="text-[11.5px] text-text-secondary">Không có thông tin thiết bị</p>
          )}
        </Card>
      </div>

      <Card title="GPU processes" icon={<ListTree className="h-3.5 w-3.5" />}>
        {d.processes.length === 0 ? (
          <p className="py-2 text-[11.5px] text-text-secondary">
            Không có tiến trình GPU (chỉ đọc được với NVIDIA)
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <Th>Process</Th>
                <Th className="w-32">VRAM</Th>
                <Th className="w-48">Share</Th>
              </tr>
            </thead>
            <tbody>
              {d.processes.map((p) => (
                <tr key={p.pid} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 text-[12px] text-text-primary">{p.name}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                    {fmtBytes(p.vramBytes)}
                  </td>
                  <td className="px-3 py-2">
                    <Bar
                      value={vramTotal && p.vramBytes ? (p.vramBytes / vramTotal) * 100 : 0}
                      color={C.amber}
                      h={3}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: Storage ───────────────────────────────────────────────────────
function StorageTab({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const details = useApi(() => systemMonitorApi.storage(), { pollMs });
  const d = details.data;
  if (!d) return <Placeholder loading={details.loading} error={details.error} />;
  const smartColor = { healthy: C.green, warning: C.amber, unknown: '#8891A4' } as const;
  const iops = m.latest?.disk.iops ?? d.io.iops;
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
          value={fmtNum(iops, 0)}
          color={C.violet}
          icon={<Activity className="h-3.5 w-3.5" />}
          foot="read + write"
        />
        <Stat
          label="Disks"
          value={String(d.disks.length)}
          color={C.amber}
          icon={<HardDrive className="h-3.5 w-3.5" />}
          foot={`${d.volumes.length} volumes`}
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
          {d.volumes.map((v) => (
            <div key={`${v.device}-${v.mount}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-[12.5px] text-text-primary">{v.mount}</span>
                  <span className="truncate text-[11px] text-text-secondary">
                    {v.device} · {v.fsType}
                    {v.physicalType ? ` · ${v.physicalType}` : ''}
                  </span>
                </div>
                <span className="font-mono text-[11.5px] text-text-secondary">
                  {fmtBytes(v.usedBytes)} / {fmtBytes(v.totalBytes)}
                </span>
              </div>
              <Bar value={v.usePct} color={loadColor(v.usePct, C.cyan)} h={6} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Physical disks" icon={<HardDrive className="h-3.5 w-3.5" />}>
        {d.disks.length === 0 ? (
          <p className="py-2 text-[11.5px] text-text-secondary">Không đọc được danh sách ổ đĩa</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <Th>Device</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Size</Th>
                <Th>Temp</Th>
                <Th className="w-28">SMART</Th>
              </tr>
            </thead>
            <tbody>
              {d.disks.map((k) => (
                <tr key={k.device} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{k.device}</td>
                  <td className="px-3 py-2 text-[12px] text-text-secondary">
                    {`${k.vendor} ${k.name}`.trim()}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-text-secondary">
                    {k.type} · {k.interfaceType}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                    {fmtBytes(k.sizeBytes)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                    {fmtNum(k.temperatureC, 0, '°C')}
                  </td>
                  <td className="px-3 py-2">
                    <Pill color={smartColor[k.smart]}>{k.smart}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: Network ───────────────────────────────────────────────────────
function NetworkTab({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const details = useApi(() => systemMonitorApi.network(), { pollMs });
  const d = details.data;
  if (!d) return <Placeholder loading={details.loading} error={details.error} />;
  const external = d.interfaces.filter((i) => i.kind !== 'loopback');
  const rxTotal = external.reduce((s, i) => s + i.rxBytes, 0);
  const txTotal = external.reduce((s, i) => s + i.txBytes, 0);
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
          foot={`Total ${fmtBytes(rxTotal)}`}
        />
        <Stat
          label="Upload"
          value={last(m.up).toFixed(1)}
          unit="MB/s"
          color={C.cyan}
          icon={<ArrowUp className="h-3.5 w-3.5" />}
          series={m.up}
          foot={`Total ${fmtBytes(txTotal)}`}
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
          value={String(d.connections.established)}
          color={C.amber}
          icon={<Network className="h-3.5 w-3.5" />}
          foot={`${d.connections.listening} listening`}
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
          <KV k="Gateway" v={d.gateway ?? 'N/A'} />
          <KV k="DNS" v={d.dnsServers.length ? d.dnsServers.join(' / ') : 'N/A'} />
          <KV k="Public IP" v={d.publicIp ?? 'N/A'} />
          <KV k="Packet loss" v={fmtNum(d.quality.packetLossPct, 1, ' %')} />
          <KV k="Jitter" v={fmtNum(d.quality.jitterMs, 1, ' ms')} />
          <KV k="Avg latency" v={fmtNum(d.quality.avgLatencyMs ?? avg(m.latency), 1, ' ms')} />
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
            {d.interfaces.map((i) => (
              <tr
                key={i.name}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
              >
                <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{i.name}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                  {i.ip4 ?? i.ip6 ?? '-'}
                </td>
                <td className="px-3 py-2">
                  <Pill color={i.state === 'up' ? C.green : '#8891A4'}>{i.state}</Pill>
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                  {fmtBytes(i.rxBytes)}
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                  {fmtBytes(i.txBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
// ─── Tab: Processes ─────────────────────────────────────────────────────
function ProcessesTab({ pollMs }: { pollMs: number }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'cpu' | 'mem' | 'pid'>('cpu');
  const debounced = useDebounced(query, 300);
  const { data, error, loading } = useApi(
    () => systemMonitorApi.processes({ sort, query: debounced, limit: 100 }),
    { pollMs, key: `${sort}|${debounced}` },
  );
  if (!data) return <Placeholder loading={loading} error={error} />;
  return (
    <Card
      title={`${data.items.length} / ${data.total} processes`}
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
          {data.items.map((p) => (
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
                    {p.cpuPct.toFixed(1)}
                  </span>
                  <Bar value={p.cpuPct * 4} color={loadColor(p.cpuPct * 4, C.cyan)} h={3} />
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                {fmtBytes(p.memBytes)}
              </td>
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">
                {p.threads ?? '-'}
              </td>
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
function ServicesTab({ pollMs }: { pollMs: number }) {
  const { data, error, loading, reload } = useApi(() => systemMonitorApi.services(), { pollMs });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggle = async (name: string, status: SvcStatus) => {
    setBusy(name);
    setActionError(null);
    try {
      await systemMonitorApi.controlService(name, status === 'running' ? 'stop' : 'start');
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <Placeholder loading={loading} error={error} />;
  if (!data.supported) {
    return (
      <Placeholder
        loading={false}
        error={null}
        text="Máy này không có service manager được hỗ trợ"
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Running"
          value={String(data.counts.running)}
          color={C.green}
          icon={<CheckCircle className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Stopped"
          value={String(data.counts.stopped)}
          color="#8891A4"
          icon={<Pause className="h-3.5 w-3.5" />}
        />
        <Stat
          label="Failed"
          value={String(data.counts.failed)}
          color={C.red}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
      </div>
      <Card
        title="Managed services"
        icon={<Activity className="h-3.5 w-3.5" />}
        right={actionError ? <Pill color={C.red}>{actionError}</Pill> : undefined}
      >
        <div className="flex flex-col">
          {data.items.map((s) => (
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
                <p className="truncate text-[11px] text-text-secondary">{s.description}</p>
              </div>
              <span className="w-20 text-right font-mono text-[11.5px] text-text-secondary">
                {fmtDuration(s.uptimeSec)}
              </span>
              <span className="w-24 text-right text-[11px] text-text-secondary">
                {s.restarts ?? '-'} restarts
              </span>
              <Pill color={SVC_COLOR[s.status]}>{s.status}</Pill>
              <button
                onClick={() => toggle(s.name, s.status)}
                disabled={busy === s.name}
                className="flex h-7 w-16 items-center justify-center gap-1 rounded-md bg-primary/10 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
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
function ContainersTab({ pollMs }: { pollMs: number }) {
  const { data, error, loading } = useApi(() => systemMonitorApi.containers(), { pollMs });
  if (!data) return <Placeholder loading={loading} error={error} />;
  if (!data.available) {
    return <Placeholder loading={false} error={null} text="Docker không khả dụng trên máy này" />;
  }
  if (data.items.length === 0) {
    return <Placeholder loading={false} error={null} text="Không có container nào" />;
  }
  const statusColor = (s: string) =>
    s === 'running' ? C.green : s === 'paused' ? C.amber : '#8891A4';
  const maxMem = Math.max(1, ...data.items.map((c) => c.memBytes));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.items.map((c) => (
        <Card key={c.id}>
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
                <span className="font-mono text-text-primary">{c.cpuPct.toFixed(1)}%</span>
              </div>
              <Bar value={c.cpuPct * 6} color={C.cyan} h={3} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-text-secondary">Memory</span>
                <span className="font-mono text-text-primary">{fmtBytes(c.memBytes)}</span>
              </div>
              <Bar value={(c.memBytes / maxMem) * 100} color={C.violet} h={3} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Ports</span>
            <span className="font-mono text-text-primary">
              {c.ports.length ? c.ports.join(', ') : '-'}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Ports ─────────────────────────────────────────────────────────
function PortsTab({ pollMs }: { pollMs: number }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const { data, error, loading } = useApi(() => systemMonitorApi.ports(debounced), {
    pollMs,
    key: debounced,
  });
  if (!data) return <Placeholder loading={loading} error={error} />;
  return (
    <Card
      title={`${data.length} listening sockets`}
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
          {data.map((p) => (
            <tr
              key={`${p.protocol}-${p.port}-${p.address}`}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
            >
              <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{p.port}</td>
              <td className="px-3 py-2 text-[12px] uppercase text-text-secondary">{p.protocol}</td>
              <td className="px-3 py-2 text-[12px] text-text-primary">{p.process ?? '-'}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{p.address}</td>
              <td className="px-3 py-2">
                <Pill color={C.green}>{p.state}</Pill>
              </td>
              <td className="px-3 py-2">
                <Pill color={p.exposure === 'public' ? C.amber : C.cyan}>
                  {p.exposure === 'public' ? 'Public' : 'Local'}
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
function SensorsTab({ m, pollMs }: { m: Metrics; pollMs: number }) {
  const { data, error, loading } = useApi(() => systemMonitorApi.sensors(), { pollMs });
  if (!data) return <Placeholder loading={loading} error={error} />;
  const power = m.latest?.powerW ?? data.powerW;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Temperatures" icon={<Thermometer className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-3">
            {data.temperatures.length === 0 && (
              <p className="text-[11.5px] text-text-secondary">Không đọc được cảm biến nhiệt độ</p>
            )}
            {data.temperatures.map((s) => {
              const max = s.maxC ?? 100;
              return (
                <div key={s.label}>
                  <div className="mb-1 flex justify-between text-[11.5px]">
                    <span className="text-text-secondary">{s.label}</span>
                    <span className="font-mono text-text-primary">{s.valueC.toFixed(0)}°C</span>
                  </div>
                  <Bar value={(s.valueC / max) * 100} color={tempColor(s.valueC, max)} h={5} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Fans" icon={<Fan className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-3">
            {data.fans.length === 0 && (
              <p className="text-[11.5px] text-text-secondary">Không đọc được tốc độ quạt</p>
            )}
            {data.fans.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="text-text-secondary">{f.label}</span>
                  <span className="font-mono text-text-primary">{f.rpm.toFixed(0)} RPM</span>
                </div>
                <Bar value={f.maxRpm ? (f.rpm / f.maxRpm) * 100 : 0} color={C.cyan} h={5} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Power draw" icon={<Zap className="h-3.5 w-3.5" />} className="lg:col-span-2">
          <AreaChart series={[{ data: m.power, color: C.amber }]} height={150} />
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-xl font-semibold text-text-primary">
              {fmtNum(power, 0)}
            </span>
            <span className="text-xs text-text-secondary">
              {power != null ? `W now · avg ${avg(m.power).toFixed(0)} W` : 'Không đọc được công suất'}
            </span>
          </div>
        </Card>
        <Card title="Voltage rails">
          {data.voltages.map((r) => (
            <KV key={r.label} k={r.label} v={`${r.volts.toFixed(2)} V`} />
          ))}
          {data.battery && (
            <KV
              k="Battery"
              v={`${data.battery.percent.toFixed(0)} %${data.battery.charging ? ' (charging)' : ''}`}
            />
          )}
          {data.voltages.length === 0 && !data.battery && (
            <p className="text-[11.5px] text-text-secondary">Không có dữ liệu điện áp</p>
          )}
        </Card>
      </div>
    </div>
  );
}
// ─── Tab: Logs ──────────────────────────────────────────────────────────
const LOG_LIMIT = 200;

function LogsTab({ live, intervalMs }: { live: boolean; intervalMs: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [level, setLevel] = useState<'all' | LogLevel>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const debounced = useDebounced(query, 300);
  const lastTs = useRef(0);

  const filters = useMemo(
    () => ({ level: level === 'all' ? undefined : level, query: debounced || undefined }),
    [level, debounced],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    systemMonitorApi
      .logs({ limit: LOG_LIMIT, ...filters })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.entries);
        setSource(res.source);
        setError(null);
        lastTs.current = res.entries.reduce((mx, e) => Math.max(mx, e.ts), 0);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const timer = setInterval(
      async () => {
        try {
          const res = await systemMonitorApi.logs({
            limit: LOG_LIMIT,
            since: lastTs.current || undefined,
            ...filters,
          });
          if (cancelled || res.entries.length === 0) return;
          lastTs.current = res.entries.reduce((mx, e) => Math.max(mx, e.ts), lastTs.current);
          setLogs((prev) => {
            const seen = new Set(prev.map((e) => e.id));
            const fresh = res.entries.filter((e) => !seen.has(e.id));
            return fresh.length ? [...prev, ...fresh].slice(-LOG_LIMIT) : prev;
          });
        } catch {
          /* poll tiếp ở chu kỳ sau */
        }
      },
      Math.max(intervalMs * 2, 2000),
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live, intervalMs, filters]);

  const rows = useMemo(() => [...logs].sort((a, b) => b.ts - a.ts), [logs]);

  return (
    <Card
      title={`${rows.length} entries${source ? ` · ${source}` : ''}`}
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
      {rows.length === 0 && (
        <p className="py-4 text-center text-[12px] text-text-secondary">
          {error
            ? `Không tải được log: ${error}`
            : loading
              ? 'Đang tải...'
              : source === null
                ? 'Không đọc được nguồn log hệ thống'
                : 'Không có log nào'}
        </p>
      )}
      <div className="flex flex-col font-mono text-[11.5px]">
        <AnimatePresence initial={false}>
          {rows.slice(0, 80).map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-start gap-3 border-b border-border py-1.5 last:border-b-0"
            >
              <span className="shrink-0 text-text-secondary">{clockTime(l.ts)}</span>
              <span
                className="w-12 shrink-0 font-semibold uppercase"
                style={{ color: LEVEL_COLOR[l.level] }}
              >
                {l.level}
              </span>
              <span className="w-36 shrink-0 truncate text-text-secondary">{l.source}</span>
              <span className="min-w-0 flex-1 break-words text-text-primary">{l.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// ─── Tab: Alerts ────────────────────────────────────────────────────────
function AlertsTab({ pollMs }: { pollMs: number }) {
  const { data, error, loading, reload } = useApi(() => systemMonitorApi.alerts(), { pollMs });
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleRule = async (id: string, next: boolean) => {
    setOverrides((prev) => ({ ...prev, [id]: next }));
    setActionError(null);
    try {
      await systemMonitorApi.setAlertRule(id, next);
      reload();
    } catch (e) {
      setOverrides((prev) => ({ ...prev, [id]: !next }));
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!data) return <Placeholder loading={loading} error={error} />;
  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Active alerts"
        icon={<Bell className="h-3.5 w-3.5" />}
        right={<Pill color={data.active.length ? C.amber : C.green}>{data.active.length} open</Pill>}
      >
        <div className="flex flex-col gap-2">
          {data.active.length === 0 && (
            <p className="py-2 text-[11.5px] text-text-secondary">Không có cảnh báo nào</p>
          )}
          {data.active.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg bg-text-secondary/5 px-3 py-2.5"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: SEV_COLOR[a.severity] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-text-primary">{a.title}</p>
                <p className="truncate text-[11px] text-text-secondary">{a.detail}</p>
              </div>
              <span className="text-[11px] text-text-secondary">{fmtAgo(a.raisedAt)}</span>
              <Pill color={SEV_COLOR[a.severity]}>{a.severity}</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Alert rules"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        right={actionError ? <Pill color={C.red}>{actionError}</Pill> : undefined}
      >
        <div className="flex flex-col">
          {data.rules.map((r) => {
            const on = overrides[r.id] ?? r.enabled;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-text-primary">{r.name}</p>
                  <p className="font-mono text-[11px] text-text-secondary">{r.condition}</p>
                </div>
                <Pill color={SEV_COLOR[r.severity]}>{r.severity}</Pill>
                <button
                  onClick={() => toggleRule(r.id, !on)}
                  aria-pressed={on}
                  className={cn(
                    'relative h-[18px] w-8 shrink-0 rounded-md transition-colors',
                    on ? 'bg-primary/40' : 'bg-text-secondary/20',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-[2px] h-3.5 w-3.5 rounded-[4px] bg-white shadow transition-all',
                      on ? 'left-[16px]' : 'left-[2px]',
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Security ──────────────────────────────────────────────────────
function SecurityTab() {
  const forceRef = useRef(false);
  const { data, error, loading, reload } = useApi(() => {
    const refresh = forceRef.current;
    forceRef.current = false;
    return systemMonitorApi.security(refresh);
  });
  if (!data) return <Placeholder loading={loading} error={error} />;
  const okCount = data.checks.filter((c) => c.status === 'ok').length;
  const score = data.checks.length ? Math.round((okCount / data.checks.length) * 100) : 0;
  const color = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  const statusColor = { ok: C.green, warn: C.amber, bad: C.red, unknown: '#8891A4' } as const;
  const statusLabel = { ok: 'Passed', warn: 'Review', bad: 'Failed', unknown: 'Unknown' } as const;
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
                {data.checks.length} checks passed
              </p>
              <p className="mt-1">Last scan {fmtAgo(data.scannedAt)}</p>
              <button
                onClick={() => {
                  forceRef.current = true;
                  reload();
                }}
                className="mt-2 h-7 rounded-md bg-primary/10 px-3 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
              >
                Rescan
              </button>
            </div>
          </div>
        </Card>
        <Card title="Configuration checks" className="lg:col-span-2">
          <div className="flex flex-col">
            {data.checks.map((c) => (
              <div
                key={c.id}
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
                <Pill color={statusColor[c.status]}>{statusLabel[c.status]}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Recent logins" icon={<Lock className="h-3.5 w-3.5" />}>
        {data.logins.length === 0 ? (
          <p className="py-2 text-[11.5px] text-text-secondary">
            {data.loginsNote ?? 'Không có lịch sử đăng nhập'}
          </p>
        ) : (
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
              {data.logins.map((e, i) => (
                <tr
                  key={i}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-text-secondary/5"
                >
                  <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{e.user}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{e.source}</td>
                  <td className="px-3 py-2 text-[12px] text-text-secondary">
                    {e.ts != null ? new Date(e.ts).toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <Pill color={e.success ? C.green : C.red}>{e.success ? 'Success' : 'Failed'}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {data.sessions.length > 0 && (
        <Card title="Active sessions" icon={<Server className="h-3.5 w-3.5" />}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <Th>User</Th>
                <Th>TTY</Th>
                <Th>Source</Th>
                <Th>Since</Th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-mono text-[12px] text-text-primary">{s.user}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{s.tty}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-text-secondary">{s.source}</td>
                  <td className="px-3 py-2 text-[12px] text-text-secondary">{s.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function SystemStatsModal({ isOpen, onClose }: SystemStatsModalProps) {
  // ── State ──
  const [tab, setTab] = useState<TabId>('overview');
  const [live, setLive] = useState(true);
  const [intervalMs, setIntervalMs] = useState(1000);
  const { m, status } = useMetrics(isOpen && live, intervalMs);
  const meta = TAB_META[tab];
  const pollMs = live && isOpen ? Math.max(intervalMs, 2000) : 0;
  const overview = useApi(() => systemMonitorApi.overview(), { pollMs: 30000, enabled: isOpen });
  const alerts = useApi(() => systemMonitorApi.alerts(), { pollMs: 10000, enabled: isOpen });
  const alertCount = alerts.data?.active.length ?? 0;
  const nav = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === 'alerts' ? { ...i, badge: alertCount ? String(alertCount) : undefined } : i,
        ),
      })),
    [alertCount],
  );

  // ── Render helpers ──
  const renderTab = () => {
    switch (tab) {
      case 'overview':
        return <Overview m={m} pollMs={pollMs} />;
      case 'cpu':
        return <CpuTab m={m} pollMs={pollMs} />;
      case 'memory':
        return <MemoryTab m={m} pollMs={pollMs} />;
      case 'gpu':
        return <GpuTab m={m} pollMs={pollMs} />;
      case 'storage':
        return <StorageTab m={m} pollMs={pollMs} />;
      case 'network':
        return <NetworkTab m={m} pollMs={pollMs} />;
      case 'processes':
        return <ProcessesTab pollMs={pollMs} />;
      case 'services':
        return <ServicesTab pollMs={pollMs} />;
      case 'containers':
        return <ContainersTab pollMs={pollMs} />;
      case 'ports':
        return <PortsTab pollMs={pollMs} />;
      case 'sensors':
        return <SensorsTab m={m} pollMs={pollMs} />;
      case 'logs':
        return <LogsTab live={live && isOpen} intervalMs={intervalMs} />;
      case 'alerts':
        return <AlertsTab pollMs={pollMs} />;
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
              <p className="truncate text-[13px] font-semibold text-text-primary">
                {overview.data?.hostname ?? '...'}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: status === 'error' ? C.red : C.green }}
                />
                {overview.data ? `${overview.data.platform} · ${overview.data.arch}` : 'Connecting'}
              </p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
            {nav.map((g) => (
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
              <span className="ml-auto font-mono text-text-primary">
                {overview.data ? fmtDuration(overview.data.uptimeSec) : '-'}
              </span>
            </div>
            {status === 'error' && (
              <p className="mt-2 text-[10.5px]" style={{ color: C.red }}>
                Mất kết nối tới server
              </p>
            )}
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
                {!live
                  ? 'Paused'
                  : status === 'error'
                    ? 'Offline'
                    : status === 'connecting'
                      ? 'Connecting'
                      : 'Live'}
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
