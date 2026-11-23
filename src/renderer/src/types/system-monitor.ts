/**
 * ------------------------------------------------------------------
 * System Monitor Types
 * ------------------------------------------------------------------
 * Mirror của server/src/types/system.type.ts cho API `/api/v1/system/*`.
 * Đơn vị: bytes, bytes/giây (`*Bps`), °C, W, epoch ms, giây (`*Sec`).
 * Giá trị không đọc được trên máy hiện tại là `null`.
 * ------------------------------------------------------------------
 */

export type Severity = 'critical' | 'warning' | 'info';
export type ServiceStatus = 'running' | 'stopped' | 'failed';
export type ServiceAction = 'start' | 'stop' | 'restart';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type CheckStatus = 'ok' | 'warn' | 'bad' | 'unknown';
export type PlatformFamily = 'windows' | 'macos' | 'linux';

// ─── Live samples ───────────────────────────────────────────────────────
export interface CpuSample {
  load: number;
  cores: number[];
  freqGHz: number | null;
  tempC: number | null;
}

export interface MemorySample {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPct: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
}

export interface GpuSample {
  load: number | null;
  vramUsedBytes: number | null;
  vramTotalBytes: number | null;
  tempC: number | null;
  powerW: number | null;
}

export interface NetworkSample {
  downBps: number | null;
  upBps: number | null;
  latencyMs: number | null;
}

export interface DiskSample {
  readBps: number | null;
  writeBps: number | null;
  iops: number | null;
}

export interface MetricsSample {
  ts: number;
  cpu: CpuSample;
  memory: MemorySample;
  gpu: GpuSample | null;
  network: NetworkSample;
  disk: DiskSample;
  powerW: number | null;
}

export interface MetricsHistory {
  intervalMs: number;
  samples: MetricsSample[];
}

// ─── Overview / CPU / Memory ────────────────────────────────────────────
export interface SystemOverview {
  hostname: string;
  platform: PlatformFamily;
  os: string;
  kernel: string;
  arch: string;
  uptimeSec: number;
  bootTime: number;
  loadAverage: [number, number, number] | null;
  cpuModel: string;
  logicalCores: number;
  physicalCores: number;
  totalMemoryBytes: number;
}

export interface CpuDetails {
  manufacturer: string;
  brand: string;
  physicalCores: number;
  logicalCores: number;
  baseGHz: number | null;
  minGHz: number | null;
  maxGHz: number | null;
  governor: string | null;
  virtualization: boolean;
  cache: { l1dBytes: number; l1iBytes: number; l2Bytes: number; l3Bytes: number };
  loadAverage: [number, number, number] | null;
}

export interface MemoryDetails {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  availableBytes: number;
  cachedBytes: number;
  buffersBytes: number;
  swap: { totalBytes: number; usedBytes: number; freeBytes: number };
  composition: {
    applicationsBytes: number;
    cacheBytes: number;
    buffersBytes: number;
    otherBytes: number;
    freeBytes: number;
  };
}

// ─── GPU ────────────────────────────────────────────────────────────────
export interface GpuDevice {
  index: number;
  vendor: string;
  model: string;
  driverVersion: string | null;
  bus: string | null;
  vramTotalBytes: number | null;
  vramUsedBytes: number | null;
  utilizationGpu: number | null;
  utilizationMemory: number | null;
  temperatureC: number | null;
  powerDrawW: number | null;
  powerLimitW: number | null;
  clockCoreMHz: number | null;
  clockMemoryMHz: number | null;
  fanPercent: number | null;
}

export interface GpuProcess {
  pid: number;
  name: string;
  vramBytes: number | null;
}

export interface GpuDetails {
  devices: GpuDevice[];
  processes: GpuProcess[];
}

// ─── Storage ────────────────────────────────────────────────────────────
export interface StorageVolume {
  device: string;
  mount: string;
  fsType: string;
  physicalType: string | null;
  totalBytes: number;
  usedBytes: number;
  usePct: number;
  readOnly: boolean | null;
}

export type SmartState = 'healthy' | 'warning' | 'unknown';

export interface StorageDisk {
  device: string;
  name: string;
  vendor: string;
  type: string;
  interfaceType: string;
  sizeBytes: number;
  smart: SmartState;
  temperatureC: number | null;
}

export interface StorageDetails {
  volumes: StorageVolume[];
  disks: StorageDisk[];
  io: DiskSample;
}

// ─── Network ────────────────────────────────────────────────────────────
export interface NetworkInterfaceInfo {
  name: string;
  ip4: string | null;
  ip6: string | null;
  mac: string | null;
  state: string;
  kind: 'wired' | 'wireless' | 'virtual' | 'loopback' | 'unknown';
  speedMbps: number | null;
  rxBytes: number;
  txBytes: number;
  rxBps: number | null;
  txBps: number | null;
  isDefault: boolean;
}

export interface NetworkQuality {
  target: string | null;
  latencyMs: number | null;
  avgLatencyMs: number | null;
  jitterMs: number | null;
  packetLossPct: number | null;
}

export interface NetworkDetails {
  interfaces: NetworkInterfaceInfo[];
  gateway: string | null;
  dnsServers: string[];
  publicIp: string | null;
  quality: NetworkQuality;
  connections: { total: number; established: number; listening: number };
}

// ─── Sensors ────────────────────────────────────────────────────────────
export interface TemperatureReading {
  label: string;
  valueC: number;
  maxC: number | null;
}

export interface FanReading {
  label: string;
  rpm: number;
  maxRpm: number | null;
}

export interface VoltageReading {
  label: string;
  volts: number;
}

export interface BatteryInfo {
  percent: number;
  charging: boolean;
  acConnected: boolean;
  timeRemainingMin: number | null;
}

export interface SensorDetails {
  temperatures: TemperatureReading[];
  fans: FanReading[];
  voltages: VoltageReading[];
  battery: BatteryInfo | null;
  powerW: number | null;
}

// ─── Runtime ────────────────────────────────────────────────────────────
export type ProcessSort = 'cpu' | 'mem' | 'pid';

export interface ProcessInfo {
  pid: number;
  parentPid: number;
  name: string;
  user: string;
  cpuPct: number;
  memBytes: number;
  memPct: number;
  threads: number | null;
  state: string;
  command: string;
}

export interface ProcessQuery {
  sort?: ProcessSort;
  query?: string;
  limit?: number;
}

export interface ProcessList {
  total: number;
  running: number;
  sleeping: number;
  items: ProcessInfo[];
}

export interface ManagedService {
  name: string;
  description: string;
  status: ServiceStatus;
  uptimeSec: number | null;
  restarts: number | null;
}

export interface ServiceList {
  supported: boolean;
  counts: Record<ServiceStatus, number>;
  items: ManagedService[];
}

export interface ServiceControlResult {
  name: string;
  action: ServiceAction;
  service: ManagedService | null;
}

export type ContainerStatus = 'running' | 'paused' | 'exited' | 'other';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  state: string;
  cpuPct: number;
  memBytes: number;
  ports: number[];
}

export interface ContainerList {
  available: boolean;
  items: ContainerInfo[];
}

export interface ListeningPort {
  port: number;
  protocol: 'tcp' | 'udp';
  address: string;
  pid: number | null;
  process: string | null;
  state: 'LISTEN' | 'OPEN';
  exposure: 'public' | 'local';
}

// ─── Diagnostics ────────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  source: string;
  message: string;
}

export interface LogQuery {
  limit?: number;
  level?: LogLevel;
  query?: string;
  since?: number;
}

export interface LogResult {
  source: string | null;
  entries: LogEntry[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: Severity;
  metric: string;
  threshold: number;
  durationSec: number;
  enabled: boolean;
}

export interface ActiveAlert {
  id: string;
  ruleId: string;
  title: string;
  detail: string;
  severity: Severity;
  raisedAt: number;
}

export interface AlertSnapshot {
  active: ActiveAlert[];
  rules: AlertRule[];
}

export interface SecurityCheck {
  id: string;
  name: string;
  detail: string;
  status: CheckStatus;
}

export interface LoginEvent {
  user: string;
  source: string;
  ts: number | null;
  success: boolean;
}

export interface SessionInfo {
  user: string;
  tty: string;
  source: string;
  since: string;
}

export interface SecurityReport {
  scannedAt: number;
  checks: SecurityCheck[];
  logins: LoginEvent[];
  loginsNote: string | null;
  sessions: SessionInfo[];
}