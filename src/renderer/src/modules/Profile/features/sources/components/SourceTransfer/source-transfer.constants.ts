import { ArrowRightLeft, Copy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Tone } from '../../../../shared/types/ui.types';
import type { ConflictLevel } from '../../../../shared/types';
import { TransferMode, DuplicatePolicy, RowFilter } from './source-transfer.types';

export const LAST_KEY = 'profile:transfer-last';

export const FILTERS: { id: RowFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'duplicate', label: 'Duplicates' },
  { id: 'unsynced', label: 'Unsynced' },
  { id: 'blocked', label: 'Blocked' },
];

export const MODE_META: Record<TransferMode, { title: string; tone: Tone; icon: LucideIcon; hint: string }> = {
  move: { title: 'Move to source', tone: 'info', icon: ArrowRightLeft, hint: 'Profiles leave their origin source' },
  duplicate: { title: 'Duplicate to source', tone: 'success', icon: Copy, hint: 'Origin profiles stay untouched' },
};

export const MODE_TEXT: Record<TransferMode, string> = { move: 'text-info', duplicate: 'text-success' };

export const MODE_THUMB: Record<TransferMode, string> = { move: 'bg-info/15', duplicate: 'bg-success/15' };

const FIELD_LABEL: Record<string, string> = {
  recoveryEmail: 'Recovery email',
  phone: 'Phone',
  totpSecret: 'TOTP',
  backupCodes: 'Backup codes',
  avatarUrl: 'Avatar',
};

export const POLICY_LABEL: Record<DuplicatePolicy, string> = {
  skip: 'Skip',
  merge: 'Merge',
  overwrite: 'Overwrite',
};

export const POLICY_HINT: Record<DuplicatePolicy, string> = {
  skip: 'Duplicated profiles are left untouched.',
  merge: 'Empty fields of the existing profile are filled from the selected one.',
  overwrite: 'Differing fields of the existing profile are replaced by the selected one.',
};

export const LEVEL: Record<ConflictLevel, { tone: Tone; label: string }> = {
  identical: { tone: 'muted', label: 'Identical' },
  mergeable: { tone: 'warn', label: 'Fillable' },
  conflict: { tone: 'error', label: 'Conflict' },
};

export const seg = (active: boolean): string =>
  cn(
    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
    active ? 'bg-text-secondary/15 text-text-primary' : 'text-text-secondary hover:text-text-primary',
  );

export const SOFT_TOOL_BTN =
  'flex shrink-0 items-center gap-1.5 rounded-md bg-text-secondary/10 px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';

export const labels = (keys: string[]): string => keys.map((k) => FIELD_LABEL[k] ?? k).join(', ');
