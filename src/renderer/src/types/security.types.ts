/**
 * Security-related types for the Emulate feature
 */

export interface SecurityVulnerability {
  id: string;
  name: string;
  cve?: string;
  cvss: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affected: string[];
  remediation: string;
  exploited: boolean;
  discoveredAt: number;
}

export interface SecurityFinding {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location: string;
  evidence?: string;
  recommendation?: string;
  status: 'open' | 'in_progress' | 'fixed' | 'ignored';
  createdAt: number;
  updatedAt: number;
}

export interface SecurityScanResult {
  id: string;
  target: string;
  timestamp: number;
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scanType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}