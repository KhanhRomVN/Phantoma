import { AlertCircle, FileDiff, FileMinus2, FilePlus2 } from 'lucide-react';
import { FileStatus } from '../types/sync-branch.types';

export const BRANCH_PILL =
  'flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 text-left text-[14px] text-text-primary transition-colors hover:bg-text-secondary/10 disabled:cursor-default disabled:hover:bg-transparent';

export const STATUS_META: Record<FileStatus, { icon: typeof FileDiff; cls: string; label: string }> = {
  added: { icon: FilePlus2, cls: 'text-success', label: 'Added' },
  modified: { icon: FileDiff, cls: 'text-warn', label: 'Modified' },
  deleted: { icon: FileMinus2, cls: 'text-error', label: 'Deleted' },
};

export const WARNING_TONES = {
  primary: { badge: 'bg-primary/20 text-primary', title: 'text-primary', icon: FileDiff },
  warn: { badge: 'bg-warn/20 text-warn', title: 'text-warn', icon: AlertCircle },
  error: { badge: 'bg-error/20 text-error', title: 'text-error', icon: FileMinus2 },
};
