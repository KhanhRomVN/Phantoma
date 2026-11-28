import { randomUUID } from 'crypto';
import { AppError } from '../../../utils/http';
import type { TransferInput, TransferOutcome, TransferRun } from '../profiles/profile.service';

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

// ASSUMED: transfer types still come from the legacy email.service until phase 4 moves them to the domain
export interface TransferJobDeps {
  transfer: (input: TransferInput, run: TransferRun) => Promise<TransferOutcome>;
  isCancelledError: (err: unknown) => boolean;
}

interface Entry {
  job: TransferJob;
  cancelled: boolean;
}

const KEEP_MS = 10 * 60 * 1000;

const isActive = (entry: Entry): boolean => entry.job.phase === 'scanning' || entry.job.phase === 'running';

export class TransferJobService {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly deps: TransferJobDeps) {}

  private prune(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (!isActive(entry) && entry.job.finishedAt && now - entry.job.finishedAt > KEEP_MS) this.entries.delete(id);
    }
  }

  private lookup(id: string): Entry {
    const entry = this.entries.get(id);
    if (!entry) throw new AppError('transfer job not found', 404);
    return entry;
  }

  private async execute(entry: Entry, input: TransferInput): Promise<void> {
    const { job } = entry;
    const item = (id: string): TransferJobItem | undefined => job.items.find((i) => i.id === id);
    try {
      job.outcome = await this.deps.transfer(input, {
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

  start = (input: TransferInput): TransferJob => {
    this.prune();
    if ([...this.entries.values()].some(isActive)) throw new AppError('Another transfer is already running', 409);
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
    this.entries.set(job.id, entry);
    void this.execute(entry, input);
    return job;
  };

  get = (id: string): TransferJob => this.lookup(id).job;

  cancel = (id: string): TransferJob => {
    const entry = this.lookup(id);
    if (isActive(entry)) entry.cancelled = true;
    return entry.job;
  };
}