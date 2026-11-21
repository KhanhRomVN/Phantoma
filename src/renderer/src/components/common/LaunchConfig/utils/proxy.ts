import { COUNTRY_NAME } from '@renderer/modules/Proxy/constants/proxy';
import type { Proxy, ProxyStatus } from '@renderer/modules/Proxy/types';
import type { CountryStat, ParsedQuery, ProxyHealth, ProxyItem, ProxyProtocol } from '../types';

const HEALTH_OF_STATUS: Record<ProxyStatus, ProxyHealth> = {
  healthy: 'online',
  degraded: 'slow',
  dead: 'offline',
  testing: 'online',
  unchecked: 'online',
};

// ASSUMED: Proxy.country is an ISO code (or a country name); successRate is 0-1 or 0-100
export function toProxyItem(p: Proxy): ProxyItem {
  const names = COUNTRY_NAME as Record<string, string>;
  const raw = (p.country ?? '').trim();
  const code = /^[a-z]{2}$/i.test(raw)
    ? raw.toUpperCase()
    : (Object.keys(names).find((k) => names[k].toLowerCase() === raw.toLowerCase()) ?? '');
  const rate = p.successRate <= 1 ? p.successRate * 100 : p.successRate;
  return {
    id: p.id,
    name: p.name || `${p.host}:${p.port}`,
    provider: p.provider,
    protocol: p.protocol.toUpperCase() as ProxyProtocol,
    host: p.host,
    port: String(p.port),
    user: p.username ?? '',
    pass: p.password ?? '',
    country: names[code] ?? raw,
    countryCode: code,
    city: p.city,
    kind: p.kind,
    latency: p.latencyMs ?? 0,
    uptime: Math.round(rate * 10) / 10,
    health: HEALTH_OF_STATUS[p.status],
    exitIp: p.exitIp || undefined,
  };
}

export function flagEmoji(cc: string): string {
  if (cc.length !== 2) return '🌐';
  return String.fromCodePoint(...cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
}

export function parseQuery(q: string, allowed: string[]): ParsedQuery {
  const out: ParsedQuery = { text: [], keys: [], ping: null };
  const keyRe = new RegExp(`^(${allowed.join('|')}):(.+)$`, 'i');
  for (const token of q.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    const k = token.match(keyRe);
    const p = token.match(/^ping<(\d+)$/);
    if (k) out.keys.push([k[1], k[2]]);
    else if (p) out.ping = Number(p[1]);
    else out.text.push(token);
  }
  return out;
}

export function toggleItem<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

// ASSUMED: country "available" = có ít nhất 1 proxy không offline; count chỉ tính proxy không offline
export function buildCountryStats(items: ProxyItem[]): CountryStat[] {
  const map = new Map<string, CountryStat>();
  for (const p of items) {
    if (!p.countryCode || p.health === 'offline') continue;
    const cur = map.get(p.countryCode);
    if (cur) cur.count += 1;
    else map.set(p.countryCode, { code: p.countryCode, name: p.country, count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}