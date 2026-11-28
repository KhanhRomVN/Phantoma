export type SourceType = 'local' | 'cloud' | 'file';

export type BrowserEngine = 'chrome' | 'chromium';

export interface ProfileSource {
  id: string;
  name: string;
  type: SourceType;
  browsers: BrowserEngine[];
  description: string;
  location?: string;
  count: number;
  lastSync: string;
  online: boolean;
}

export interface SourceStats {
  active: number;
  avgSecurity: number;
  lowSecurity: number;
  unsynced: number;
  bannedServices: number;
}

export type SourceInput = Partial<Omit<ProfileSource, 'id' | 'count'>>;

export type ConflictLevel = 'identical' | 'mergeable' | 'conflict';

export interface TransferPlanItem {
  id: string;
  email: string;
  oldFolder: string;
  newFolder: string;
  folderRule: 'email' | 'chrome';
  blocked: string | null;
  conflict: {
    targetId: string;
    targetFolder: string;
    level: ConflictLevel;
    fillable: string[];
    differing: string[];
  } | null;
}

export interface TransferOutcome {
  transferred: number;
  merged: number;
  skipped: number;
  failed: { id: string; email: string; error: string }[];
}

export type TransferPhase = 'scanning' | 'running' | 'done' | 'cancelled' | 'error';

export type TransferItemState = 'pending' | 'active' | 'transferred' | 'merged' | 'skipped' | 'failed';

export interface TransferJobItem {
  id: string;
  email: string;
  bytes: number;
  state: TransferItemState;
  error?: string;
}

export interface TransferJob {
  id: string;
  mode: 'move' | 'duplicate';
  phase: TransferPhase;
  totalBytes: number;
  doneBytes: number;
  items: TransferJobItem[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

export interface SourcePreviewProfile {
  folder: string;
  email: string | null;
  name: string;
  hasEmail: boolean;
  synced: boolean;
}

export interface SourcePreview {
  valid: boolean;
  reason?: string;
  total: number;
  withEmail: number;
  profiles: SourcePreviewProfile[];
}

export interface ImportFolderRow {
  folder: string;
  email: string | null;
  sync: 'synced' | 'unsynced' | 'error';
}

export interface ImportFolderPreview {
  valid: boolean;
  reason?: string;
  container: boolean;
  rows: ImportFolderRow[];
}

export interface ImportBackupRow {
  email: string;
  displayName: string | null;
  recoveryEmail: string | null;
  phone: string | null;
  totp: string | null;
  backupCodes: string[];
  services: number;
}

export type ImportFileResult = { kind: 'text'; text: string } | { kind: 'backup'; rows: ImportBackupRow[] };

export interface ImportJob {
  id: string;
  phase: TransferPhase;
  totalBytes: number;
  doneBytes: number;
  items: TransferJobItem[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}
