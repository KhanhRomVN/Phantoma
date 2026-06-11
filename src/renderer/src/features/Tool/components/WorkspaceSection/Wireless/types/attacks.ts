// ============================================================================
// PHANTOMA WIRELESS — Attacks Tab Types
// ============================================================================

import type { AttackType, AttackStatus } from './common';

export interface ActiveAttack {
  id: string;
  type: AttackType;
  targetSSID: string;
  targetBSSID: string;
  progress: number;
  status: AttackStatus;
  result?: string;
  startedAt: string;
  elapsedSeconds: number;
  logLines: string[];
  ivsCollected?: number;
  handshakeFile?: string;
  crackedPassword?: string;
  wpsPin?: string;
}

export interface DeauthSession {
  id: string;
  targetBSSID: string;
  targetSSID: string;
  clientMAC: string;
  packetsPerSec: number;
  totalSent: number;
  status: 'running' | 'stopped';
  startedAt: string;
  reason: 'handshake' | 'evil_twin' | 'test';
}