// ============================================================================
// PHANTOMA WIRELESS — MAC Spoof Tab Mock Data
// ============================================================================

import type { MacEntry } from '../types';

export const mockMacEntries: MacEntry[] = [
  {
    id: 'mac1',
    interface: 'wlan0',
    originalMac: 'B4:2E:99:01:23:45',
    currentMac: 'DE:AD:BE:EF:00:01',
    spoofed: true,
    timestamp: '09:30:00',
    reason: 'Bypass MAC filter on Office_5G',
  },
];