// ReconData Aggregate Type — INTEL Only (Passive)
import type { DNSRecords } from './dns';
import type { WhoisData, IdentityRecords } from './identity';
import type { Subdomain } from './subdomain';
import type { Infrastructure } from './infrastructure';
import type { Breach, GoogleDork, WaybackSnapshot, SocialIntel, EmployeeData, PublicDocument, FileMetadata, MobileApp, InternetMention } from './osint';
import type { SensitiveExposure } from './sensitive-exposure';
import type { CertTransparency } from './osint';

// Domain Session Types
export type DomainStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface DomainSession {
  id: string;
  domain: string;
  ip?: string;
  status: DomainStatus;
  progress: number;
  stats?: {
    subdomains: number;
    breaches: number;
    emails: number;
    dorks: number;
  };
}

// Main INTEL Data Type (Passive Only)
export interface ReconData {
  target: string;
  targetIp: string;
  scanTime: string;
  dnsRecords: DNSRecords;
  subdomains: Subdomain[];
  whoisData: WhoisData;
  identityRecords?: IdentityRecords;
  breaches: Breach[];
  harvestedEmails: string[];
  googleDorks: GoogleDork[];
  waybackSnapshots: WaybackSnapshot[];
  socialIntel: SocialIntel;
  certTransparency: CertTransparency[];
  infrastructure: Infrastructure;
  sensitiveExposure?: SensitiveExposure;
  employeeData?: EmployeeData[];
  publicDocuments?: PublicDocument[];
  fileMetadata?: FileMetadata[];
  mobileApps?: MobileApp[];
  internetMentions?: InternetMention[];
}