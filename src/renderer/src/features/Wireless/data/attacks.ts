// ============================================================================
// PHANTOMA WIRELESS — Attacks Tab Mock Data
// ============================================================================

import type { ActiveAttack, DeauthSession } from '../types';

export const mockActiveAttacks: ActiveAttack[] = [
  {
    id: 'atk1',
    type: 'dictionary_crack',
    targetSSID: 'CoffeeShop_WiFi',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    progress: 64,
    status: 'running',
    startedAt: '09:42:10',
    elapsedSeconds: 724,
    logLines: [
      'Starting aircrack-ng with rockyou.txt...',
      'Wordlist: 14,344,391 entries',
      'Testing password 9,179,610 / 14,344,391...',
      'Speed: 12,700 keys/sec',
    ],
    handshakeFile: 'coffee_hs.cap',
  },
  {
    id: 'atk2',
    type: 'wps_pixie',
    targetSSID: 'IoT_Device_789',
    targetBSSID: 'AA:BB:CC:DD:EE:08',
    progress: 100,
    status: 'completed',
    result: 'PIN: 98765430 → SmartHome2024',
    startedAt: '09:30:05',
    elapsedSeconds: 48,
    logLines: [
      'Launching Pixie Dust (reaver -K 1)...',
      'Sending M1...',
      'WPS PIN found: 98765430',
      'PSK recovered: SmartHome2024',
    ],
    wpsPin: '98765430',
    crackedPassword: 'SmartHome2024',
  },
  {
    id: 'atk3',
    type: 'handshake_capture',
    targetSSID: 'Huawei-5G-1234',
    targetBSSID: 'AA:BB:CC:DD:EE:04',
    progress: 0,
    status: 'queued',
    startedAt: '09:54:10',
    elapsedSeconds: 0,
    logLines: ['Queued — waiting for active scan to complete...'],
  },
];

export const mockDeauthSessions: DeauthSession[] = [
  {
    id: 'da1',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    targetSSID: 'CoffeeShop_WiFi',
    clientMAC: 'FF:FF:FF:FF:FF:FF',
    packetsPerSec: 5,
    totalSent: 3620,
    status: 'running',
    startedAt: '09:42:05',
    reason: 'handshake',
  },
  {
    id: 'da2',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    targetSSID: 'CoffeeShop_WiFi',
    clientMAC: 'F0:1F:AF:11:22:33',
    packetsPerSec: 2,
    totalSent: 860,
    status: 'stopped',
    startedAt: '09:44:22',
    reason: 'evil_twin',
  },
];