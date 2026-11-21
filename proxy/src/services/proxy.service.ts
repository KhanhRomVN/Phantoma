import type { Input } from '../database/sql';
import { mapProxy, type Row } from '../domain/mappers';

import { proxyRepository } from '../repositories/proxy.repository';
import { sourceRepository } from '../repositories/source.repository';
import { AppError, found, newId, requireString } from '../utils/http';

export const PROTOCOLS = ['http', 'https', 'socks4', 'socks5'];
export const KINDS = ['datacenter', 'residential', 'mobile', 'isp'];
export const OWNERSHIPS = ['private', 'shared'];

// status, latency, success rate, history, exit IP and last check are owned by the health checker, never set by clients
const CLIENT_FIELDS = [
  'sourceId',
  'name',
  'host',
  'port',
  'protocol',
  'username',
  'password',
  'kind',
  'ownership',
  'provider',
  'country',
  'city',
  'isp',
  'quotaUsedGb',
  'quotaTotalGb',
  'stickyEnabled',
  'stickyTtlMin',
  'rotationMin',
  'maxConns',
  'tags',
  'usedBy',
  'notes',
  'expiresAt',
];

function oneOf(value: unknown, list: string[], field: string): string {
  if (typeof value !== 'string' || !list.includes(value)) throw new AppError(`${field} must be one of: ${list.join(', ')}`, 400);
  return value;
}

function intIn(value: unknown, field: string, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new AppError(`${field} must be an integer between ${min} and ${max}`, 400);
  return n;
}

function numberMin(value: unknown, field: string, min: number): number {
  const n = Number(value);
  if (Number.isNaN(n) || n < min) throw new AppError(`${field} must be a number >= ${min}`, 400);
  return n;
}

function strings(value: unknown, field: string, lower: boolean): string[] {
  if (!Array.isArray(value)) throw new AppError(`${field} must be an array`, 400);
  const out = value.map((v) => String(v).trim()).map((v) => (lower ? v.toLowerCase() : v)).filter(Boolean);
  return [...new Set(out)];
}

function validHost(host: string): boolean {
  return host.length > 0 && host.length <= 253 && host.split('').every((c) => c.trim() !== '' && c !== '/' && c !== '@');
}

function clean(input: Input, creating: boolean): Input {
  const out: Input = {};
  for (const key of CLIENT_FIELDS) if (input[key] !== undefined) out[key] = input[key];

  if (creating) requireString(out.sourceId, 'sourceId');
  if (creating || out.host !== undefined) {
    const host = typeof out.host === 'string' ? out.host.trim() : '';
    if (!validHost(host)) throw new AppError('host is invalid', 400);
    out.host = host;
  }
  if (creating || out.port !== undefined) out.port = intIn(out.port, 'port', 1, 65535);
  if (creating && out.protocol === undefined) out.protocol = 'http';
  if (out.protocol !== undefined) out.protocol = oneOf(out.protocol, PROTOCOLS, 'protocol');
  if (creating && out.kind === undefined) out.kind = 'datacenter';
  if (out.kind !== undefined) out.kind = oneOf(out.kind, KINDS, 'kind');
  if (creating && out.ownership === undefined) out.ownership = 'private';
  if (out.ownership !== undefined) out.ownership = oneOf(out.ownership, OWNERSHIPS, 'ownership');

  for (const key of ['username', 'password']) {
    if (out[key] !== undefined) out[key] = typeof out[key] === 'string' ? out[key] : '';
  }
  for (const key of ['name', 'provider', 'country', 'city', 'isp', 'notes']) {
    if (out[key] !== undefined) out[key] = String(out[key] ?? '').trim();
  }
  if (out.country !== undefined) out.country = out.country.toUpperCase();

  if (out.stickyEnabled !== undefined) out.stickyEnabled = Boolean(out.stickyEnabled);
  if (out.stickyTtlMin !== undefined) out.stickyTtlMin = intIn(out.stickyTtlMin, 'stickyTtlMin', 1, 1440);
  if (out.rotationMin !== undefined) out.rotationMin = intIn(out.rotationMin, 'rotationMin', 0, 1440);
  if (out.maxConns !== undefined) out.maxConns = intIn(out.maxConns, 'maxConns', 1, 10000);
  if (out.quotaUsedGb !== undefined) out.quotaUsedGb = numberMin(out.quotaUsedGb, 'quotaUsedGb', 0);
  if (out.quotaTotalGb !== undefined && out.quotaTotalGb !== null) out.quotaTotalGb = numberMin(out.quotaTotalGb, 'quotaTotalGb', 0);
  if (out.tags !== undefined) out.tags = strings(out.tags, 'tags', true);
  if (out.usedBy !== undefined) out.usedBy = strings(out.usedBy, 'usedBy', false);
  if (typeof out.expiresAt === 'string' && Number.isNaN(Date.parse(out.expiresAt))) throw new AppError('expiresAt is not a valid date', 400);
  return out;
}

function autoName(data: Input, ordinal: number): string {
  const prefix = (data.country as string | undefined) || 'XX';
  return `${prefix}-${String(data.kind).slice(0, 3).toUpperCase()}-${String(ordinal).padStart(2, '0')}`;
}

function requireSource(id: unknown): Row {
  return found(sourceRepository.getPlain(String(id)), 'source');
}

function assertUnique(data: Input, selfId?: string): void {
  const dup = proxyRepository.findDuplicate(data.sourceId, data.host, data.port, data.username ?? '');
  if (dup && dup.id !== selfId) throw new AppError(`proxy ${data.host}:${data.port} already exists in this source`, 409);
}

export const proxyService = {
  list: (opts: { sourceId?: string } = {}) => proxyRepository.list(opts.sourceId).map((r) => mapProxy(r)),

  get: (id: string) => mapProxy(found(proxyRepository.get(id), 'proxy')),

  keys: (): string[] => proxyRepository.listKeys(),

  create: (input: Input) => {
    const data = clean(input, true);
    requireSource(data.sourceId);
    assertUnique(data);
    if (!data.name) data.name = autoName(data, proxyRepository.stats(data.sourceId).total + 1);
    const id = newId();
    proxyRepository.insert(id, data);
    return proxyService.get(id);
  },

  createMany: (sourceId: string, items: Input[]) => {
    requireSource(sourceId);
    const base = proxyRepository.stats(sourceId).total;
    const accepted: { id: string; input: Input }[] = [];
    const skipped: { index: number; reason: string }[] = [];
    const seen = new Set<string>();
    items.forEach((item, index) => {
      try {
        const data = clean({ ...item, sourceId }, true);
        const key = `${data.host}:${data.port}:${data.username ?? ''}`;
        if (seen.has(key)) throw new AppError('duplicate in request', 409);
        assertUnique(data);
        seen.add(key);
        if (!data.name) data.name = autoName(data, base + accepted.length + 1);
        accepted.push({ id: newId(), input: data });
      } catch (err) {
        if (!(err instanceof AppError)) throw err;
        skipped.push({ index, reason: err.message });
      }
    });
    proxyRepository.insertMany(accepted);
    return {
      created: accepted.map((a) => proxyService.get(a.id)),
      skipped,
    };
  },

  update: (id: string, input: Input) => {
    const row = found(proxyRepository.get(id), 'proxy');
    const data = clean(input, false);
    if (data.sourceId !== undefined) requireSource(data.sourceId);
    assertUnique(
      {
        sourceId: data.sourceId ?? row.source_id,
        host: data.host ?? row.host,
        port: data.port ?? row.port,
        username: data.username ?? row.username,
      },
      id,
    );
    proxyRepository.update(id, data);
    return proxyService.get(id);
  },

  remove: (id: string): void => {
    if (!proxyRepository.remove(id)) throw new AppError('proxy not found', 404);
  },

  removeMany: (ids: unknown): number => {
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError('ids must be a non-empty array', 400);
    return proxyRepository.removeMany(ids.map(String));
  },

  stats: (sourceId: string) => {
    requireSource(sourceId);
    const s = proxyRepository.stats(sourceId);
    return {
      total: s.total,
      healthy: s.byStatus.healthy ?? 0,
      degraded: s.byStatus.degraded ?? 0,
      dead: s.byStatus.dead ?? 0,
      testing: s.byStatus.testing ?? 0,
      unchecked: s.byStatus.unchecked ?? 0,
      avgLatency: s.avgLatency,
      quotaUsedGb: Math.round(s.quotaUsedGb * 10) / 10,
      quotaTotalGb: s.quotaTotalGb,
      expiring: s.expiring,
      expired: s.expired,
    };
  },
};