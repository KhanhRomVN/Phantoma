export interface SecurityFinding {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvss?: number;
  cve?: string;
  description: string;
}