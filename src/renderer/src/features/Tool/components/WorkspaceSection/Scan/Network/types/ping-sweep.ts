// Ping Sweep Types for PingSweep component

export type PingMethod = 'icmp' | 'tcp' | 'udp';

export interface PingSweepConfig {
  target: string;
  method: PingMethod;
  timeout: number;
}

export interface PingSweepResult {
  config: PingSweepConfig;
  hosts: string[];
  totalHosts: number;
  liveHosts: number;
  duration: number;
  startedAt: string;
}