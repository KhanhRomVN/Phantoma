// Domain-local DataPoint type — replaces import from Person module

export type SourceType = 'certificate_transparency' | 'dns_history' | 'passive_dns' | 'subdomain_enum'
  | 'whois_history' | 'network_scan' | 'osint' | 'technology' | 'email_harvesting'
  | 'mentions' | 'people' | 'headers_scan' | 'ssl_analysis' | 'index_pages'
  | 'scan_results' | 'sensitive_exposure' | 'other';

export interface DataSource {
  id: string;
  name: string;
  type: SourceType;
  credibility: number;
}

export type DataCategory = string;

export type VerificationStatus = 'verified' | 'unverified' | 'disputed' | 'pending';

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
  riskScore?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}