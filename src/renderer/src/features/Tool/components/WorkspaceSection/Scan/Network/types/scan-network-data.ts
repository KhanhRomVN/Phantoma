// ScanNetworkData Aggregate Type - imports all other types
import type { PingSweepResult } from './ping-sweep';
import type { PortScanResult } from './port-scan';
import type { ServiceDetectionResult } from './service-detection';
import type { OSFingerprintResult } from './os-fingerprint';

// Network Scan Session Types
export type ScanNetworkStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface NetworkScanSession {
  id: string;
  target: string;
  status: ScanNetworkStatus;
  progress: number;
  riskScore?: number;
  stats?: {
    liveHosts: number;
    openPorts: number;
    servicesIdentified: number;
    osAccuracy: number;
  };
}

// Main Scan Network Data Type
export interface ScanNetworkData {
  target: string;
  scanTime: string;
  pingSweep: PingSweepResult | null;
  portScan: PortScanResult | null;
  serviceDetection: ServiceDetectionResult | null;
  osFingerprint: OSFingerprintResult | null;
}

// Tab IDs
export type ScanNetworkSubTabId = 'overview' | 'ping-sweep' | 'port-scan' | 'service-detection' | 'os-fingerprint' | 'terminal';