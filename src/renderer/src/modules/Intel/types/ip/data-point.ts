// IP-local DataPoint type — replaces import from Person/Domain module

export type SourceType = 'shodan' | 'censys' | 'reverse_ip' | 'passive_dns' | 'geoip'
  | 'bgp' | 'threat_intel' | 'abuse_reports' | 'spam_list' | 'noise_intel'
  | 'ssl_certs' | 'scan_results' | 'mentions' | 'index_pages'
  | 'malware_urls' | 'reputation' | 'scan_reports' | 'other';

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