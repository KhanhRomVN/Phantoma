// Types for AlienVault OTX Tool

export type IndicatorType = 'ip' | 'domain' | 'hash' | 'url';

export interface AlienvaultScanParams {
  indicator: string;
  indicatorType: IndicatorType;
  apiKey: string;
}

export interface PulseReference {
  id: string;
  name: string;
  description: string;
  created: string;
  modified: string;
  adversary?: string;
  tlp?: string;
  tags: string[];
}

export interface IndicatorResult {
  type: IndicatorType;
  value: string;
  reputation: 'malicious' | 'suspicious' | 'neutral' | 'unknown';
  activityCount: number;
  relatedIndicators: number;
  pulses: PulseReference[];
  malwareFamilies: string[];
  industries: string[];
  targetCountries: string[];
  geoData?: {
    country: string;
    countryCode: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  whois?: string;
  dnsRecords?: Array<{
    type: string;
    value: string;
  }>;
  latestActivity?: string;
  firstSeen?: string;
  lastSeen?: string;
}

export interface ScanResult {
  status: 'completed' | 'error';
  indicator: string;
  indicatorType: IndicatorType;
  duration: string;
  timestamp: number;
  result: IndicatorResult | null;
  rawOutput: string[];
}

export interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  scan: ScanResult | null;
}