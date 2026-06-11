// ============================================================================
// PHANTOMA WIRELESS — WPA3 / Enterprise Tab Types
// ============================================================================

export interface WPA3Result {
  ssid: string;
  bssid: string;
  wpa3Supported: boolean;
  transitionMode: boolean;
  mfpEnabled: boolean;
  vulnerableToDowngrade: boolean;
  saeHandshakeCaptured: boolean;
  notes: string[];
}

export interface EnterpriseCapture {
  id: string;
  ssid: string;
  bssid: string;
  username: string;
  domain?: string;
  mschapv2Hash: string;
  crackedPassword?: string;
  clientMac: string;
  eapMethod: string;
  timestamp: string;
}

export interface KrackResult {
  id: string;
  targetSSID: string;
  targetBSSID: string;
  clientMac: string;
  vulnerable: boolean;
  cveList: string[];
  impact: string;
  testedAt: string;
}