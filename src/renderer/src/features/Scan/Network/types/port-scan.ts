// Port Scan Types for Network Scan

export type PortState = 'open' | 'filtered' | 'closed';

export interface PortInfo {
  port: number;
  state: PortState;
  service: string;
}

export interface PortScanResult {
  ip: string;
  ports: PortInfo[];
}

export interface PortSummary {
  totalOpenPorts: number;
  topServices: Map<string, number>;
  hostsWithOpenPorts: string[];
}