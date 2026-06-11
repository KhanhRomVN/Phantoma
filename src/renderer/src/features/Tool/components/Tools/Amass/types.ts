// Types for Amass Tool

export interface AmassScanParams {
  target: string;
  mode: 'enum' | 'intel';
  passiveOnly: boolean;
  activeEnabled: boolean;
  bruteForce: boolean;
  wordlist: string;
  includeSources: string;
  excludeSources: string;
  resolvers: string;
  dnsQps: number;
  timeout: number;
  outputFormat: 'text' | 'json' | 'csv';
  additionalFlags: string;
}

export interface SubdomainResult {
  name: string;
  source?: string;
  type?: 'fqdn' | 'wildcard' | 'ns' | 'mx';
}

export interface AmassScanResult {
  status: 'completed' | 'error';
  target: string;
  mode: string;
  duration: string;
  timestamp: number;
  subdomains: SubdomainResult[];
  sourcesUsed?: string[];
  stats?: {
    total: number;
    unique: number;
    fromPassive: number;
    fromActive: number;
  };
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
  scan: AmassScanResult | null;
}