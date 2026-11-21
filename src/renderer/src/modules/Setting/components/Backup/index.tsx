import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CloudUpload,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  Link2,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Badge, INPUT_CLASS, PageHeader, Section, SoftButton, StatTile, TONE } from '../shared';
import FileTree from './FileTree';

interface Status {
  root: string;
  enabled: boolean;
  remoteUrl?: string;
  branch?: string;
  changes?: number;
  unpushed?: number;
}

interface Result {
  error?: string;
  ok?: boolean;
  added?: number;
}

const LAST_SYNC_KEY = 'phantoma-backup-last-sync';

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
  const [status, setStatus] = useState<Status | null>(null);
  const [url, setUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [version, setVersion] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  });

  const refresh = useCallback(async () => {
    setStatus(await invoke<Status>('backup:status'));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      else {
        setMessage({ kind: 'ok', text: 'Repository saved' });
        setEditing(false);
      }
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
      await refresh();
      setVersion((v) => v + 1);
    }
  };

  const syncAll = async () => {
    if (!status) return;
    setBusy('sync');
    setMessage(null);
    const root = status.root;
    const fail = (text: string) => setMessage({ kind: 'error', text });
    try {
      const ai = await invoke<Result>('backup:auto-ignore');
      if (ai.error) return fail(ai.error);

      const a = await invoke<Result>('git:stage-all', root);
      if (a.error) return fail(a.error);

      if ((status.changes ?? 0) > 0 || (ai.added ?? 0) > 0) {
        const c = await invoke<Result>('git:commit', root, `Backup ${new Date().toISOString()}`);
        if (c.error) return fail(c.error);
      }

      const p = await invoke<Result>('backup:push');
      if (p.error) return fail(p.error);

      const now = new Date().toISOString();
      setLastSync(now);
      try {
        localStorage.setItem(LAST_SYNC_KEY, now);
      } catch {
        // ignore
      }
      setMessage({ kind: 'ok', text: 'Backup pushed to GitHub' });
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      await refresh();
      setVersion((v) => v + 1);
    }
  };

  if (!status) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 text-[12.5px] text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  const pending = (status.changes ?? 0) + (status.unpushed ?? 0);

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
              hint={pending === 0 ? 'Everything in sync' : `${pending} pending`}
            />
            <StatTile
              label="Changes"
              value={String(status.changes ?? 0)}
              tone="warn"
              icon={<FileCode2 className="h-3.5 w-3.5" />}
              hint="Not yet committed"
            />
            <StatTile
              label="Unpushed"
              value={String(status.unpushed ?? 0)}
              tone="teal"
              icon={<GitCommitHorizontal className="h-3.5 w-3.5" />}
              hint="Commits waiting"
            />
            <StatTile
              label="Last sync"
              value={ago(lastSync)}
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
              <div className="flex items-center gap-2">
                <Badge tone="success">Connected</Badge>
                <SoftButton tone="success" disabled={busy !== null} onClick={() => void syncAll()}>
                  {busy === 'sync' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Sync now
                </SoftButton>
              </div>
            }
          >
            <div className="px-4 py-3">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/you/phantoma-backup"
                    className={cn(INPUT_CLASS, 'flex-1 font-mono')}
                  />
                  <SoftButton
                    tone="success"
                    disabled={!url.trim() || busy !== null}
                    onClick={() => void enable(url)}
                  >
                    {busy === 'enable' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save
                  </SoftButton>
                  <SoftButton tone="muted" disabled={busy !== null} onClick={() => setEditing(false)}>
                    Cancel
                  </SoftButton>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-text-primary">
                    {status.remoteUrl}
                  </div>
                  <SoftButton
                    tone="info"
                    onClick={() => {
                      setUrl(status.remoteUrl ?? '');
                      setEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </SoftButton>
                </div>
              )}
            </div>
          </Section>

          <Section
            title="Files & ignore rules"
            description="Check a file or folder to exclude it from the backup. Right-click toggles too."
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            tone="warn"
            bodyClassName="divide-y-0"
          >
            <FileTree root={status.root} version={version} onChange={onTreeChange} />
          </Section>
        </>
      )}
    </div>
  );
};

export default Backup;