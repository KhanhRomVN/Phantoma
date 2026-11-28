import path from 'path';
import { randomUUID } from 'crypto';
import { AppError } from '../../../utils/http';
import type { ImportFolderPreview } from '../../../services/import-preview.service';
import type { TransferItemState, TransferPhase } from '../transfers/transfer-job.service';

export interface ImportJobItem {
  id: string;
  email: string;
  bytes: number;
  state: TransferItemState;
  error?: string;
}

export interface ImportJob {
  id: string;
  phase: TransferPhase;
  totalBytes: number;
  doneBytes: number;
  items: ImportJobItem[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

export interface ImportJobInput {
  path: string;
  targetId: string;
  folders: string[];
}

export interface ProfileFolderTransferOptions {
  isCancelled: () => boolean;
  onBytes: (n: number) => void;
}

// ASSUMED: folder IO stays behind this injected object until phase 4 defines a profile-folder storage port
export interface ImportJobDeps {
  previewImportFolder: (root: string) => ImportFolderPreview;
  getSourceLocation: (sourceId: string) => string | null;
  syncSource: (sourceId: string) => Promise<unknown>;
  folders: {
    measureFolder: (root: string, folder: string, isCancelled: () => boolean) => Promise<number>;
    isChromeRoot: (root: string | null) => boolean;
    nextChromeProfileName: (root: string, reserved: Set<string>) => string;
    pickFreeFolder: (root: string, wanted: string, reserved: Set<string>) => string;
    folderNameFor: (email: string) => string;
    duplicateFolder: (
      from: { root: string; folder: string },
      to: { root: string; folder: string },
      options: ProfileFolderTransferOptions,
    ) => Promise<void>;
  };
  isCancelledError: (err: unknown) => boolean;
}

interface Entry {
  job: ImportJob;
  cancelled: boolean;
}

const KEEP_MS = 10 * 60 * 1000;

const isActive = (entry: Entry): boolean => entry.job.phase === 'scanning' || entry.job.phase === 'running';

export class ImportJobService {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly deps: ImportJobDeps) {}

  private prune(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (!isActive(entry) && entry.job.finishedAt && now - entry.job.finishedAt > KEEP_MS) this.entries.delete(id);
    }
  }

  private lookup(id: string): Entry {
    const entry = this.entries.get(id);
    if (!entry) throw new AppError('import job not found', 404);
    return entry;
  }

  private async execute(entry: Entry, input: ImportJobInput): Promise<void> {
    const { job } = entry;
    const { folders } = this.deps;
    const isCancelled = (): boolean => entry.cancelled;
    const item = (id: string): ImportJobItem | undefined => job.items.find((i) => i.id === id);
    try {
      const preview = this.deps.previewImportFolder(input.path);
      if (!preview.valid) throw new AppError(preview.reason ?? 'Cannot read this folder', 400);
      const targetRoot = this.deps.getSourceLocation(input.targetId);
      if (!targetRoot) throw new AppError('Target source has no folder', 400);
      const root = preview.container ? input.path : path.dirname(input.path);
      const wanted = new Set(input.folders);
      const rows = preview.rows.filter((r) => wanted.has(r.folder) && r.email);
      for (const row of rows) {
        const bytes = await folders.measureFolder(root, row.folder, isCancelled);
        job.items.push({ id: row.folder, email: row.email ?? '', bytes, state: 'pending' });
      }
      job.totalBytes = job.items.reduce((sum, i) => sum + i.bytes, 0);
      job.phase = 'running';

      const reserved = new Set<string>();
      const toChrome = folders.isChromeRoot(targetRoot);
      let copiedAny = false;
      for (const row of rows) {
        if (isCancelled()) {
          job.phase = 'cancelled';
          break;
        }
        const current = item(row.folder);
        if (!current) continue;
        current.state = 'active';
        let copied = 0;
        try {
          const next = toChrome
            ? folders.nextChromeProfileName(targetRoot, reserved)
            : folders.pickFreeFolder(targetRoot, folders.folderNameFor(row.email ?? row.folder), reserved);
          reserved.add(next.toLowerCase());
          await folders.duplicateFolder(
            { root, folder: row.folder },
            { root: targetRoot, folder: next },
            {
              isCancelled,
              onBytes: (n) => {
                copied += n;
                job.doneBytes = Math.min(job.totalBytes, job.doneBytes + n);
              },
            },
          );
          job.doneBytes = Math.min(job.totalBytes, job.doneBytes + Math.max(0, current.bytes - copied));
          current.state = 'transferred';
          copiedAny = true;
        } catch (err) {
          if (this.deps.isCancelledError(err)) {
            job.phase = 'cancelled';
            break;
          }
          current.state = 'failed';
          current.error = err instanceof Error ? err.message : String(err);
        }
      }
      if (copiedAny) await this.deps.syncSource(input.targetId);
      if (job.phase === 'running') job.phase = 'done';
    } catch (err) {
      if (this.deps.isCancelledError(err)) {
        job.phase = 'cancelled';
      } else {
        job.phase = 'error';
        job.error = err instanceof Error ? err.message : String(err);
      }
    } finally {
      job.items.forEach((i) => {
        if (i.state === 'active') i.state = 'pending';
      });
      job.finishedAt = Date.now();
    }
  }

  start = (input: ImportJobInput): ImportJob => {
    this.prune();
    if ([...this.entries.values()].some(isActive)) throw new AppError('Another import is already running', 409);
    const job: ImportJob = {
      id: randomUUID(),
      phase: 'scanning',
      totalBytes: 0,
      doneBytes: 0,
      items: [],
      startedAt: Date.now(),
      finishedAt: null,
      error: null,
    };
    const entry: Entry = { job, cancelled: false };
    this.entries.set(job.id, entry);
    void this.execute(entry, input);
    return job;
  };

  get = (id: string): ImportJob => this.lookup(id).job;

  cancel = (id: string): ImportJob => {
    const entry = this.lookup(id);
    if (isActive(entry)) entry.cancelled = true;
    return entry.job;
  };
}