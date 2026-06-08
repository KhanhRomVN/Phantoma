// DNS Misconfiguration Types for Active Scan

export type MisconfigSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface DnsMisconfig {
  issue: string;
  severity: MisconfigSeverity;
  detail: string;
  nameserver?: string;
  ip?: string;
  domain?: string;
  record?: string;
  nameservers?: string[];
  affected_records?: string[];
}