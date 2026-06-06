// ReconData Aggregate Type - imports all other types
import type { DNSRecords } from './dns';
import type { WhoisData } from './identity';
import type { Subdomain } from './subdomain';
import type { Infrastructure } from './infrastructure';
import type { Port } from './service';
import type { TechStack } from './technology';
import type { Vulnerability } from './vulnerability';
import type { Breach, GoogleDork, WaybackSnapshot, SocialIntel } from './osint';

// Domain Session Types
export type DomainStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface DomainSession {
  id: string;
  domain: string;
  ip?: string;
  status: DomainStatus;
  progress: number;
  riskScore?: number;
  stats?: {
    openPorts: number;
    subdomains: number;
    vulns: number;
    breaches: number;
    secrets: number;
  };
}

// Shared types
export interface RiskScore {
  total: number;
  breakdown: {
    network: number;
    breach: number;
    exposure: number;
    reputation: number;
  };
}

export interface CloudAsset {
  type: string;
  name: string;
  region?: string;
  public?: boolean;
  ip?: string;
  status?: string;
  risk?: string;
  perm?: string;
  files?: string[];
}

export interface CodeRepo {
  platform: string;
  repo: string;
  visibility: string;
  secrets?: string[];
}

export interface ThreatIntel {
  indicator: string;
  type: string;
  reputation: string;
  reports: string[];
}

export interface CertTransparency {
  issuer: string;
  validFrom: string;
  validTo: string;
  domains: string[];
}

export interface HttpHeaders {
  server: string;
  'x-frame-options'?: string;
  'x-content-type-options'?: string;
  'strict-transport-security'?: string;
  [key: string]: string | undefined;
}

// Main Recon Data Type
export interface ReconData {
  target: string;
  targetIp: string;
  scanTime: string;
  dnsRecords: DNSRecords;
  ports: Port[];
  vulns: Vulnerability[];
  subdomains: Subdomain[];
  techStack: TechStack;
  riskScore: RiskScore;
  whoisData: WhoisData;
  breaches: Breach[];
  harvestedEmails: string[];
  cloudAssets: CloudAsset[];
  codeRepos: CodeRepo[];
  darkWebLeaks: unknown[];
  googleDorks: GoogleDork[];
  waybackSnapshots: WaybackSnapshot[];
  threatIntel: ThreatIntel[];
  socialIntel: SocialIntel;
  certTransparency: CertTransparency[];
  httpHeaders: HttpHeaders;
  infrastructure: Infrastructure;
}