// ============================================================================
// PHANTOMA WIRELESS — Evil Twin Tab Mock Data
// ============================================================================

import type { EvilTwinSession } from '../types';

export const mockEvilTwinSessions: EvilTwinSession[] = [
  {
    id: 'et1',
    ssid: 'CoffeeShop_WiFi',
    fakeBSSID: 'DE:AD:BE:EF:CA:FE',
    channel: 6,
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    clientsConnected: 2,
    deauthSent: 14,
    handshakesCollected: 1,
    uptimeSeconds: 754,
    status: 'active',
    portalType: 'generic',
    credentials: [
      {
        username: 'john.doe',
        password: 'password123',
        clientMac: 'F0:1F:AF:11:22:33',
        clientVendor: 'Apple',
        timestamp: '09:45:23',
        ipAddress: '192.168.1.102',
      },
      {
        username: 'guest_user',
        password: 'welcome2024',
        clientMac: '4C:32:75:AA:BB:CC',
        clientVendor: 'Samsung',
        timestamp: '09:52:10',
        ipAddress: '192.168.1.103',
      },
    ],
  },
];