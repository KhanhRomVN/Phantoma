import { randomUUID } from 'crypto';
import { TransferCancelled } from '../utils/browser-folder';
import { AppError } from '../utils/http';
import { emailService, type TransferInput, type TransferOutcome } from './email.service';

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
  mode: TransferInput['mode'];
  phase: TransferPhase;
  totalBytes: number;
  doneBytes: number;
  items: TransferJobItem[];
  startedAt: number;
  finishedAt: number | null;
  outcome: TransferOutcome | null;
  error: string | null;
}

interface Entry {
  job: TransferJob;
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
  if (!entry) throw new AppError('transfer job not found', 404);
  return entry;
}

async function execute(entry: Entry, input: TransferInput): Promise<void> {
  const { job } = entry;
  const item = (id: string): TransferJobItem | undefined => job.items.find((i) => i.id === id);
  try {
    job.outcome = await emailService.transfer(input, {
      isCancelled: () => entry.cancelled,
      onPlan: (plan) => {
        job.items = plan.map((p) => ({ ...p, state: 'pending' as const }));
        job.totalBytes = plan.reduce((sum, p) => sum + p.bytes, 0);
        job.phase = 'running';
      },
      onItemStart: (id) => {
        const target = item(id);
        if (target) target.state = 'active';
      },
      onBytes: (n) => {
        job.doneBytes = Math.min(job.totalBytes, job.doneBytes + n);
      },
      onItemDone: (id, state, error) => {
        const target = item(id);
        if (!target) return;
        target.state = state;
        target.error = error;
      },
    });
    job.phase = job.outcome.cancelled ? 'cancelled' : 'done';
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

function start(input: TransferInput): TransferJob {
  prune();
  if ([...entries.values()].some(isActive)) throw new AppError('Another transfer is already running', 409);
  const job: TransferJob = {
    id: randomUUID(),
    mode: input.mode,
    phase: 'scanning',
    totalBytes: 0,
    doneBytes: 0,
    items: [],
    startedAt: Date.now(),
    finishedAt: null,
    outcome: null,
    error: null,
  };
  const entry: Entry = { job, cancelled: false };
  entries.set(job.id, entry);
  void execute(entry, input);
  return job;
}

function get(id: string): TransferJob {
  return lookup(id).job;
}

function cancel(id: string): TransferJob {
  const entry = lookup(id);
  if (isActive(entry)) entry.cancelled = true;
  return entry.job;
}

export const transferJobService = { start, get, cancel };