// Types for Nmap Tool

export interface NmapScanParams {
  target: string;
  scanType: 'syn' | 'tcp' | 'udp' | 'ping';
  ports: string;
  aggressive: boolean;
  osDetection: boolean;
  versionDetection: boolean;
  timing: '0' | '1' | '2' | '3' | '4' | '5';
  additionalFlags: string;
}

export interface PortResult {
  port: number;
  protocol: string;
  service: string;
  state: 'open' | 'filtered' | 'closed';
  version?: string;
}

export interface ScanResult {
  status: 'completed' | 'error';
  target: string;
  scanType: string;
  duration: string;
  timestamp: number;
  host?: {
    ip: string;
    hostname?: string;
    os?: string;
    uptime?: string;
    mac?: string;
  };
  ports: PortResult[];
  scripts?: Array<{ name: string; output: string }>;
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