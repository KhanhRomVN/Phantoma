// Host Discovery Types for Network Scan

export interface HostDiscoveryResult {
  ip: string;
  status: 'up' | 'down';
  method: 'icmp' | 'tcp_syn_80' | 'tcp_syn_443' | 'none';
  latency_ms?: number;
}

export interface HostSummary {
  totalHosts: number;
  hostsUp: number;
  hostsDown: number;
  averageLatency: number;
}