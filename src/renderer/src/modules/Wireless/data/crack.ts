// ============================================================================
// PHANTOMA WIRELESS — Crack Jobs Tab Mock Data
// ============================================================================

import type { CrackJob } from '../types';

export const mockCrackJobs: CrackJob[] = [
  {
    id: 'cj1',
    targetSSID: 'CoffeeShop_WiFi',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    mode: 'dictionary',
    status: 'running',
    progress: 64,
    wordlist: 'rockyou.txt',
    attempts: 9179610,
    speed: 12700,
    eta: '9m 18s',
    hashFile: 'coffee_hs.cap',
    startedAt: '09:42:10',
    elapsedSeconds: 724,
  },
  {
    id: 'cj2',
    targetSSID: 'Guest_Network',
    targetBSSID: 'AA:BB:CC:DD:EE:03',
    mode: 'wep',
    status: 'completed',
    progress: 100,
    attempts: 250000,
    speed: 0,
    result: 'WEP Key: 41:42:43:44:45',
    hashFile: 'guest_wep.cap',
    startedAt: '09:25:00',
    elapsedSeconds: 38,
  },
  {
    id: 'cj3',
    targetSSID: 'Office_5G',
    targetBSSID: 'AA:BB:CC:DD:EE:02',
    mode: 'pmkid',
    status: 'completed',
    progress: 100,
    wordlist: 'rockyou.txt',
    attempts: 4218934,
    speed: 0,
    result: 'SecurePass2024!',
    hashFile: 'office.pmkid',
    startedAt: '09:10:00',
    elapsedSeconds: 312,
  },
];