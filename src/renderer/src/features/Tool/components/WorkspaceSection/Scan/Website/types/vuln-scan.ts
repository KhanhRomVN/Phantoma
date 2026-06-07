// Vulnerability Scan Types

export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface VulnFinding {
  name: string;
  severity: VulnSeverity;
  cve?: string;
  cvss?: number;
  location: string;
  description: string;
  remediation?: string;
  templateId: string;
}

export interface VulnScanResult {
  url: string;
  findings: VulnFinding[];
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  duration: number;
  startedAt: string;
}