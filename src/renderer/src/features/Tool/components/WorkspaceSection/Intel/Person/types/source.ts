/**
 * Source attribution for every data point.
 * In real RECON, every piece of data comes from somewhere.
 */
export interface DataSource {
  /** Unique source identifier */
  id: string;
  /** Human-readable source name (e.g., "GitHub", "LinkedIn", "HaveIBeenPwned") */
  name: string;
  /** URL where this data was found */
  url?: string;
  /** Source type category */
  type: SourceType;
  /** Credibility score 0-1 (how trustworthy is this source?) */
  credibility: number;
  /** When this source was queried/scraped */
  retrievedAt?: string;
  /** Raw excerpt or snippet from the source */
  excerpt?: string;
}

export type SourceType =
  | 'social_media'
  | 'code_platform'
  | 'breach_database'
  | 'darkweb'
  | 'pastebin'
  | 'public_record'
  | 'search_engine'
  | 'domain_whois'
  | 'dns_record'
  | 'document'
  | 'forum'
  | 'marketplace'
  | 'messenger'
  | 'gaming'
  | 'professional'
  | 'government'
  | 'news_media'
  | 'other';