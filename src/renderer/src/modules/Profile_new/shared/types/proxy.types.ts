import type { Tone } from './ui.types';

export type ProxyProtocol = 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5';
export type ProxyKind = 'residential' | 'datacenter' | 'mobile' | 'isp';
export type ProxyHealth = 'online' | 'slow' | 'offline';
export type ProxyTestState = 'idle' | 'testing' | 'ok' | 'fail';

export interface ToneLabel {
  label: string;
  tone: Tone;
}

export interface ProxyItem {
  id: string;
  name: string;
  provider: string;
  protocol: ProxyProtocol;
  host: string;
  port: string;
  user: string;
  pass: string;
  country: string;
  countryCode: string;
  city: string;
  kind: ProxyKind;
  latency: number;
  uptime: number;
  health: ProxyHealth;
  custom?: boolean;
  exitIp?: string;
}


export interface ProxyFilters {
  protocols: ProxyProtocol[];
  kinds: ProxyKind[];
  health: ProxyHealth | 'all';
  country: string;
  maxPing: number;
}

export interface ProxyDraft {
  protocol: ProxyProtocol;
  host: string;
  port: string;
  user: string;
  pass: string;
}

export interface CountryStat {
  code: string;
  name: string;
  count: number;
}
