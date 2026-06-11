// ============================================================================
// PHANTOMA WIRELESS — Evil Twin Tab Types
// ============================================================================

export interface EvilTwinSession {
  id: string;
  ssid: string;
  fakeBSSID: string;
  channel: number;
  targetBSSID: string;
  clientsConnected: number;
  credentials: HarvestedCred[];
  uptimeSeconds: number;
  deauthSent: number;
  handshakesCollected: number;
  status: 'active' | 'stopped';
  portalType: 'generic' | 'isp' | 'router_admin' | 'corporate';
}

export interface HarvestedCred {
  username: string;
  password: string;
  clientMac: string;
  clientVendor: string;
  timestamp: string;
  ipAddress: string;
}