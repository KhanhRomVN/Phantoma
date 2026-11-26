import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  CloudUpload,
  FileCode2,
  GitBranch,
  HardDrive,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import {
  Badge,
  INPUT_CLASS,
  PageHeader,
  Row,
  Section,
  SoftButton,
  StatTile,
  TONE,
  Toggle,
} from '../shared';
import FileTree from './FileTree';
import { formatBytes } from './FilePreview';
import SyncConfirmModal from './SyncConfirmModal';
import { COMMIT_MESSAGE, useBackup, type BackupSchedule } from './useBackup';

interface Result {
  error?: string;
  ok?: boolean;
}

const INTERVAL_OPTIONS = [
  { min: 15, label: '15 min' },
  { min: 30, label: '30 min' },
  { min: 60, label: '1 h' },
  { min: 360, label: '6 h' },
  { min: 720, label: '12 h' },
  { min: 1440, label: '24 h' },
];

const intervalLabel = (min: number): string =>
  INTERVAL_OPTIONS.find((o) => o.min === min)?.label ?? `${min} min`;

const invoke = <T,>(channel: string, ...args: unknown[]): Promise<T> =>
  window.api.invoke(channel, ...args);

const ago = (iso: string | null): string => {
  if (!iso) return 'Never';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

const Backup: React.FC = () => {
  const { status, syncState, refresh, sync } = useBackup();
  const [url, setUrl] = useState('');
  const [size, setSize] = useState<number | null>(null);
  const urlInit = useRef(false);
  const lastTried = useRef('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [version, setVersion] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!status?.enabled) return;
    void invoke<number>('backup:size')
      .then((n) => setSize(typeof n === 'number' ? n : 0))
      .catch(() => setSize(null));
  }, [status?.enabled, status?.changes, version]);

  const onTreeChange = useCallback(() => {
    setVersion((v) => v + 1);
    void refresh();
  }, [refresh]);

  const enable = async (target: string) => {
    setBusy('enable');
    setMessage(null);
    try {
      const res = await invoke<Result>('backup:enable', target.trim());
      if (res?.error) setMessage({ kind: 'error', text: res.error });
      else setMessage({ kind: 'ok', text: 'Repository saved' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
      await refresh();
      setVersion((v) => v + 1);
    }
  };

  useEffect(() => {
    if (!status?.enabled || urlInit.current) return;
    urlInit.current = true;
    setUrl(status.remoteUrl ?? '');
    lastTried.current = status.remoteUrl ?? '';
  }, [status]);

  useEffect(() => {
    if (!status?.enabled || !urlInit.current) return;
    const target = url.trim();
    if (!target || target === lastTried.current) return;
    const t = setTimeout(() => {
      lastTried.current = target;
      void enable(target);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, status?.enabled]);

  const updateSchedule = async (patch: Partial<BackupSchedule>) => {
    await invoke('backup:schedule-set', patch);
    await refresh();
  };

  if (!status) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 text-[12.5px] text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  const changes = status.changes ?? 0;
  const schedule = status.schedule ?? { enabled: false, intervalMin: 360 };
  const syncDisabled = syncState === 'loading' || (changes === 0 && (status.unpushed ?? 0) === 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Backup"
        description="Keep your Phantoma configuration safe in a private GitHub repository."
      />

      {message && (
        <div
          className={cn(
            'mb-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-[12.5px]',
            message.kind === 'error'
              ? 'border-error/30 bg-error/10 text-error'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          {message.kind === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="break-words">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-auto shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!status.enabled ? (
        <>
          <div className="mb-4 rounded-xl border border-border bg-card-background p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                <Link2 className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-text-primary">Connect a repository</div>
                <div className="text-[11.5px] text-text-secondary">
                  Use a private repository of your own account.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/you/phantoma-backup"
                className={cn(INPUT_CLASS, 'h-9 flex-1 font-mono')}
              />
              <SoftButton
                tone="success"
                className="h-9 px-3.5"
                disabled={!url.trim() || busy !== null}
                onClick={() => void enable(url)}
              >
                {busy === 'enable' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="h-3.5 w-3.5" />
                )}
                Enable backup
              </SoftButton>
            </div>
            <p className="m-0 mt-2.5 text-[11px] text-text-secondary">
              The remote .git is downloaded and a .gitignore is created if missing.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['Private only', 'Public repositories are rejected.', Lock, 'error'],
                ['Smart ignore', 'Runtime db and journal files are skipped.', ShieldCheck, 'teal'],
                ['One-click sync', 'Stage, commit and push in one step.', UploadCloud, 'info'],
              ] as const
            ).map(([title, desc, Icon, tone]) => (
              <div key={title} className="rounded-xl border border-border bg-card-background p-3.5">
                <span className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', TONE[tone])}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="text-[12.5px] font-semibold text-text-primary">{title}</div>
                <div className="mt-0.5 text-[11.5px] text-text-secondary">{desc}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-4 gap-3">
            <StatTile
              label="Branch"
              value={status.branch || '-'}
              tone="purple"
              icon={<GitBranch className="h-3.5 w-3.5" />}
              hint={changes === 0 ? 'Everything in sync' : `${changes} pending`}
            />
            <StatTile
              label="Changes"
              value={String(changes)}
              tone="warn"
              icon={<FileCode2 className="h-3.5 w-3.5" />}
              hint="Not yet committed"
            />
            <StatTile
              label="Schedule"
              value={schedule.enabled ? `Every ${intervalLabel(schedule.intervalMin)}` : 'Off'}
              tone="teal"
              icon={<Clock className="h-3.5 w-3.5" />}
              hint="Auto backup"
            />
            <StatTile
              label="Last sync"
              value={ago(status.lastSync ?? null)}
              tone="success"
              icon={<UploadCloud className="h-3.5 w-3.5" />}
              hint="This device"
            />
          </div>

          <Section
            title="Repository"
            description={status.root}
            icon={<Link2 className="h-3.5 w-3.5" />}
            tone="info"
            action={
              <SoftButton
                tone={syncState === 'error' ? 'error' : 'success'}
                disabled={syncDisabled}
                onClick={() => setConfirmOpen(true)}
              >
                {syncState === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : syncState === 'success' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : syncState === 'error' ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sync
              </SoftButton>
            }
          >
            <div className="px-4 py-3">
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/you/phantoma-backup"
                  className="h-8 w-full border-0 bg-transparent p-0 pr-9 font-mono text-[12.5px] text-text-primary outline-none placeholder:text-text-secondary focus:outline-none focus:ring-0"
                />
                <span
                  title={busy === 'enable' ? 'Saving...' : 'Connected'}
                  className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center"
                >
                  {busy === 'enable' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-text-secondary" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px] shadow-success/60" />
                  )}
                </span>
              </div>
            </div>
          </Section>

          <Section
            title="Schedule"
            description="Automatically commit and push pending changes."
            icon={<Clock className="h-3.5 w-3.5" />}
            tone="teal"
          >
            <Row
              label="Automatic backup"
              description="Runs in the background while Phantoma is open. Skipped when there is nothing to back up."
            >
              <Toggle
                checked={schedule.enabled}
                onChange={(v) => void updateSchedule({ enabled: v })}
              />
            </Row>
            <Row label="Frequency" description="How often the backup runs.">
              <div className="flex items-center gap-1">
                {INTERVAL_OPTIONS.map((o) => (
                  <button
                    key={o.min}
                    type="button"
                    disabled={!schedule.enabled}
                    aria-pressed={schedule.intervalMin === o.min}
                    onClick={() => void updateSchedule({ intervalMin: o.min })}
                    className={cn(
                      'h-7 min-w-12 cursor-pointer rounded-md px-2 text-[11.5px] font-medium outline-none transition-colors',
                      schedule.intervalMin === o.min
                        ? 'bg-teal/15 text-teal'
                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
                      !schedule.enabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          <Section
            title="Files & ignore rules"
            description="Check a file or folder to exclude it from the backup. Right-click toggles too."
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            tone="warn"
            bodyClassName="divide-y-0"
            action={
              <Badge tone="muted" className="shrink-0">
                <HardDrive className="h-3 w-3" />
                {size === null ? '...' : formatBytes(size)}
              </Badge>
            }
          >
            <FileTree root={status.root} version={version} onChange={onTreeChange} />
          </Section>
        </>
      )}

      <SyncConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void sync();
        }}
        changes={changes}
        commitMessage={COMMIT_MESSAGE}
      />
    </div>
  );
};

export default Backup;