import type { Profile, ProfileSource, TransferJob } from '../../../../shared/types';

export type TransferMode = 'move' | 'duplicate';

export type DuplicatePolicy = 'skip' | 'merge' | 'overwrite';

export interface TransferResult {
  mode: TransferMode;
  targetId: string;
  ids: string[];
  policy: DuplicatePolicy;
  policies: Record<string, DuplicatePolicy>;
}

export interface SourceTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  sources: ProfileSource[];
  runningIds: Set<string>;
  onFinished: (job: TransferJob | null) => Promise<void> | void;
}

export type RowFilter = 'all' | 'new' | 'duplicate' | 'unsynced' | 'blocked';

export type SortKey = 'no' | 'email' | 'folder' | 'status';

export type SortState = { key: SortKey; dir: 'asc' | 'desc' };
