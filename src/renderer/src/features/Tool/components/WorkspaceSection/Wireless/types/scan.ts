// ============================================================================
// PHANTOMA WIRELESS — Scan Tab Types
// ============================================================================

import type { Encryption } from './common';

export interface WiFiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  channel: number;
  band: '2.4GHz' | '5GHz' | '6GHz';
  encryption: Encryption;
  signal: number;
  noise: number;
  quality: number;
  wps: boolean;
  wpsLocked: boolean;
  wpsVulnerable: boolean;
  wpsPin?: string;
  mfpEnabled: boolean;
  transitionMode: boolean;
  hidden: boolean;
  vendor: string;
  clients: WiFiClient[];
  handshakeCaptured: boolean;
  handshakeFile?: string;
  pmkidCaptured: boolean;
  pmkidFile?: string;
  crackedPassword?: string;
  crackAttempts?: number;
  crackTimeElapsed?: number;
  crackProbability: number;
  eapType?: string;
  krackVulnerable?: boolean;
  lastSeen: string;
  firstSeen: string;
  beaconCount: number;
}

export interface WiFiClient {
  mac: string;
  vendor: string;
  signal: number;
  packets: number;
  probes: string[];
}

export interface ScanConfig {
  interface: string;
  channel: number | 'all';
  band: '2.4' | '5' | '6' | 'all';
  timeout: number;
  saveCapture: boolean;
}

export interface ProbeEntry {
  mac: string;
  vendor: string;
  ssid: string;
  signal: number;
  timestamp: string;
  count: number;
}