// Person-local DataPoint type

export type SourceType = 'social_media' | 'breach_db' | 'pastebin' | 'darkweb'
  | 'contact_scraper' | 'username_search' | 'email_verifier' | 'reverse_email'
  | 'domain_whois' | 'github_api' | 'keybase' | 'leak_lookup'
  | 'people_search' | 'public_records' | 'osint_framework' | 'other';

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