import type { LucideIcon } from 'lucide-react';
import { Ban, CheckCircle2, KeyRound, Lock, MailX, PauseCircle, ShieldAlert, Smartphone, Trash2 } from 'lucide-react';
import type { ProfileStatus } from '../../../shared/types';
import type { Tone } from '../../../shared/types/ui.types';

export const PROFILE_STATUS: Record<ProfileStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  checkpoint: { label: 'Checkpoint', tone: 'warn', icon: ShieldAlert },
  verification: { label: 'Verification', tone: 'warn', icon: KeyRound },
  totp_lost: { label: 'TOTP lost', tone: 'warn', icon: Smartphone },
  recovery_lost: { label: 'Recovery lost', tone: 'warn', icon: MailX },
  locked: { label: 'Locked', tone: 'warn', icon: Lock },
  suspended: { label: 'Suspended', tone: 'info', icon: PauseCircle },
  banned: { label: 'Banned', tone: 'error', icon: Ban },
  deleted: { label: 'Deleted', tone: 'muted', icon: Trash2 },
};

export const PROFILE_STATUS_ORDER: ProfileStatus[] = [
  'active',
  'checkpoint',
  'verification',
  'totp_lost',
  'recovery_lost',
  'locked',
  'suspended',
  'banned',
  'deleted',
];
