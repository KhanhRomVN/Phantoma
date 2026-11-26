import type { IpInfo } from '@renderer/services/ip-lookup.service';

export type IpType = 'residential' | 'datacenter' | 'vpn' | 'mobile';
export type ScriptStatus = 'success' | 'failed' | 'running' | 'cancelled';

export interface NetworkFootprint {
  id: string;
  ip: string;
  country: string;
  city: string;
  isp: string;
  ipType: IpType;
  at: string;
  lastSeenAt: string;
  sessions: number;
  durationMin: number;
  changed: boolean;
  device: string;
  platform: string;
  browser: string;
  screen: string;
  language: string;
  timezone: string;
  userAgent: string;
}

export interface SessionFootprint {
  name: string;
  os: string;
  browser: string;
  screen: string;
  gpu: string;
  cores: number;
  memory: number;
  lang: string;
  tz: string;
  cc: string;
  userAgent: string;
  sections: { id: string; title: string; fields: [label: string, value: string][] }[];
}

export interface SessionSite {
  url: string;
  host: string;
  title: string;
  visits: number;
  durationSec: number;
  firstAt: string;
  lastAt: string;
}

export interface BrowserSession {
  sites?: SessionSite[];
  id: string;
  browser: 'chrome' | 'chromium';
  startedAt: string;
  endedAt: string | null;
  ip: IpInfo | null;
  footprint: SessionFootprint | null;
}

export interface BrowsingEntry {
  id: string;
  url: string;
  title: string;
  at: string;
  visits: number;
  footprintId: string;
}

export interface ScriptRun {
  id: string;
  scriptName: string;
  status: ScriptStatus;
  at: string;
  durationSec: number;
  note?: string;
}

export interface DeviceActivity {
  id: string;
  device: string;
  os: string;
  browser: string;
  action: string;
  at: string;
  trusted: boolean;
}
