// ScanWebsiteData Aggregate Type
import type { FuzzScanResult } from './fuzz';
import type { VulnScanResult } from './vuln-scan';
import type { SSLTestResult } from './ssl-test';
import type { HeadersResult } from './headers';

// Website Scan Session Types
export type ScanWebsiteStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface WebsiteScanSession {
  id: string;
  url: string;
  status: ScanWebsiteStatus;
  progress: number;
  riskScore?: number;
  stats?: {
    directoriesFound: number;
    vulnerabilities: number;
    sslGrade: string;
    headersPassed: number;
  };
}

// Main Scan Website Data Type
export interface ScanWebsiteData {
  target: string;
  scanTime: string;
  fuzz: FuzzScanResult | null;
  vulnScan: VulnScanResult | null;
  sslTest: SSLTestResult | null;
  headers: HeadersResult | null;
}

// Tab IDs
export type ScanWebsiteSubTabId = 'overview' | 'directory-fuzz' | 'vuln-scan' | 'ssl-test' | 'headers' | 'terminal';