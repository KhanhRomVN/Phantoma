import type { Profile } from '../types';

export type SecurityLevel = 'critical' | 'weak' | 'fair' | 'good' | 'strong';

export interface SecurityIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
}

export interface SecurityReport {
  score: number;
  level: SecurityLevel;
  issues: SecurityIssue[];
}

export function countIpChanges(profile: Profile): number {
  return profile.footprints.filter((f) => f.changed).length;
}

const cache = new WeakMap<Profile, SecurityReport>();

export function computeSecurity(profile: Profile): SecurityReport {
  const cached = cache.get(profile);
  if (cached) return cached;

  const issues: SecurityIssue[] = [];
  let score = 100;
  const deduct = (points: number, issue: SecurityIssue): void => {
    score -= points;
    issues.push(issue);
  };

  if (!profile.totpEnabled) {
    deduct(25, { id: 'no-totp', severity: 'high', label: 'TOTP authentication is not enabled' });
  }
  if (profile.passwordStrength === 'weak') {
    deduct(20, { id: 'weak-pass', severity: 'high', label: 'Weak password' });
  } else if (profile.passwordStrength === 'medium') {
    deduct(8, { id: 'medium-pass', severity: 'low', label: 'Medium-strength password' });
  }
  if (profile.passwordReused) {
    deduct(10, { id: 'reused-pass', severity: 'high', label: 'Password is reused elsewhere' });
  }
  if (!profile.recoveryEmail) {
    deduct(15, { id: 'no-recovery', severity: 'medium', label: 'Missing recovery email' });
  }
  if (!profile.phone) {
    deduct(10, { id: 'no-phone', severity: 'medium', label: 'Missing recovery phone number' });
  }

  const backupLeft = profile.backupCodes.filter((c) => !c.used).length;
  if (backupLeft === 0) {
    deduct(10, { id: 'no-backup', severity: 'medium', label: 'No backup codes left' });
  } else if (backupLeft < 3) {
    deduct(5, { id: 'low-backup', severity: 'low', label: `Only ${backupLeft} backup codes left` });
  }

  if (profile.chromeSync !== 'synced') {
    deduct(5, {
      id: 'no-sync',
      severity: 'low',
      label:
        profile.chromeSync === 'error'
          ? 'Chrome account sync error'
          : 'Chrome account is not synced',
    });
  }

  const ipChanges = countIpChanges(profile);
  if (ipChanges >= 3) {
    deduct(10, {
      id: 'ip-hopping',
      severity: 'medium',
      label: `Frequent IP changes (${ipChanges})`,
    });
  }

  const bannedServices = profile.services.filter((s) => s.status === 'banned').length;
  if (bannedServices > 0) {
    deduct(5, {
      id: 'banned-service',
      severity: 'medium',
      label: `${bannedServices} ${bannedServices === 1 ? 'service is' : 'services are'} banned`,
    });
  }

  score = Math.max(0, Math.min(100, score));
  const level: SecurityLevel =
    score < 40 ? 'critical' : score < 60 ? 'weak' : score < 75 ? 'fair' : score < 90 ? 'good' : 'strong';

  const report: SecurityReport = { score, level, issues };
  cache.set(profile, report);
  return report;
}

export const SECURITY_LEVEL_LABEL: Record<SecurityLevel, string> = {
  critical: 'Critical',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};