import { useEffect, useRef, useState } from 'react';
import { Loader2, Square } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

import { profileApi } from '../../../../../shared/api/profile.api';
import { toastService } from '@renderer/components/ui/Toast';
import type { ImportJob } from '../../../../../shared/types';
import { Ring, Stat, StateIcon, formatBytes, formatDuration } from '../../../../sources';

interface ImportProgressModalProps {
  isOpen: boolean;
  path: string;
  targetId: string;
  targetName: string;
  folders: string[];
  onFinished: (job: ImportJob | null) => void;
}

const POLL_MS = 300;
import { MAX_POLL_FAILURES } from '@renderer/modules/Profile/shared/constants/poll.constants';
const GREEN = { from: '150 70% 48%', to: '178 72% 46%' };
const VIOLET = { from: '265 82% 64%', to: '218 88% 62%' };
const AMBER = { from: '38 92% 56%', to: '22 92% 56%' };
const RED = { from: '0 82% 62%', to: '338 80% 58%' };

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
const footerBtn = 'flex h-[42px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-40';

export function ImportProgressModal({ isOpen, path, targetId, targetName, folders, onFinished }: ImportProgressModalProps) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);
  const samples = useRef<{ t: number; b: number }[]>([]);
  const failures = useRef(0);
  const activeRow = useRef<HTMLLIElement | null>(null);
  const jobId = job?.id;
  const phase = job?.phase;
  const live = phase === 'scanning' || phase === 'running';

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    profileApi.profiles.importJob
      .start({ path, targetId, folders })
      .then(setJob)
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setStartError(message);
        toastService.show({ variant: 'error', title: 'Import failed to start', description: message });
      });
  }, [path, targetId, folders]);

  useEffect(() => {
    if (!jobId || !live) return;
    let stopped = false;
    const tick = async (): Promise<void> => {
      try {
        const next = await profileApi.profiles.importJob.get(jobId);
        if (stopped) return;
        failures.current = 0;
        const t = Date.now();
        samples.current = [...samples.current, { t, b: next.doneBytes }].filter((s) => t - s.t <= 4000);
        const first = samples.current[0];
        const dt = (t - first.t) / 1000;
        setSpeed(dt >= 0.6 ? Math.max(0, (next.doneBytes - first.b) / dt) : null);
        setNow(t);
        setJob(next);
        if (next.phase !== 'scanning' && next.phase !== 'running') {
          const failedCount = next.items.filter((i) => i.state === 'failed').length;
          toastService.show(
            next.phase === 'error'
              ? { id: 'profile-import-job', variant: 'error', title: 'Import failed', description: next.error ?? undefined }
              : next.phase === 'cancelled'
                ? { id: 'profile-import-job', variant: 'warning', title: 'Import cancelled' }
                : failedCount > 0
                  ? {
                      id: 'profile-import-job',
                      variant: 'warning',
                      title: 'Import finished with errors',
                      description: `${failedCount} item${failedCount === 1 ? '' : 's'} failed`,
                    }
                  : { id: 'profile-import-job', variant: 'success', title: 'Import complete', description: targetName },
          );
        }
      } catch {
        failures.current += 1;
        if (!stopped && failures.current >= MAX_POLL_FAILURES) {
          setJob((prev) => (prev ? { ...prev, phase: 'error', error: 'Lost connection to the profile server', finishedAt: Date.now() } : prev));
        }
      }
    };
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [jobId, live]);

  const items = job?.items ?? [];
  const activeId = items.find((i) => i.state === 'active')?.id;

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const cancel = async (): Promise<void> => {
    if (!jobId) return;
    setCancelling(true);
    await profileApi.profiles.importJob.cancel(jobId).catch(() => undefined);
  };

  const scanning = phase === 'scanning' || (!job && !startError);
  const finished = items.filter((i) => i.state !== 'pending' && i.state !== 'active').length;
  const failed = items.filter((i) => i.state === 'failed').length;
  const imported = items.filter((i) => i.state === 'transferred').length;
  const totalBytes = job?.totalBytes ?? 0;
  const doneBytes = job?.doneBytes ?? 0;
  const percent =
    phase === 'done'
      ? 100
      : totalBytes > 0
        ? Math.min(100, (doneBytes / totalBytes) * 100)
        : items.length > 0
          ? (finished / items.length) * 100
          : 0;
  const elapsed = job ? ((job.finishedAt ?? now) - job.startedAt) / 1000 : 0;
  const eta = speed && speed > 0 ? (totalBytes - doneBytes) / speed : null;
  const done = !!job && !live;
  const bad = startError !== null || phase === 'error';
  const palette = !done ? VIOLET : bad ? RED : phase === 'cancelled' || failed > 0 ? AMBER : GREEN;

  const title = startError
    ? 'Import failed'
    : scanning
      ? 'Scanning profile folders...'
      : phase === 'running'
        ? `Importing ${plural(items.length, 'profile')}...`
        : phase === 'cancelled'
          ? 'Import cancelled'
          : phase === 'error'
            ? 'Import failed'
            : failed > 0
              ? 'Import finished with errors'
              : 'Import complete';
  const sub = startError
    ? startError
    : scanning
      ? 'Measuring folder sizes first so the progress is accurate'
      : phase === 'error'
        ? (job?.error ?? 'Something went wrong')
        : done
          ? `${plural(imported, 'profile')} imported${failed ? `, ${failed} failed` : ''}`
          : `Destination: ${targetName}`;

  return (
    <Modal isOpen={isOpen} onClose={() => undefined} closeOnBackdropClick={false} className='max-w-[460px]'>
      <ModalBody className='flex flex-col gap-4 px-5 py-6'>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h3 className='text-base font-semibold leading-snug text-text-primary'>{title}</h3>
          <p className='max-w-[340px] break-words text-xs leading-relaxed text-text-secondary'>{sub}</p>
        </div>

        {!startError && (
          <>
            <div className='flex items-center gap-4 rounded-xl bg-card-background p-4'>
              <Ring percent={percent} spinning={scanning} palette={palette}>
                {scanning ? (
                  <span className='text-[10px] font-medium uppercase tracking-wider text-text-secondary'>Scan</span>
                ) : (
                  <>
                    <span className='text-xl font-semibold tabular-nums leading-none text-text-primary'>{Math.floor(percent)}%</span>
                    <span className='mt-1 text-[10px] text-text-secondary'>{formatBytes(totalBytes)}</span>
                  </>
                )}
              </Ring>
              <div className='grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-3'>
                <Stat label='Copied' value={`${formatBytes(doneBytes)} / ${formatBytes(totalBytes)}`} />
                <Stat label='Profiles' value={`${finished} / ${items.length}`} />
                <Stat label='Speed' value={done ? (elapsed > 0 ? `${formatBytes(doneBytes / elapsed)}/s` : '-') : speed !== null ? `${formatBytes(speed)}/s` : '-'} />
                <Stat label={done ? 'Elapsed' : 'Remaining'} value={formatDuration(done ? elapsed : eta)} />
              </div>
            </div>

            {items.length > 0 && (
              <ul className='flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-xl bg-text-secondary/5 p-1'>
                {items.map((item) => (
                  <li
                    key={item.id}
                    ref={item.id === activeId ? activeRow : undefined}
                    className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors', item.state === 'active' && 'bg-primary/10')}
                  >
                    <span className='flex h-4 w-4 shrink-0 items-center justify-center'>
                      <StateIcon state={item.state} />
                    </span>
                    <span className='flex min-w-0 flex-1 flex-col'>
                      <span className={cn('truncate', item.state === 'pending' ? 'text-text-secondary' : 'text-text-primary')}>{item.email}</span>
                      {item.error && <span className='truncate text-[10px] text-error'>{item.error}</span>}
                    </span>
                    <span className='shrink-0 rounded-md bg-text-secondary/10 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary'>
                      {formatBytes(item.bytes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </ModalBody>

      <ModalFooter className='gap-0 border-t border-border p-0'>
        {live || (!job && !startError) ? (
          <button onClick={() => void cancel()} disabled={cancelling || !jobId} className={cn(footerBtn, 'text-error hover:bg-error/[0.06]')}>
            {cancelling ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Square className='h-3.5 w-3.5' />}
            {cancelling ? 'Cancelling...' : 'Cancel import'}
          </button>
        ) : (
          <button onClick={() => onFinished(job)} className={cn(footerBtn, 'text-primary hover:bg-primary/[0.06]')}>
            Done
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}

export default ImportProgressModal;