import { getDb } from '../database/connection';
import { buildPatch, deleteRow, enc, getRow, insertRow, updateRow, type ColumnMap, type Input } from '../database/sql';
import type { Row } from '../domain/mappers';

const DAY_MS = 86400000;

const PROXY_COLUMNS: ColumnMap = {
  sourceId: ['source_id'],
  name: ['name'],
  host: ['host'],
  port: ['port'],
  protocol: ['protocol'],
  username: ['username', (v) => v ?? ''],
  password: ['password', (v) => v ?? ''],
  kind: ['kind'],
  ownership: ['ownership'],
  status: ['status'],
  provider: ['provider'],
  country: ['country'],
  city: ['city'],
  isp: ['isp'],
  exitIp: ['exit_ip'],
  latencyMs: ['latency_ms'],
  successRate: ['success_rate'],
  latencyHistory: ['latency_history', enc.json],
  lastMessage: ['last_message'],
  quotaUsedGb: ['quota_used_gb'],
  quotaTotalGb: ['quota_total_gb'],
  stickyEnabled: ['sticky_enabled', enc.bool],
  stickyTtlMin: ['sticky_ttl_min'],
  rotationMin: ['rotation_min'],
  maxConns: ['max_conns'],
  tags: ['tags', enc.json],
  usedBy: ['used_by', enc.json],
  notes: ['notes'],
  lastChecked: ['last_checked', enc.time],
  expiresAt: ['expires_at', enc.time],
};

export interface ProxyStatsRow {
  total: number;
  byStatus: Record<string, number>;
  avgLatency: number;
  quotaUsedGb: number;
  quotaTotalGb: number;
  expiring: number;
  expired: number;
}

export const proxyRepository = {
  list: (sourceId?: string): Row[] =>
    (sourceId
      ? getDb().prepare('SELECT * FROM proxies WHERE source_id = ? ORDER BY created_at DESC').all(sourceId)
      : getDb().prepare('SELECT * FROM proxies ORDER BY created_at DESC').all()) as Row[],
  get: (id: string): Row | undefined => getRow('proxies', id),
  getMany: (ids: string[]): Row[] => {
    if (ids.length === 0) return [];
    return getDb()
      .prepare(`SELECT * FROM proxies WHERE id IN (${ids.map(() => '?').join(', ')})`)
      .all(...ids) as Row[];
  },
  findDuplicate: (sourceId: string, host: string, port: number, username: string): Row | undefined =>
    getDb()
      .prepare('SELECT * FROM proxies WHERE source_id = ? AND host = ? AND port = ? AND username = ?')
      .get(sourceId, host, port, username) as Row | undefined,
  listKeys: (): string[] =>
    (getDb().prepare('SELECT host, port FROM proxies').all() as { host: string; port: number }[]).map(
      (r) => `${r.host}:${r.port}`,
    ),
  insert: (id: string, input: Input): void => {
    const now = Date.now();
    insertRow('proxies', { id, created_at: now, updated_at: now, ...buildPatch(input, PROXY_COLUMNS) });
  },
  insertMany: (items: { id: string; input: Input }[]): void => {
    getDb().transaction(() => {
      for (const { id, input } of items) proxyRepository.insert(id, input);
    })();
  },
  update: (id: string, input: Input): boolean => updateRow('proxies', id, buildPatch(input, PROXY_COLUMNS)),
  remove: (id: string): boolean => deleteRow('proxies', id),
  removeMany: (ids: string[]): number => {
    let removed = 0;
    getDb().transaction(() => {
      for (const id of ids) if (deleteRow('proxies', id)) removed += 1;
    })();
    return removed;
  },
  stats: (sourceId: string): ProxyStatsRow => {
    const db = getDb();
    const now = Date.now();
    const counts = db
      .prepare('SELECT status, COUNT(*) AS n FROM proxies WHERE source_id = ? GROUP BY status')
      .all(sourceId) as { status: string; n: number }[];
    const agg = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           AVG(latency_ms) AS avg_latency,
           COALESCE(SUM(CASE WHEN quota_total_gb > 0 THEN quota_used_gb END), 0) AS used,
           COALESCE(SUM(CASE WHEN quota_total_gb > 0 THEN quota_total_gb END), 0) AS quota,
           COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND expires_at >= @now AND expires_at <= @soon THEN 1 END), 0) AS expiring,
           COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < @now THEN 1 END), 0) AS expired
         FROM proxies WHERE source_id = @sid`,
      )
      .get({ sid: sourceId, now, soon: now + 7 * DAY_MS }) as Row;
    return {
      total: agg.total,
      byStatus: Object.fromEntries(counts.map((c) => [c.status, c.n])),
      avgLatency: Math.round(agg.avg_latency ?? 0),
      quotaUsedGb: agg.used,
      quotaTotalGb: agg.quota,
      expiring: agg.expiring,
      expired: agg.expired,
    };
  },
};