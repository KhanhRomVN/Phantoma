import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Copy, Loader2, Square, XCircle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { profileApi } from '../../../../../shared/api/profile.api';
import { type TransferJob, type TransferJobItem } from '../../../../../shared/types';
import type { TransferResult } from '../../SourceTransfer/source-transfer.types';
import { plural, formatBytes, formatDuration, hsl } from '../../../utils/transfer-format.util';
import { Stage, GREEN, VIOLET, AMBER, RED, TILE, Ring, Stat, StateIcon } from './TransferBits';

export interface TransferCounts {
  fresh: number;
  merge: number;
  overwrite: number;
  skip: number;
  unsynced: number;
}

interface ConfirmTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinished: (job: TransferJob | null) => void;
  request: TransferResult;
  targetName: string;
  counts: TransferCounts;
}

const WARN_BOX = 'flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2.5 text-xs leading-relaxed text-warn';

const ERROR_BOX = 'flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2.5 text-xs leading-relaxed text-error';

const POLL_MS = 300;

const MAX_POLL_FAILURES = 10;

export function ConfirmTransferModal({ isOpen, onClose, onFinished, request, targetName, counts }: ConfirmTransferModalProps) {
  const { mode } = request;
  const total = counts.fresh + counts.merge + counts.overwrite;
  const verb = mode === 'move' ? 'Move' : 'Duplicate';
  const ModeIcon = mode === 'move' ? ArrowRightLeft : Copy;
  const modePalette = mode === 'move' ? VIOLET : GREEN;

  const [stage, setStage] = useState<Stage>('confirm');
  const [job, setJob] = useState<TransferJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const samples = useRef<{ t: number; b: number }[]>([]);
  const failures = useRef(0);
  const activeRow = useRef<HTMLLIElement | null>(null);
  const jobId = job?.id;

  useEffect(() => {
    if (stage !== 'running' || !jobId) return;
    let stopped = false;
    const tick = async (): Promise<void> => {
      try {
        const next = await profileApi.profiles.transferJob.get(jobId);
        if (stopped) return;
        failures.current = 0;
        const t = Date.now();
        samples.current = [...samples.current, { t, b: next.doneBytes }].filter((s) => t - s.t <= 4000);
        const first = samples.current[0];
        const dt = (t - first.t) / 1000;
        setSpeed(dt >= 0.6 ? Math.max(0, (next.doneBytes - first.b) / dt) : null);
        setNow(t);
        setJob(next);
        if (next.phase !== 'scanning' && next.phase !== 'running') setStage('done');
      } catch {
        failures.current += 1;
        if (!stopped && failures.current >= MAX_POLL_FAILURES) {
          setJob((prev) => (prev ? { ...prev, phase: 'error', error: 'Lost connection to the profile server', finishedAt: Date.now() } : prev));
          setStage('done');
        }
      }
    };
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [stage, jobId]);

  const items = job?.items ?? [];
  const activeId = items.find((i) => i.state === 'active')?.id;

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const start = async (): Promise<void> => {
    setStartError(null);
    setStarting(true);
    try {
      const created = await profileApi.profiles.transferJob.start(request);
      samples.current = [];
      setJob(created);
      setStage('running');
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const cancel = async (): Promise<void> => {
    if (!jobId) return;
    setCancelling(true);
    await profileApi.profiles.transferJob.cancel(jobId).catch(() => undefined);
  };

  const count = (state: TransferJobItem['state']): number => items.filter((i) => i.state === state).length;
  const finished = items.filter((i) => i.state !== 'pending' && i.state !== 'active').length;
  const scanning = stage === 'running' && job?.phase === 'scanning';
  const totalBytes = job?.totalBytes ?? 0;
  const doneBytes = job?.doneBytes ?? 0;
  const percent =
    job?.phase === 'done'
      ? 100
      : totalBytes > 0
        ? Math.min(100, (doneBytes / totalBytes) * 100)
        : items.length > 0
          ? (finished / items.length) * 100
          : 0;
  const elapsed = job ? ((job.finishedAt ?? now) - job.startedAt) / 1000 : 0;
  const eta = speed && speed > 0 ? (totalBytes - doneBytes) / speed : null;
  const failed = count('failed');
  const outcome = job?.phase === 'cancelled' ? 'cancelled' : job?.phase === 'error' ? 'error' : failed > 0 ? 'warn' : 'ok';
  const palette = stage !== 'done' ? modePalette : outcome === 'ok' ? GREEN : outcome === 'error' ? RED : AMBER;

  const head = (() => {
    if (stage === 'confirm') {
      return { Icon: ModeIcon, tile: TILE.primary, title: `${verb} ${plural(total, 'profile')}?`, sub: `Destination: ${targetName}` };
    }
    if (stage === 'running') {
      return {
        Icon: ModeIcon,
        tile: TILE.primary,
        title: scanning ? 'Scanning profile folders...' : `${mode === 'move' ? 'Moving' : 'Copying'} ${plural(items.length, 'profile')}...`,
        sub: scanning ? 'Measuring folder sizes first so the progress is accurate' : `Destination: ${targetName}`,
      };
    }
    if (outcome === 'cancelled') {
      return {
        Icon: Square,
        tile: TILE.warn,
        title: 'Transfer cancelled',
        sub: `${plural(count('transferred') + count('merged'), 'profile')} finished before cancelling. The rest were left untouched.`,
      };
    }
    if (outcome === 'error') {
      return { Icon: XCircle, tile: TILE.error, title: 'Transfer failed', sub: job?.error ?? 'Something went wrong' };
    }
    return {
      Icon: outcome === 'warn' ? AlertTriangle : CheckCircle2,
      tile: outcome === 'warn' ? TILE.warn : TONE_CLASS.success.icon,
      title: outcome === 'warn' ? 'Transfer finished with errors' : 'Transfer complete',
      sub: `${plural(count('transferred'), 'profile')} ${mode === 'move' ? 'moved' : 'copied'}${count('merged') ? `, ${count('merged')} merged` : ''}${failed ? `, ${failed} failed` : ''}`,
    };
  })();

  const cards = [
    { key: 'fresh', label: mode === 'move' ? 'To move' : 'To copy', n: counts.fresh, color: GREEN },
    { key: 'merge', label: 'To merge', n: counts.merge, color: VIOLET },
    { key: 'overwrite', label: 'To overwrite', n: counts.overwrite, color: RED },
    { key: 'skip', label: 'Skipped', n: counts.skip, color: { from: '220 10% 55%', to: '220 10% 55%' } },
  ].filter((c) => c.n > 0);

  const header = (
    <div className='flex flex-col items-center gap-3 text-center'>
      <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', head.tile)}>
        <head.Icon className='h-5 w-5' strokeWidth={1.8} />
      </div>
      <h3 className='text-base font-semibold leading-snug text-text-primary'>{head.title}</h3>
      <p className='max-w-[340px] break-words text-xs leading-relaxed text-text-secondary'>{head.sub}</p>
    </div>
  );

  const hero = (
    <div className='relative overflow-hidden rounded-xl bg-card-background p-4'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 text-text-primary opacity-[0.05]'
        style={{
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full blur-2xl'
        style={{ background: hsl(palette.from, 0.28) }}
        animate={{ x: [0, 14, 0], y: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full blur-2xl'
        style={{ background: hsl(palette.to, 0.2) }}
        animate={{ x: [0, -12, 0], y: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className='relative flex items-center gap-4'>
        <Ring percent={percent} spinning={scanning} palette={palette}>
          {scanning ? (
            <HardDriveLabel />
          ) : (
            <>
              <span className='text-xl font-semibold tabular-nums leading-none text-text-primary'>{Math.floor(percent)}%</span>
              <span className='mt-1 text-[10px] text-text-secondary'>{formatBytes(totalBytes)}</span>
            </>
          )}
        </Ring>
        <div className='grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-3'>
          <Stat label='Transferred' value={`${formatBytes(doneBytes)} / ${formatBytes(totalBytes)}`} />
          <Stat label='Profiles' value={`${finished} / ${items.length}`} />
          <Stat label='Speed' value={stage === 'done' ? (elapsed > 0 ? `${formatBytes(doneBytes / elapsed)}/s` : '-') : speed !== null ? `${formatBytes(speed)}/s` : '-'} />
          <Stat label={stage === 'done' ? 'Elapsed' : 'Remaining'} value={formatDuration(stage === 'done' ? elapsed : eta)} />
        </div>
      </div>
    </div>
  );

  const queue = items.length > 0 && (
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
            {item.bytes > 0 ? formatBytes(item.bytes) : item.state === 'merged' || item.state === 'skipped' ? item.state : '-'}
          </span>
        </li>
      ))}
    </ul>
  );

  const footerBtn = 'flex h-[42px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-40';

  return (
    <Modal isOpen={isOpen} onClose={stage === 'confirm' ? onClose : () => undefined} closeOnBackdropClick={false} className='max-w-[460px]'>
      <ModalBody className='flex flex-col gap-4 px-5 py-6'>
        {header}

        {stage === 'confirm' && (
          <>
            <div className='grid grid-cols-2 gap-2'>
              {cards.map((c) => (
                <div key={c.key} className='flex items-center gap-2.5 rounded-lg bg-card-background px-3 py-2.5'>
                  <span className='h-8 w-1 shrink-0 rounded-full' style={{ background: `linear-gradient(${hsl(c.color.from)}, ${hsl(c.color.to)})` }} />
                  <span className='flex flex-col'>
                    <span className='text-base font-semibold leading-none tabular-nums text-text-primary'>{c.n}</span>
                    <span className='mt-1 text-[11px] text-text-secondary'>{c.label}</span>
                  </span>
                </div>
              ))}
            </div>
            {mode === 'move' && (
              <div className={WARN_BOX}>
                <AlertTriangle className='mt-px h-3.5 w-3.5 shrink-0' />
                <span>Move removes the profile from its origin source once the transfer completes.</span>
              </div>
            )}
            {counts.unsynced > 0 && (
              <div className={WARN_BOX}>
                <AlertTriangle className='mt-px h-3.5 w-3.5 shrink-0' />
                <span>
                  {plural(counts.unsynced, 'profile')} not synced with Chrome. Anything not stored in Chrome Sync exists only in {mode === 'move' ? 'the moved copy' : 'these copies'}.
                </span>
              </div>
            )}
            {counts.overwrite > 0 && (
              <div className={ERROR_BOX}>
                <AlertTriangle className='mt-px h-3.5 w-3.5 shrink-0' />
                <span>Overwritten values in the destination profiles cannot be restored.</span>
              </div>
            )}
            {startError && <div className={ERROR_BOX}>{startError}</div>}
          </>
        )}

        {stage !== 'confirm' && (
          <>
            {hero}
            {queue}
          </>
        )}
      </ModalBody>

      <ModalFooter className='gap-0 border-t border-border p-0'>
        {stage === 'confirm' && (
          <>
            <button
              onClick={onClose}
              disabled={starting}
              className='h-[42px] flex-1 border-r border-border text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-text-primary disabled:opacity-40'
            >
              Cancel
            </button>
            <button onClick={() => void start()} disabled={starting || total === 0} className={cn(footerBtn, 'text-primary hover:bg-primary/[0.06]')}>
              {starting ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <ModeIcon className='h-3.5 w-3.5' />}
              {verb}
            </button>
          </>
        )}
        {stage === 'running' && (
          <button onClick={() => void cancel()} disabled={cancelling || !jobId} className={cn(footerBtn, 'text-error hover:bg-error/[0.06]')}>
            {cancelling ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Square className='h-3.5 w-3.5' />}
            {cancelling ? 'Cancelling...' : 'Cancel transfer'}
          </button>
        )}
        {stage === 'done' && (
          <button onClick={() => onFinished(job)} className={cn(footerBtn, 'text-primary hover:bg-primary/[0.06]')}>
            Done
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function HardDriveLabel() {
  return <span className='text-[10px] font-medium uppercase tracking-wider text-text-secondary'>Scan</span>;
}

export default ConfirmTransferModal;
