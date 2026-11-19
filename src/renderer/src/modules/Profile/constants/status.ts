import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  EyeOff,
  Flag,
  KeyRound,
  Lock,
  MailX,
  PauseCircle,
  ShieldAlert,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { ProfileStatus, ScriptStatus, ServiceStatus, SyncState } from '../types';
import type { Tone } from '../types/ui.types';

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

export interface ServiceStatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  desc: string;
}

export const SERVICE_STATUS: Record<ServiceStatus, ServiceStatusMeta> = {
  active: { label: 'Active', tone: 'success', icon: CheckCircle2, desc: 'Working normally' },
  pending: { label: 'Pending', tone: 'info', icon: Clock, desc: 'Waiting for approval or activation' },
  limited: { label: 'Limited', tone: 'warn', icon: AlertTriangle, desc: 'Some features or reach are restricted' },
  checkpoint: { label: 'Checkpoint', tone: 'warn', icon: ShieldAlert, desc: 'Security challenge required to continue' },
  verification: { label: 'Verification', tone: 'warn', icon: KeyRound, desc: 'Phone, ID or email verification required' },
  locked: { label: 'Locked', tone: 'warn', icon: Lock, desc: 'Temporarily locked, can be unlocked' },
  suspended: { label: 'Suspended', tone: 'info', icon: PauseCircle, desc: 'Suspended, an appeal may be possible' },
  shadowbanned: { label: 'Shadowbanned', tone: 'error', icon: EyeOff, desc: 'Content silently hidden from others' },
  compromised: { label: 'Compromised', tone: 'error', icon: Flag, desc: 'Hacked or credentials leaked' },
  banned: { label: 'Banned', tone: 'error', icon: Ban, desc: 'Permanently banned by the service' },
  deleted: { label: 'Deleted', tone: 'muted', icon: Trash2, desc: 'Account removed' },
};

export const SYNC_STATUS: Record<SyncState, { label: string; tone: Tone }> = {
  synced: { label: 'Synced', tone: 'success' },
  unsynced: { label: 'Not synced', tone: 'warn' },
  error: { label: 'Sync error', tone: 'error' },
};

export const SCRIPT_STATUS: Record<ScriptStatus, { label: string; tone: Tone }> = {
  success: { label: 'Success', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
  running: { label: 'Running', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};