// Scan-local DataPoint type for active scanning results

export type ScanSourceType =
  | 'zone_transfer'
  | 'dns_bruteforce'
  | 'dns_enumeration'
  | 'dns_misconfig'
  | 'other';

export interface DataSource {
  id: string;
  name: string;
  type: ScanSourceType;
  credibility: number;
}

export type DataCategory = string;

export type VerificationStatus = 'verified' | 'unverified' | 'disputed' | 'pending';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface DataPoint {
  id: string;
  category: DataCategory;
  label: string;
  value: unknown;
  displayValue: string;
  confidence: number;
  source: DataSource;
  relevance: number;
  isNoise: boolean;
  verificationStatus: VerificationStatus;
  discoveredAt: string;
  severity?: Severity;
  riskScore?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}