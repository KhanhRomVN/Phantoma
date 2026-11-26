import type { ProxyKind, ProxyProtocol, ProxyStatus, Tone } from '../types/proxy-domain.types';

export const PROXY_STATUS: Record<ProxyStatus, { label: string; tone: Tone }> = {
  healthy: { label: 'Healthy', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warn' },
  dead: { label: 'Dead', tone: 'error' },
  testing: { label: 'Testing', tone: 'info' },
  unchecked: { label: 'Unchecked', tone: 'muted' },
};

export const PROTOCOL_META: Record<ProxyProtocol, { label: string; tone: Tone }> = {
  http: { label: 'HTTP', tone: 'info' },
  https: { label: 'HTTPS', tone: 'success' },
  socks4: { label: 'SOCKS4', tone: 'warn' },
  socks5: { label: 'SOCKS5', tone: 'primary' },
};

export const KIND_META: Record<ProxyKind, { label: string; tone: Tone; description: string }> = {
  datacenter: { label: 'Datacenter', tone: 'info', description: 'Fast and cheap, easier to detect' },
  residential: { label: 'Residential', tone: 'success', description: 'Real home IPs, rotating pool' },
  mobile: { label: 'Mobile', tone: 'primary', description: '4G/5G carrier IPs, highest trust' },
  isp: { label: 'ISP', tone: 'warn', description: 'Static residential, datacenter speed' },
};

export const PROTOCOLS = Object.keys(PROTOCOL_META) as ProxyProtocol[];
export const KINDS = Object.keys(KIND_META) as ProxyKind[];
export const STATUSES = Object.keys(PROXY_STATUS) as ProxyStatus[];

export const COUNTRIES: [string, string][] = [
  ['VN', 'Vietnam'],
  ['SG', 'Singapore'],
  ['US', 'United States'],
  ['JP', 'Japan'],
  ['DE', 'Germany'],
  ['GB', 'United Kingdom'],
  ['KR', 'South Korea'],
  ['TH', 'Thailand'],
];

export const COUNTRY_NAME: Record<string, string> = Object.fromEntries(COUNTRIES);

export const PROVIDERS = ['BrightPool', 'NetNut Lite', 'ProxyCheap', 'IPRoyal', 'Smartproxy', 'Self-hosted'];