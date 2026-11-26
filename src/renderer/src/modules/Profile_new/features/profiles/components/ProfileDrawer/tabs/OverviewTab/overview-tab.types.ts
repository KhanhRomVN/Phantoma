import type { ReactNode } from 'react';
import type { Profile } from '../../../../../../shared/types';
import type { LucideIcon } from 'lucide-react';
import type { Tone } from '../../../../../../shared/types/ui.types';
import type { DuplicateEntry } from '../DuplicateSection';

export interface CopyTextProps {
  value: string;
  children?: ReactNode;
  mono?: boolean;
  className?: string;
  label?: string;
}

export interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export interface Creds {
  email: string;
  recoveryEmail: string;
  phone: string;
  password: string;
}

export interface ValidationErrors {
  recoveryEmail?: string;
  phone?: string;
  password?: string;
}

export interface OverviewTabProps {
  profile: Profile;
  duplicates?: DuplicateEntry[];
  onOpenDuplicate?: (profileId: string) => void;
  onUpdate?: (patch: Partial<Profile>) => void;
  focus?: { target: string; nonce: number } | null;
  onFocusDone?: () => void;
}
