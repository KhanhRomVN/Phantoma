// Port Scan Types for PortScan component

export type PortProtocol = 'tcp' | 'udp';
export type PortState = 'open' | 'closed' | 'filtered';

export interface PortResult {
  port: number;
  protocol: PortProtocol;
  state: PortState;
  service: string;
  banner?: string;
}

export interface PortScanConfig {
  target: string;
  ports: string;
  protocol: PortProtocol;
}

export interface PortScanResult {
  config: PortScanConfig;
  results: PortResult[];
  totalScanned: number;
  openPorts: number;
  filteredPorts: number;
  closedPorts: number;
  duration: number;
  startedAt: string;
}