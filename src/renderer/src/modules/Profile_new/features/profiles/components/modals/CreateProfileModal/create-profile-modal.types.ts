import type { PasswordStrength, ProfileSource } from '../../../../../shared/types';

export interface ProfileDraft {
  sourceId: string;
  email: string;
  displayName: string;
  password: string;
  passwordStrength: PasswordStrength;
  recoveryEmail: string;
  phone: string;
  totpSecret: string;
  backupCodes: string[];
  group: string;
  purpose: string;
  notes: string;
}

export interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ProfileSource[];
  defaultSourceId: string;
  groups: string[];
  existingEmails: string[];
  onCreate: (draft: ProfileDraft) => void;
}

export interface FormState {
  sourceId: string;
  email: string;
  displayName: string;
  password: string;
  recoveryEmail: string;
  phone: string;
  totpSecret: string;
  codes: string[];
}
