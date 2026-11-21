import path from 'path';
import { randomUUID } from 'crypto';
import { sourceRepository } from '../repositories/service.repository';
import {
  TransferCancelled,
  folderNameFor,
  isChromeRoot,
  measureFolder,
  nextChromeProfileName,
  pickFreeFolder,
  transferProfileFolder,
} from '../utils/browser-folder';
import { AppError } from '../utils/http';
import { previewImportFolder } from './import-preview.service';
import { sourceService } from './source.service';
import type { TransferItemState, TransferPhase } from './transfer-job.service';

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

interface Entry {
  job: ImportJob;
  cancelled: boolean;
}

const KEEP_MS = 10 * 60 * 1000;
const entries = new Map<string, Entry>();

const isActive = (entry: Entry): boolean => entry.job.phase === 'scanning' || entry.job.phase === 'running';

function prune(): void {
  const now = Date.now();
  for (const [id, entry] of entries) {
    if (!isActive(entry) && entry.job.finishedAt && now - entry.job.finishedAt > KEEP_MS) entries.delete(id);
  }
}

function lookup(id: string): Entry {
  const entry = entries.get(id);
  if (!entry) throw new AppError('import job not found', 404);
  return entry;
}

async function execute(entry: Entry, input: ImportJobInput): Promise<void> {
  const { job } = entry;
  const isCancelled = (): boolean => entry.cancelled;
  const item = (id: string): ImportJobItem | undefined => job.items.find((i) => i.id === id);
  try {
    const preview = previewImportFolder(input.path);
    if (!preview.valid) throw new AppError(preview.reason ?? 'Cannot read this folder', 400);
    const targetRoot = sourceRepository.getById(input.targetId)?.location ?? null;
    if (!targetRoot) throw new AppError('Target source has no folder', 400);
    const root = preview.container ? input.path : path.dirname(input.path);
    const wanted = new Set(input.folders);
    const rows = preview.rows.filter((r) => wanted.has(r.folder) && r.email);
    for (const row of rows) {
      const bytes = await measureFolder(root, row.folder, isCancelled);
      job.items.push({ id: row.folder, email: row.email ?? '', bytes, state: 'pending' });
    }
    job.totalBytes = job.items.reduce((sum, i) => sum + i.bytes, 0);
    job.phase = 'running';

    const reserved = new Set<string>();
    const toChrome = isChromeRoot(targetRoot);
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
          ? nextChromeProfileName(targetRoot, reserved)
          : pickFreeFolder(targetRoot, folderNameFor(row.email ?? row.folder), reserved);
        reserved.add(next.toLowerCase());
        await transferProfileFolder(
          'duplicate',
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
        if (err instanceof TransferCancelled) {
          job.phase = 'cancelled';
          break;
        }
        current.state = 'failed';
        current.error = err instanceof Error ? err.message : String(err);
      }
    }
    if (copiedAny) await sourceService.sync(input.targetId);
    if (job.phase === 'running') job.phase = 'done';
  } catch (err) {
    if (err instanceof TransferCancelled) {
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

function start(input: ImportJobInput): ImportJob {
  prune();
  if ([...entries.values()].some(isActive)) throw new AppError('Another import is already running', 409);
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
  entries.set(job.id, entry);
  void execute(entry, input);
  return job;
}

function get(id: string): ImportJob {
  return lookup(id).job;
}

function cancel(id: string): ImportJob {
  const entry = lookup(id);
  if (isActive(entry)) entry.cancelled = true;
  return entry.job;
}

export const importJobService = { start, get, cancel };