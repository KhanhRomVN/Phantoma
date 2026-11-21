export type Tone = 'success' | 'error' | 'warn' | 'info' | 'primary' | 'muted';

export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';
export type ProxyKind = 'datacenter' | 'residential' | 'mobile' | 'isp';
export type ProxyOwnership = 'private' | 'shared';
export type ProxyStatus = 'healthy' | 'degraded' | 'dead' | 'testing' | 'unchecked';

export interface ProxyCheck {
  id: string;
  at: string;
  ok: boolean;
  latencyMs: number | null;
  message: string;
}

export interface Proxy {
  id: string;
  sourceId: string;
  name: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username: string | null;
  password: string | null;
  kind: ProxyKind;
  ownership: ProxyOwnership;
  status: ProxyStatus;
  provider: string;
  country: string;
  city: string;
  isp: string;
  exitIp: string;
  latencyMs: number | null;
  successRate: number;
  latencyHistory: number[];
  quotaUsedGb: number;
  quotaTotalGb: number | null;
  stickyEnabled: boolean;
  stickyTtlMin: number;
  rotationMin: number;
  maxConns: number;
  tags: string[];
  usedBy: string[];
  notes: string;
  createdAt: string;
  lastChecked: string | null;
  expiresAt: string | null;
  checks: ProxyCheck[];
}

export interface ProxyDraft {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username: string;
  password: string;
  kind: ProxyKind;
  ownership: ProxyOwnership;
  country: string;
  provider: string;
  tags: string[];
  isp?: string;
  name?: string;
  stickyEnabled?: boolean;
  stickyTtlMin?: number;
  rotationMin?: number;
  maxConns?: number;
  notes?: string;
  quotaTotalGb?: number | null;
  expiresAt?: string | null;
}

export interface ProxyFilters {
  status: ProxyStatus | 'all';
  protocol: ProxyProtocol | 'all';
  kind: ProxyKind | 'all';
  country: string;
  search: string;
}

export const DEFAULT_PROXY_FILTERS: ProxyFilters = {
  status: 'all',
  protocol: 'all',
  kind: 'all',
  country: 'all',
  search: '',
};