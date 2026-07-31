// ============================================================================
// PHANTOMA WIRELESS — WPA3 / Enterprise Tab Mock Data
// ============================================================================

import type { WPA3Result, EnterpriseCapture, KrackResult } from '../types';

export const mockWPA3Results: WPA3Result[] = [
  {
    ssid: 'WPA3_Transition',
    bssid: 'AA:BB:CC:DD:EE:10',
    wpa3Supported: true,
    transitionMode: true,
    mfpEnabled: true,
    vulnerableToDowngrade: true,
    saeHandshakeCaptured: false,
    notes: [
      'Transition mode detected → downgrade to WPA2 possible',
      'MFP enabled but not mandatory (MFPC=1, MFPR=0)',
      'SAE handshake not captured yet',
    ],
  },
];

export const mockEntCaptures: EnterpriseCapture[] = [
  {
    id: 'ec1',
    ssid: 'Corp_WPA_Enterprise',
    bssid: 'AA:BB:CC:DD:EE:09',
    username: 'jsmith',
    domain: 'CORP',
    mschapv2Hash: '5B5D7C7D0D3A66B3C2C5C1F1E9B9A8A7:...',
    crackedPassword: undefined,
    clientMac: '90:B0:ED:CC:DD:EE',
    eapMethod: 'PEAP/MSCHAPv2',
    timestamp: '09:51:33',
  },
];

export const mockKrackResults: KrackResult[] = [
  {
    id: 'kr1',
    targetSSID: 'Corp_WPA_Enterprise',
    targetBSSID: 'AA:BB:CC:DD:EE:09',
    clientMac: '90:B0:ED:CC:DD:EE',
    vulnerable: true,
    cveList: ['CVE-2017-13077', 'CVE-2017-13080'],
    impact: 'Key reinstallation in 4-way handshake — decrypt & replay possible',
    testedAt: '09:48:20',
  },
];