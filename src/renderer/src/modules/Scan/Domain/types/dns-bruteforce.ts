// DNS Brute-force Types for Active Scan

export interface BruteForceResult {
  subdomain: string;
  resolved: boolean;
  ip?: string;
  latency_ms?: number;
  note?: string;
}