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
  PauseCircle,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { ServiceStatus } from '../../../shared/types';
import type { Tone } from '../../../shared/types/ui.types';

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
