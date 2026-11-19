export type Row = Record<string, any>;

const iso = (ms: number | null | undefined): string | null => (ms ? new Date(ms).toISOString() : null);

function parse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export const mapSource = (r: Row) => ({
  id: r.id as string,
  name: r.name as string,
  type: r.type as string,
  websiteUrl: (r.website_url ?? '') as string,
  count: (r.count ?? 0) as number,
  createdAt: iso(r.created_at) ?? '',
  updatedAt: iso(r.updated_at) ?? '',
});

// ASSUMED: shape mirrors the renderer's Proxy type (modules/Proxy/types/proxy.types.ts); empty username/password map back to null
export const mapProxy = (r: Row) => ({
  id: r.id as string,
  sourceId: r.source_id as string,
  name: r.name as string,
  host: r.host as string,
  port: r.port as number,
  protocol: r.protocol as string,
  username: (r.username || null) as string | null,
  password: (r.password || null) as string | null,
  kind: r.kind as string,
  ownership: r.ownership as string,
  status: r.status as string,
  provider: r.provider as string,
  country: r.country as string,
  city: r.city as string,
  isp: r.isp as string,
  exitIp: r.exit_ip as string,
  latencyMs: (r.latency_ms ?? null) as number | null,
  successRate: r.success_rate as number,
  latencyHistory: parse<number[]>(r.latency_history, []),
  lastMessage: (r.last_message ?? '') as string,
  quotaUsedGb: r.quota_used_gb as number,
  quotaTotalGb: (r.quota_total_gb ?? null) as number | null,
  stickyEnabled: r.sticky_enabled === 1,
  stickyTtlMin: r.sticky_ttl_min as number,
  rotationMin: r.rotation_min as number,
  maxConns: r.max_conns as number,
  tags: parse<string[]>(r.tags, []),
  usedBy: parse<string[]>(r.used_by, []),
  notes: r.notes as string,
  createdAt: iso(r.created_at) ?? '',
  lastChecked: iso(r.last_checked),
  expiresAt: iso(r.expires_at),
});