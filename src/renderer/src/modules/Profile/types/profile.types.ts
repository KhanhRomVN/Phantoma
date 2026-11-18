import type {
  BrowsingEntry,
  DeviceActivity,
  NetworkFootprint,
  ScriptRun,
} from './activity.types';
import type { ServiceLink } from './service.types';

export type ProfileStatus =
  | 'active'
  | 'checkpoint'
  | 'verification'
  | 'totp_lost'
  | 'recovery_lost'
  | 'locked'
  | 'suspended'
  | 'banned'
  | 'deleted';
export type SyncState = 'synced' | 'unsynced' | 'error';
export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface BackupCode {
  code: string;
  used: boolean;
}

export interface Profile {
  id: string;
  sourceId: string;
  email: string;
  displayName: string;
  avatarHue: number;
  avatarUrl?: string | null;
  recoveryEmail: string | null;
  phone: string | null;
  totpEnabled: boolean;
  totpSecret: string | null;
  backupCodes: BackupCode[];
  password?: string | null;
  passwordStrength: PasswordStrength;
  passwordReused: boolean;
  hasPassword?: boolean;
  group: string;
  purpose: string;
  status: ProfileStatus;
  statusNote?: string;
  chromeSync: SyncState;
  chromeProfile: string | null;
  createdAt: string;
  lastActive: string;
  notes: string;
  services: ServiceLink[];
  footprints: NetworkFootprint[];
  browsing: BrowsingEntry[];
  scripts: ScriptRun[];
  devices: DeviceActivity[];
}