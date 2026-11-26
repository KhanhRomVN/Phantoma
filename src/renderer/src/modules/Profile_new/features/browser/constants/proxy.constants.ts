import type {
  ProxyDraft,
  ProxyFilters,
  ProxyHealth,
  ProxyKind,
  ProxyProtocol,
  ToneLabel,
} from '../../../shared/types';

export const PROXY_PROTOCOLS: ProxyProtocol[] = ['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'];

export const PROXY_KIND: Record<ProxyKind, ToneLabel> = {
  residential: { label: 'Residential', tone: 'success' },
  isp: { label: 'ISP', tone: 'primary' },
  mobile: { label: '4G/5G', tone: 'info' },
  datacenter: { label: 'Datacenter', tone: 'warn' },
};

export const PROXY_HEALTH: Record<ProxyHealth, ToneLabel> = {
  online: { label: 'Online', tone: 'success' },
  slow: { label: 'Slow', tone: 'warn' },
  offline: { label: 'Offline', tone: 'error' },
};

export const MAX_PING = 500;
export const PING_STEPS = [50, 100, 200, 300];
export const PROXY_QUERY_KEYS = ['country', 'type', 'kind', 'provider', 'status', 'city'];
export const COUNTRY_BADGE_LIMIT = 6;

export const DEFAULT_PROXY_FILTERS: ProxyFilters = { protocols: [], kinds: [], health: 'all', country: 'all', maxPing: MAX_PING };
export const EMPTY_PROXY_DRAFT: ProxyDraft = { protocol: 'SOCKS5', host: '', port: '', user: '', pass: '' };