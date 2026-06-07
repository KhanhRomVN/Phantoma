// ScanDomainData Aggregate Type - imports all other types
import type { ZoneTransferResult } from './zone-transfer';
import type { DNSBruteResult } from './dns-brute';

// Domain Scan Session Types
export type ScanDomainStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface DomainScanSession {
  id: string;
  domain: string;
  status: ScanDomainStatus;
  progress: number;
  riskScore?: number;
  stats?: {
    zoneTransferSuccess: boolean;
    subdomainsResolved: number;
    totalRecords: number;
  };
}

// Main Scan Domain Data Type
export interface ScanDomainData {
  target: string;
  scanTime: string;
  zoneTransfer: ZoneTransferResult | null;
  dnsBrute: DNSBruteResult | null;
}

// Tab IDs
export type ScanSubTabId = 'overview' | 'zone-transfer' | 'dns-brute' | 'terminal';