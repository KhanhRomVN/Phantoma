import type { ProxyKind, ProxyProtocol, ProxyStatus, Tone } from '../types';

export const TONE_CLASS: Record<Tone, { pill: string; dot: string; icon: string; bar: string; text: string }> = {
  success: { pill: 'bg-success/10 text-success', dot: 'bg-success', icon: 'bg-success/10 text-success', bar: 'bg-success', text: 'text-success' },
  error: { pill: 'bg-error/10 text-error', dot: 'bg-error', icon: 'bg-error/10 text-error', bar: 'bg-error', text: 'text-error' },
  warn: { pill: 'bg-warn/10 text-warn', dot: 'bg-warn', icon: 'bg-warn/10 text-warn', bar: 'bg-warn', text: 'text-warn' },
  info: { pill: 'bg-info/10 text-info', dot: 'bg-info', icon: 'bg-info/10 text-info', bar: 'bg-info', text: 'text-info' },
  primary: { pill: 'bg-primary/10 text-primary', dot: 'bg-primary', icon: 'bg-primary/10 text-primary', bar: 'bg-primary', text: 'text-primary' },
  muted: {
    pill: 'bg-text-secondary/10 text-text-secondary',
    dot: 'bg-text-secondary',
    icon: 'bg-text-secondary/10 text-text-secondary',
    bar: 'bg-text-secondary',
    text: 'text-text-secondary',
  },
};

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