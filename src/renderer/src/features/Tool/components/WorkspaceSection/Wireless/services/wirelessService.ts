// ============================================================================
// PHANTOMA WIRELESS — Service Layer
// Provides simulation helpers and placeholder for future backend integration.
// ============================================================================

import type { WiFiNetwork, ActiveAttack, EvilTwinSession, CrackJob } from '../types';

/**
 * Simulate attack progress tick — advances running attacks by one step.
 */
export function tickAttackProgress(attacks: ActiveAttack[]): ActiveAttack[] {
  return attacks.map((atk) => {
    if (atk.status !== 'running') return atk;
    const newProg = Math.min(atk.progress + Math.random() * 2.5, 100);
    return { ...atk, progress: Math.round(newProg), elapsedSeconds: atk.elapsedSeconds + 1 };
  });
}

/**
 * Simulate crack job progress tick.
 */
export function tickCrackProgress(jobs: CrackJob[]): CrackJob[] {
  return jobs.map((job) => {
    if (job.status !== 'running') return job;
    const newProg = Math.min(job.progress + Math.random() * 1.2, 100);
    return {
      ...job,
      progress: Math.round(newProg),
      elapsedSeconds: job.elapsedSeconds + 1,
      attempts: job.attempts + Math.floor(job.speed / 2),
    };
  });
}

/**
 * Simulate Evil Twin uptime tick.
 */
export function tickEvilTwinUptime(sessions: EvilTwinSession[]): EvilTwinSession[] {
  return sessions.map((s) =>
    s.status === 'active' ? { ...s, uptimeSeconds: s.uptimeSeconds + 1 } : s,
  );
}

/**
 * Generate a random spoofed MAC address.
 */
export function generateRandomMac(): string {
  return `${['02', '06', '0A', '0E'][Math.floor(Math.random() * 4)]}:${Array(5)
    .fill(0)
    .map(() =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase(),
    )
    .join(':')}`;
}

/**
 * Generate a fake BSSID for Evil Twin AP.
 */
export function generateFakeBssid(): string {
  return `DE:AD:${Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')
    .match(/../g)!
    .join(':')}`;
}

/**
 * Placeholder: Execute a real WiFi scan via backend IPC.
 * Currently returns mock data.
 */
export async function executeScan(_config: {
  interface: string;
  channel: number | 'all';
  band: string;
}): Promise<WiFiNetwork[]> {
  // TODO: Integrate with actual airodump-ng backend via IPC
  throw new Error('Real scan not yet implemented — use mock data.');
}

/**
 * Placeholder: Start handshake capture via backend.
 */
export async function startHandshakeCapture(_bssid: string, _channel: number): Promise<string> {
  // TODO: Integrate with actual airodump-ng + aireplay-ng
  throw new Error('Handshake capture not yet implemented — use mock flow.');
}