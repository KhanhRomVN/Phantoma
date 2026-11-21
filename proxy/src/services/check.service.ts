import { EventEmitter } from 'events';
import { getConfig } from '../config/server.config';
import { mapProxy, type Row } from '../domain/mappers';
import { proxyRepository } from '../repositories/proxy.repository';
import { found } from '../utils/http';
import { createLogger } from '../utils/logger';
import { lookupIp } from './ip-lookup.service';
import { probeProxy, type ProbeResult } from './probe.service';

const logger = createLogger('CheckService');

const HISTORY_SIZE = 24;
const RATE_WINDOW = 20;
const SLOW_MS = 400;
const DEGRADED_RATE = 70;

const inflight = new Set<string>();
const events = new EventEmitter();
events.setMaxListeners(50);

async function enrichLocation(id: string, exitIp: string): Promise<void> {
  try {
    const info = await lookupIp(exitIp);
    proxyRepository.update(id, { country: info.countryCode.toUpperCase(), city: info.city, isp: info.isp });
    logger.info(`[DEBUG] location saved for proxy ${id}: ${exitIp} -> ${info.countryCode} / ${info.city} / ${info.isp}`);
  } catch (err) {
    logger.warn(`Location lookup failed for ${exitIp}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function parseHistory(text: string): number[] {
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

function record(id: string, result: ProbeResult): void {
  const row = proxyRepository.get(id);
  if (!row) return;
  const at = Date.now();
  // ASSUMED: success rate is derived from latency_history (0 = failure) now that proxy_checks is gone; ok probes are stored as >= 1 ms
  const history = [...parseHistory(row.latency_history), result.ok ? Math.max(1, result.latencyMs ?? 1) : 0].slice(-HISTORY_SIZE);
  const recent = history.slice(-RATE_WINDOW);
  const successRate = Math.round((recent.filter((v) => v > 0).length / recent.length) * 100);
  let status = 'healthy';
  if (!result.ok) status = 'dead';
  else if ((result.latencyMs ?? 0) > SLOW_MS || successRate < DEGRADED_RATE) status = 'degraded';
  proxyRepository.update(id, {
    status,
    latencyMs: result.ok ? result.latencyMs : null,
    successRate,
    latencyHistory: history,
    exitIp: result.exitIp || row.exit_ip,
    lastMessage: result.message,
    lastChecked: at,
  });
}

// enrich = false for background checks: the IP lookup (location/ISP) only runs when asked or when the proxy has no country yet
async function testOne(row: Row, enrich = true): Promise<void> {
  if (inflight.has(row.id)) return;
  inflight.add(row.id);
  try {
    const result = await probeProxy(
      { protocol: row.protocol, host: row.host, port: row.port, username: row.username, password: row.password },
      getConfig().checkTimeoutMs,
    );
    record(row.id, result);
    logger.info(`[DEBUG] probe ${row.host}:${row.port} ok=${result.ok} exitIp=${result.exitIp || '-'}`);
    if (enrich && result.ok && result.exitIp) await enrichLocation(row.id, result.exitIp);
    const fresh = proxyRepository.get(row.id);
    if (fresh) events.emit('update', mapProxy(fresh));
  } finally {
    inflight.delete(row.id);
  }
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

export const checkService = {
  events,

  isTesting: (id: string): boolean => inflight.has(id),

  async test(id: string) {
    await testOne(found(proxyRepository.get(id), 'proxy'));
    return mapProxy(found(proxyRepository.get(id), 'proxy'));
  },

  async testMany(ids: string[]) {
    const rows = proxyRepository.getMany(ids);
    await runPool(rows, getConfig().checkConcurrency, (r) => testOne(r));
    return proxyRepository.getMany(rows.map((r) => r.id)).map((r) => mapProxy(r));
  },

  async testSource(sourceId: string) {
    const ids = proxyRepository.list(sourceId).map((r) => r.id);
    return checkService.testMany(ids);
  },

  async checkAll(): Promise<void> {
    const now = Date.now();
    // expired and already failing: nothing left to learn, so skip the ping
    const rows = proxyRepository.list().filter((r) => !(r.status === 'dead' && r.expires_at && r.expires_at <= now));
    await runPool(rows, getConfig().checkConcurrency, (r) => testOne(r, !r.country));
  },
};