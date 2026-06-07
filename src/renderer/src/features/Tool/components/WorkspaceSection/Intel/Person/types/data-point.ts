import type { DataSource } from './source';

/**
 * A single atomic piece of data found during RECON.
 * Every data point has a source, confidence, and category.
 * This is the fundamental unit — messy, with optional fields.
 */
export interface DataPoint {
  /** Unique ID for this data point */
  id: string;
  /** What kind of data this is (auto-classified) */
  category: DataCategory;
  /** Human-readable label for display */
  label: string;
  /** The actual value (can be string, object, array — messy real data) */
  value: unknown;
  /** Display value (formatted, truncated if needed) */
  displayValue?: string;
  /** Confidence that this data point is correct (0-1) */
  confidence: number;
  /** Where this data came from */
  source: DataSource;
  /** Which entity this belongs to (null = unassigned / noise) */
  entityId?: string;
  /** Sub-category for finer grouping */
  subCategory?: string;
  /** Additional metadata (flexible) */
  metadata?: Record<string, unknown>;
  /** When this data was discovered */
  discoveredAt?: string;
  /** Relevance score to the query (0-1) */
  relevance: number;
  /** Tags for filtering */
  tags?: string[];
  /** Whether this data point is flagged as noise */
  isNoise: boolean;
  /** Verification status */
  verificationStatus: 'unverified' | 'verified' | 'disputed' | 'outdated';
}

/**
 * Dynamic data categories — auto-assigned by the smart classifier.
 * Categories can be extended as new data types are encountered.
 */
export type DataCategory =
  // Identity
  | 'full_name'
  | 'alias'
  | 'username'
  | 'nickname'
  | 'avatar'
  | 'gender'
  | 'age'
  | 'nationality'
  | 'language'
  | 'bio'
  | 'location'
  // Contact
  | 'email'
  | 'phone'
  | 'address'
  | 'messenger'
  // Social
  | 'social_profile'
  | 'social_post'
  | 'social_mention'
  // Professional
  | 'job_title'
  | 'company'
  | 'education'
  | 'skill'
  | 'certification'
  // Technical
  | 'domain'
  | 'ip_address'
  | 'hosting'
  | 'technology'
  | 'repository'
  | 'public_key'
  | 'ssh_key'
  | 'pgp_key'
  | 'api_key'
  | 'crypto_address'
  // Breaches & Leaks
  | 'password_leak'
  | 'credential_leak'
  | 'breach_entry'
  | 'pastebin_entry'
  | 'darkweb_mention'
  | 'stealer_log'
  // Media
  | 'image'
  | 'video'
  | 'document'
  | 'audio'
  // Network
  | 'url'
  | 'domain_registration'
  | 'ssl_certificate'
  | 'port'
  | 'service'
  // Financial
  | 'credit_card'
  | 'bank_account'
  | 'crypto_wallet'
  // Legal
  | 'court_record'
  | 'criminal_record'
  | 'sanction_list'
  // Other
  | 'other'
  | 'unclassified';