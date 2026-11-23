/**
 * ------------------------------------------------------------------
 * System Monitor Service
 * ------------------------------------------------------------------
 * Client cho API `/api/v1/system/*` của server (SystemStatsModal).
 * REST đi qua apiService (tự bóc envelope), live metrics dùng SSE.
 *
 * Các hàm chính:
 * - systemMonitorApi    : overview, cpu, memory, gpu, storage, network, sensors,
 *                         processes, services, containers, ports, logs, alerts, security
 * - openMetricsStream() : mở SSE `/system/stream`, trả về hàm đóng stream
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { apiService } from './api.service';
import { getServerBaseUrl } from './runtime-ports';
import type {
  AlertSnapshot,
  ContainerList,
  CpuDetails,
  GpuDetails,
  ListeningPort,
  LogQuery,
  LogResult,
  MemoryDetails,
  MetricsHistory,
  MetricsSample,
  NetworkDetails,
  ProcessList,
  ProcessQuery,
  SecurityReport,
  SensorDetails,
  ServiceAction,
  ServiceControlResult,
  ServiceList,
  ServiceStatus,
  StorageDetails,
  SystemOverview,
} from '@renderer/types/system-monitor';

// ─── Constants ──────────────────────────────────────────────────────────
const SYSTEM_PATH = '/api/v1/system';

// ─── Helpers ────────────────────────────────────────────────────────────
const withQuery = (path: string, params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
};

const get = <T>(path: string, params: Record<string, string | number | undefined> = {}) =>
  apiService.get<T>(withQuery(`${SYSTEM_PATH}${path}`, params));

// ─── API ────────────────────────────────────────────────────────────────
export const systemMonitorApi = {
  overview: () => get<SystemOverview>('/overview'),
  history: (limit?: number) => get<MetricsHistory>('/metrics/history', { limit }),
  cpu: () => get<CpuDetails>('/cpu'),
  memory: () => get<MemoryDetails>('/memory'),
  gpu: () => get<GpuDetails>('/gpu'),
  storage: () => get<StorageDetails>('/storage'),
  network: () => get<NetworkDetails>('/network'),
  sensors: () => get<SensorDetails>('/sensors'),

  processes: (q: ProcessQuery = {}) =>
    get<ProcessList>('/processes', { sort: q.sort, query: q.query, limit: q.limit }),
  services: (q: { query?: string; status?: ServiceStatus } = {}) =>
    get<ServiceList>('/services', { query: q.query, status: q.status }),
  controlService: (name: string, action: ServiceAction) =>
    apiService.post<ServiceControlResult>(
      `${SYSTEM_PATH}/services/${encodeURIComponent(name)}/${action}`,
    ),
  containers: () => get<ContainerList>('/containers'),
  // ASSUMED: /ports trả mảng ListeningPort hoặc { items } — chuẩn hoá về mảng
  ports: async (query?: string): Promise<ListeningPort[]> => {
    const res = await get<ListeningPort[] | { items: ListeningPort[] }>('/ports', { query });
    return Array.isArray(res) ? res : res.items;
  },

  logs: (q: LogQuery = {}) =>
    get<LogResult>('/logs', { limit: q.limit, level: q.level, query: q.query, since: q.since }),
  alerts: () => get<AlertSnapshot>('/alerts'),
  setAlertRule: (id: string, enabled: boolean) =>
    apiService.request<unknown>(`${SYSTEM_PATH}/alerts/rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  security: (refresh = false) =>
    get<SecurityReport>('/security', { refresh: refresh ? 'true' : undefined }),
};

// ─── Live stream (SSE) ──────────────────────────────────────────────────
export interface MetricsStreamHandlers {
  onOpen: () => void;
  onError: () => void;
  onHistory: (samples: MetricsSample[]) => void;
  onSample: (sample: MetricsSample) => void;
}

export function openMetricsStream(intervalMs: number, handlers: MetricsStreamHandlers): () => void {
  let source: EventSource | null = null;
  let closed = false;

  getServerBaseUrl().then((base) => {
    if (closed) return;
    source = new EventSource(`${base}${SYSTEM_PATH}/stream?interval=${intervalMs}`);
    source.onopen = handlers.onOpen;
    source.onerror = handlers.onError;
    source.addEventListener('history', (e) => {
      handlers.onHistory(JSON.parse((e as MessageEvent<string>).data) as MetricsSample[]);
    });
    source.addEventListener('sample', (e) => {
      handlers.onSample(JSON.parse((e as MessageEvent<string>).data) as MetricsSample);
    });
  });

  return () => {
    closed = true;
    source?.close();
  };
}