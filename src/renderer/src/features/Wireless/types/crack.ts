// ============================================================================
// PHANTOMA WIRELESS — Crack Jobs Tab Types
// ============================================================================

import type { AttackStatus } from './common';

export interface CrackJob {
  id: string;
  targetSSID: string;
  targetBSSID: string;
  mode: 'dictionary' | 'bruteforce' | 'pmkid' | 'wep' | 'sae' | 'ntlm';
  status: AttackStatus;
  progress: number;
  wordlist?: string;
  attempts: number;
  speed: number;
  eta?: string;
  result?: string;
  hashFile?: string;
  startedAt: string;
  elapsedSeconds: number;
}