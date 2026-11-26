import type { LucideIcon } from 'lucide-react';
import type { ProfileSource, SyncState } from '../../../../../shared/types';
import type { Tone } from '../../../../../shared/types/ui.types';
import type { ProfileDraft } from '../CreateProfileModal/create-profile-modal.types';

export type ImportRowDraft = Omit<ProfileDraft, 'sourceId'>;

export type ImportTarget = { kind: 'existing'; sourceId: string } | { kind: 'new'; name: string };

export interface ImportResult {
  rows: ImportRowDraft[];
  target: ImportTarget;
}

export interface ImportProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ProfileSource[];
  defaultSourceId: string;
  existingEmails: string[];
  onImport: (result: ImportResult) => void;
  onImported: () => void;
}

export type Method = 'folder' | 'file';

export type RowStatus = 'new' | 'duplicate' | 'invalid';

export type RowFilter = 'all' | 'new' | 'duplicate' | 'unsynced' | 'invalid';

export type Column =
  | 'email'
  | 'password'
  | 'recoveryEmail'
  | 'phone'
  | 'totpSecret'
  | 'backupCodes'
  | 'displayName'
  | 'group';

export interface RawRow {
  key: string;
  draft: ImportRowDraft;
  folder?: string;
  sync?: SyncState;
  detail?: string;
  invalid?: string | null;
}

export interface PreviewRow extends RawRow {
  status: RowStatus;
  reason: string | null;
  nextFolder: string | null;
}

export interface MethodMeta {
  id: Method;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint: string;
  card: string;
  dropTitle: string;
  dropHint: string;
  info: string;
}
