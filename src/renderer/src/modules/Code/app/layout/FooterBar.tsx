/**
 * ------------------------------------------------------------------
 * FooterBar
 * ------------------------------------------------------------------
 * Flat status bar at the bottom of the Code module (no button/badge
 * styling, only colored text and icons). Every item shows an instant
 * (no delay) rich tooltip panel defined in this file.
 *
 * Left:  project name, git branch (click opens Git view), changes
 *        overview (total + not added / added / committed segmented bar
 *        with +/- line stats), unpushed commits, refresh.
 * Right: unsaved files, open files, current view mode, clock.
 * Git data comes from the `git:status` IPC and refreshes every 15s.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowUp,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  GitCommit,
  Loader2,
  RefreshCw,
  Save,
  Bug,
  Layers,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { useCodeStore } from '../../shared/stores/code.store';
import { codeApi } from '../../shared/api/code.api';
import { useDebugStore } from '../../features/debug/stores/debug.store';
import { SCOPE_DIFF_DOT, useScopeStats } from '../../shared/stores/scope-stats.store';
import type { GitChangeKind } from '../../shared/utils/git-status-parser.util';
import { getFileIconPath } from '@renderer/utils/file-icon';

// ─── Interfaces ─────────────────────────────────────────────────────────
// ─── Tooltip types ──────────────────────────────────────────────────────
interface GitFile {
  path: string;
  kind: GitChangeKind;
}

interface DiffEntry {
  path: string;
  added: number;
  deleted: number;
}

type GitGroupKey = 'unstaged' | 'staged' | 'committed';

interface GitGroups {
  unstaged: GitFile[];
  staged: GitFile[];
  committed: string[];
}

// ─── Tooltip building blocks ────────────────────────────────────────────
export const TOOLTIP_CLASS = 'p-0 max-w-none overflow-hidden';

const GROUP_META: Record<GitGroupKey, { label: string; hint: string; dot: string; text: string }> = {
  unstaged: {
    label: 'Not added',
    hint: 'needs git add',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
  },
  staged: { label: 'Added', hint: 'ready to commit', dot: 'bg-sky-400', text: 'text-sky-400' },
  committed: {
    label: 'Committed',
    hint: 'not pushed yet',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
  },
};

const KIND_META: Record<GitChangeKind, { tag: string; cls: string }> = {
  added: { tag: 'A', cls: 'text-emerald-400 bg-emerald-400/10' },
  modified: { tag: 'M', cls: 'text-amber-400 bg-amber-400/10' },
  deleted: { tag: 'D', cls: 'text-rose-400 bg-rose-400/10' },
};

function baseName(p: string): string {
  const parts = p.split('/');
  return parts[parts.length - 1] || p;
}

function dirName(p: string): string {
  const i = p.lastIndexOf('/');
  return i > 0 ? p.slice(0, i) : '';
}

function Panel({
  width = 280,
  icon,
  title,
  right,
  children,
}: {
  width?: number;
  icon?: ReactNode;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ width }} className="text-[11px]">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border">
        <span className="flex items-center gap-1.5 font-semibold text-text-primary min-w-0">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        {right}
      </div>
      <div className="flex flex-col gap-2.5 p-3">{children}</div>
    </div>
  );
}

export function Row({
  dot,
  label,
  value,
  valueClass,
  sub,
}: {
  dot?: string;
  label: string;
  value: ReactNode;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />}
      <span className="text-text-primary">{label}</span>
      {sub && <span className="text-text-secondary">{sub}</span>}
      <span className={cn('ml-auto font-mono font-semibold', valueClass)}>{value}</span>
    </div>
  );
}

function Bar({ parts }: { parts: { value: number; className: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-border">
      {total > 0 &&
        parts.map(
          (p, i) =>
            p.value > 0 && (
              <span
                key={i}
                className={cn('h-full', p.className)}
                style={{ width: `${(p.value / total) * 100}%` }}
              />
            ),
        )}
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 font-mono font-semibold', className)}>{children}</span>
  );
}

function FileLine({ path, kind }: { path: string; kind?: GitChangeKind }) {
  const dir = dirName(path);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {kind && (
        <span
          className={cn(
            'w-4 h-4 shrink-0 rounded flex items-center justify-center font-mono text-[10px] font-bold',
            KIND_META[kind].cls,
          )}
        >
          {KIND_META[kind].tag}
        </span>
      )}
      <img src={getFileIconPath(path)} alt="" className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate text-text-primary">{baseName(path)}</span>
      {dir && <span className="truncate text-text-secondary opacity-60 text-[10px]">{dir}</span>}
    </div>
  );
}

function FileList({
  files,
  limit,
  empty,
}: {
  files: { path: string; kind?: GitChangeKind }[];
  limit: number;
  empty: string;
}) {
  if (files.length === 0) return <span className="text-text-secondary italic">{empty}</span>;
  return (
    <div className="flex flex-col gap-1">
      {files.slice(0, limit).map((f) => (
        <FileLine key={f.path} path={f.path} kind={f.kind} />
      ))}
      {files.length > limit && (
        <span className="text-text-secondary">+{files.length - limit} more…</span>
      )}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="text-[10px] text-text-secondary opacity-70">{children}</div>;
}

// ─── Tooltips: git changes ──────────────────────────────────────────────
function GitOverviewTooltip({
  groups,
  added,
  deleted,
}: {
  groups: GitGroups;
  added: number;
  deleted: number;
}) {
  const counts: Record<GitGroupKey, number> = {
    unstaged: groups.unstaged.length,
    staged: groups.staged.length,
    committed: groups.committed.length,
  };
  const total = counts.unstaged + counts.staged + counts.committed;
  return (
    <Panel
      width={300}
      icon={<GitCommit className="w-3 h-3 text-amber-400" />}
      title={`${total} file${total === 1 ? '' : 's'} changed`}
      right={
        <span className="flex gap-2 font-mono font-semibold">
          <span className="text-emerald-400">+{added}</span>
          <span className="text-rose-400">−{deleted}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-2">
        {(Object.keys(GROUP_META) as GitGroupKey[]).map((k) => (
          <Row
            key={k}
            dot={GROUP_META[k].dot}
            label={GROUP_META[k].label}
            sub={GROUP_META[k].hint}
            value={counts[k]}
            valueClass={GROUP_META[k].text}
          />
        ))}
      </div>
    </Panel>
  );
}

function GitGroupTooltip({ group, groups }: { group: GitGroupKey; groups: GitGroups }) {
  const meta = GROUP_META[group];
  const files: { path: string; kind?: GitChangeKind }[] =
    group === 'committed' ? groups.committed.map((path) => ({ path })) : groups[group];
  return (
    <Panel
      width={280}
      icon={<span className={cn('w-2 h-2 rounded-full', meta.dot)} />}
      title={meta.label}
      right={<Chip className={cn('bg-border', meta.text)}>{files.length}</Chip>}
    >
      <span className="text-text-secondary">{meta.hint}</span>
      <FileList files={files} limit={8} empty="Nothing here" />
    </Panel>
  );
}

function GitLinesTooltip({
  added,
  deleted,
  top,
}: {
  added: number;
  deleted: number;
  top: DiffEntry[];
}) {
  return (
    <Panel width={290} title="Line changes">
      <Bar
        parts={[
          { value: added, className: 'bg-emerald-400' },
          { value: deleted, className: 'bg-rose-400' },
        ]}
      />
      <div className="flex gap-4 font-mono font-semibold">
        <span className="text-emerald-400">+{added} added</span>
        <span className="text-rose-400">−{deleted} removed</span>
      </div>
      {top.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-t border-border">
          <span className="text-text-secondary">Biggest edits</span>
          {top.map((d) => (
            <div key={d.path} className="flex items-center gap-2 min-w-0">
              <img src={getFileIconPath(d.path)} alt="" className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-text-primary">{baseName(d.path)}</span>
              <span className="ml-auto font-mono text-emerald-400">+{d.added}</span>
              <span className="font-mono text-rose-400">−{d.deleted}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function GitCleanTooltip() {
  return (
    <Panel
      width={220}
      icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
      title="Working tree clean"
    >
      <Bar parts={[{ value: 1, className: 'bg-emerald-400' }]} />
      <Row dot="bg-amber-400" label="Not added" value={0} valueClass="text-amber-400" />
      <Row dot="bg-sky-400" label="Added" value={0} valueClass="text-sky-400" />
      <Row dot="bg-emerald-400" label="Committed" value={0} valueClass="text-emerald-400" />
    </Panel>
  );
}

// ─── Tooltips: branch / push / refresh / project ────────────────────────
function BranchTooltip({
  branch,
  unpushed,
  dirty,
}: {
  branch: string;
  unpushed: number;
  dirty: number;
}) {
  return (
    <Panel width={240} icon={<GitBranch className="w-3 h-3 text-primary" />} title="Branch">
      <span className="font-mono text-[12px] font-semibold text-primary break-all">{branch}</span>
      <Row
        dot={dirty ? 'bg-amber-400' : 'bg-emerald-400'}
        label="Working tree"
        value={dirty ? `${dirty} pending` : 'clean'}
        valueClass={dirty ? 'text-amber-400' : 'text-emerald-400'}
      />
      <Row
        dot={unpushed ? 'bg-sky-400' : 'bg-border'}
        label="Unpushed commits"
        value={unpushed}
        valueClass={unpushed ? 'text-sky-400' : 'text-text-secondary'}
      />
      <Hint>Click to open Git view</Hint>
    </Panel>
  );
}

function UnpushedTooltip({ unpushed, files }: { unpushed: number; files: number }) {
  return (
    <Panel width={230} icon={<ArrowUp className="w-3 h-3 text-sky-400" />} title="Waiting to push">
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-[22px] leading-none font-bold text-sky-400">{unpushed}</span>
        <span className="text-text-secondary pb-0.5">local commit{unpushed === 1 ? '' : 's'}</span>
      </div>
      <Row dot="bg-emerald-400" label="Files touched" value={files} valueClass="text-emerald-400" />
    </Panel>
  );
}

function RefreshTooltip({
  lastSync,
  everySec,
  loading,
}: {
  lastSync: Date | null;
  everySec: number;
  loading: boolean;
}) {
  return (
    <Panel width={210} title="Git status sync">
      <Row
        dot={loading ? 'bg-amber-400' : 'bg-emerald-400'}
        label={loading ? 'Syncing…' : 'Up to date'}
        value={lastSync ? lastSync.toLocaleTimeString() : '—'}
        valueClass="text-text-primary"
      />
      <Row label="Auto refresh" value={`${everySec}s`} valueClass="text-text-secondary" />
      <Hint>Click to refresh now</Hint>
    </Panel>
  );
}

function ProjectTooltip({ name, path, count }: { name: string; path: string; count: number }) {
  return (
    <Panel width={280} icon={<FolderOpen className="w-3 h-3 text-violet-400" />} title={name}>
      <span className="font-mono text-text-secondary break-all">{path}</span>
      <Row label="Projects loaded" value={count} valueClass="text-violet-400" />
    </Panel>
  );
}

function ProjectsTooltip({ count }: { count: number }) {
  return (
    <Panel width={200} icon={<Layers className="w-3 h-3 text-violet-400" />} title="Projects">
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-[22px] leading-none font-bold text-violet-400">{count}</span>
        <span className="text-text-secondary pb-0.5">loaded in workspace</span>
      </div>
    </Panel>
  );
}

// ─── Tooltips: scope ────────────────────────────────────────────────────
function ScopeTooltip({
  error,
  diff,
  deleted,
  warn,
  primary,
}: {
  error: number;
  diff: number;
  deleted: number;
  warn: number;
  primary: number;
}) {
  const edited = diff - deleted;
  const rows = [
    { label: 'Clash', sub: 'also changed in another branch', n: error, dot: 'bg-error', text: 'text-error' },
    { label: 'Drift', sub: `${edited} edited · ${deleted} deleted`, n: diff, dot: 'bg-[#f97316]', text: 'text-[#f97316]' },
    { label: 'Outside', sub: 'same as default branch', n: warn, dot: 'bg-warn', text: 'text-warn' },
    { label: 'Inside', sub: 'this branch', n: primary, dot: 'bg-primary', text: 'text-primary' },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Panel width={290} title="Changed files by scope">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1">
          <Row dot={r.dot} label={r.label} sub={r.sub} value={r.n} valueClass={r.text} />
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div className={cn('h-full', r.dot)} style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}

// ─── Tooltips: debug ────────────────────────────────────────────────────
function DebugTooltip({ status }: { status: string }) {
  const steps = [
    { key: 'starting', label: 'Starting' },
    { key: 'running', label: 'Running' },
    { key: 'stopped', label: 'Paused' },
  ];
  const current = status === 'starting' ? 'starting' : status === 'stopped' ? 'stopped' : 'running';
  return (
    <Panel width={240} title="Run & Debug">
      <div className="flex items-center gap-1">
        {steps.map((s) => (
          <div
            key={s.key}
            className={cn(
              'flex-1 rounded px-2 py-1 text-center font-semibold',
              s.key === current
                ? 'bg-emerald-400/15 text-emerald-400'
                : 'bg-border/60 text-text-secondary',
            )}
          >
            {s.label}
          </div>
        ))}
      </div>
      <Hint>Click to open the debug panel</Hint>
    </Panel>
  );
}

// ─── Tooltips: right side ───────────────────────────────────────────────
function UnsavedTooltip({ files }: { files: string[] }) {
  return (
    <Panel
      width={260}
      title="Unsaved files"
      right={<Chip className="bg-rose-400/10 text-rose-400">{files.length}</Chip>}
    >
      <FileList files={files.map((path) => ({ path }))} limit={8} empty="All saved" />
    </Panel>
  );
}

function OpenFilesTooltip({ open, unsaved }: { open: number; unsaved: number }) {
  const saved = Math.max(0, open - unsaved);
  return (
    <Panel width={220} title="Open tabs">
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-[22px] leading-none font-bold text-sky-400">{open}</span>
        <span className="text-text-secondary pb-0.5">in the editor</span>
      </div>
      <Bar
        parts={[
          { value: saved, className: 'bg-sky-400' },
          { value: Math.min(unsaved, open), className: 'bg-rose-400' },
        ]}
      />
      <Row dot="bg-sky-400" label="Saved" value={saved} valueClass="text-sky-400" />
      <Row dot="bg-rose-400" label="Unsaved" value={unsaved} valueClass="text-rose-400" />
    </Panel>
  );
}

function ViewTooltip({ views, current }: { views: Record<string, string>; current: string }) {
  return (
    <Panel width={190} title="Views">
      <div className="flex flex-col gap-1">
        {Object.entries(views).map(([key, label]) => (
          <div
            key={key}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1',
              key === current ? 'bg-pink-400/15 text-pink-400 font-semibold' : 'text-text-secondary',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                key === current ? 'bg-pink-400' : 'bg-border',
              )}
            />
            {label}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TimeTooltip({ now }: { now: Date }) {
  return (
    <Panel width={190} title="Local time">
      <span className="font-mono text-[22px] leading-none font-bold text-text-primary">
        {now.toLocaleTimeString()}
      </span>
      <span className="text-text-secondary">
        {now.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
      </span>
    </Panel>
  );
}

// ─── Interfaces ─────────────────────────────────────────────────────────
interface FooterBarProps {
  className?: string;
}

interface GitInfo {
  branch: string;
  unstaged: GitFile[];
  staged: GitFile[];
  committed: string[];
  added: number;
  deleted: number;
  topDiffs: DiffEntry[];
  unpushed: number;
}

const REFRESH_MS = 15000;

const VIEW_LABELS: Record<string, string> = {
  files: 'Files',
  tasks: 'Tasks',
  workspace: 'Workspace',
  git: 'Git',
  design: 'Design',
};

// ─── Style helpers ──────────────────────────────────────────────────────
const item = 'flex items-center gap-1.5 whitespace-nowrap';
const clickable = 'cursor-pointer transition-opacity hover:opacity-70';
const tipWrap = 'flex items-center';

function Sep() {
  return <span className="h-3 w-px bg-border shrink-0" />;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Segment({ count, total, className }: { count: number; total: number; className: string }) {
  if (count <= 0 || total <= 0) return null;
  return <span className={cn('h-full', className)} style={{ width: `${(count / total) * 100}%` }} />;
}

function Tip({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip
      side="top"
      className={cn(tipWrap, className)}
      contentClassName={TOOLTIP_CLASS}
      content={content}
    >
      {children}
    </Tooltip>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function FooterBar({ className }: FooterBarProps) {
  const projectName = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.name ?? '',
  );
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === s.currentProjectId);
    return p?.explorerRoot ?? p?.path ?? '';
  });
  const unsavedSet = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.unsavedFiles,
  );
  const unsavedCount = unsavedSet?.size ?? 0;
  const openCount = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.openFiles.length ?? 0,
  );
  const viewMode = useCodeStore((s) => s.contentViewMode);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const projectCount = useCodeStore((s) => s.projects.length);
  const debugStatus = useDebugStore((s) => s.status);
  const projectId = useCodeStore((s) => s.currentProjectId ?? '');
  const scopeStats = useScopeStats(projectId);

  const [git, setGit] = useState<GitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  const loadGit = useCallback(async () => {
    if (!projectPath) {
      setGit(null);
      return;
    }
    setLoading(true);
    try {
      const res = await codeApi.git.status(projectPath).catch(() => null);
      if (!res) {
        setGit(null);
        return;
      }
      const diffs = Object.entries(res.diffStats ?? {}).map(([path, s]) => ({
        path,
        added: (s as { added: number }).added,
        deleted: (s as { deleted: number }).deleted,
      })) as DiffEntry[];
      const unstaged: GitFile[] = [];
      const staged: GitFile[] = [];
      for (const line of String(res.output ?? '').split('\n')) {
        if (line.length < 4) continue;
        const x = line[0];
        const y = line[1];
        let p = line.slice(3).trim();
        const arrow = p.indexOf(' -> ');
        if (arrow >= 0) p = p.slice(arrow + 4);
        p = p.replace(/^"|"$/g, '').replace(/\/$/, '');
        if (!p) continue;
        const code = x + y;
        const kind: GitChangeKind = code.includes('D')
          ? 'deleted'
          : code === '??' || code.includes('A')
            ? 'added'
            : 'modified';
        const untracked = x === '?';
        if (untracked || y !== ' ') unstaged.push({ path: p, kind });
        else if (x !== ' ') staged.push({ path: p, kind });
      }
      setGit({
        branch: res.branch || 'detached',
        unstaged,
        staged,
        committed: Array.isArray(res.committedFiles) ? (res.committedFiles as string[]) : [],
        added: diffs.reduce((n, d) => n + d.added, 0),
        deleted: diffs.reduce((n, d) => n + d.deleted, 0),
        topDiffs: [...diffs]
          .sort((a, b) => b.added + b.deleted - (a.added + a.deleted))
          .slice(0, 5),
        unpushed: (res.unpushedCommits ?? []).length,
      });
      setLastSync(new Date());
    } catch {
      setGit(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void loadGit();
    const t = setInterval(() => void loadGit(), REFRESH_MS);
    return () => clearInterval(t);
  }, [loadGit]);

  useEffect(() => {
    if (!projectPath) return;
    void window.api.invoke('fs:watch-dir', projectPath).catch(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (_event: any, payload?: { projectPath?: string }) => {
      if (payload?.projectPath && payload.projectPath !== projectPath) return;
      clearTimeout(timer);
      timer = setTimeout(() => void loadGit(), 300);
    };
    window.api.on('fs:dir-changed', onChange);
    window.api.on('git:index-changed', onChange);
    return () => {
      clearTimeout(timer);
      window.api.off('fs:dir-changed', onChange);
      window.api.off('git:index-changed', onChange);
      void window.api.invoke('fs:unwatch-dir', projectPath).catch(() => undefined);
    };
  }, [projectPath, loadGit]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const groups = git
    ? { unstaged: git.unstaged, staged: git.staged, committed: git.committed }
    : null;
  const nUnstaged = git?.unstaged.length ?? 0;
  const nStaged = git?.staged.length ?? 0;
  const nCommitted = git?.committed.length ?? 0;
  const totalFiles = nUnstaged + nStaged + nCommitted;

  return (
    <div
      className={cn(
        'h-7 border-t border-border bg-panel-background/80 backdrop-blur-sm px-3 flex items-center justify-between gap-3 text-[11px] select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {projectName && (
          <Tip
            className="min-w-0"
            content={<ProjectTooltip name={projectName} path={projectPath} count={projectCount} />}
          >
            <span className={cn(item, 'min-w-0 text-violet-400')}>
              <FolderOpen className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[160px]">{projectName}</span>
            </span>
          </Tip>
        )}

        {git && groups && (
          <>
            <Sep />
            <Tip
              content={<BranchTooltip branch={git.branch} unpushed={git.unpushed} dirty={nUnstaged + nStaged} />}
            >
              <span
                className={cn(item, 'text-primary', clickable)}
                onClick={() => setContentViewMode('git')}
              >
                <GitBranch className="w-3 h-3" />
                <span className="font-mono">{git.branch}</span>
              </span>
            </Tip>

            {totalFiles === 0 ? (
              <Tip content={<GitCleanTooltip />}>
                <span className={cn(item, 'text-emerald-400')}>
                  <CheckCircle2 className="w-3 h-3" />
                  Clean
                </span>
              </Tip>
            ) : (
              <span className={cn(item, clickable)} onClick={() => setContentViewMode('git')}>
                <Tip
                  content={
                    <GitOverviewTooltip groups={groups} added={git.added} deleted={git.deleted} />
                  }
                >
                  <span className={cn(item, 'text-text-primary')}>
                    <GitCommit className="w-3 h-3 text-amber-400" />
                    <span className="font-mono font-semibold">{totalFiles}</span>
                    <span className="text-text-secondary">files</span>
                    <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-border">
                      <Segment count={nUnstaged} total={totalFiles} className="bg-amber-400" />
                      <Segment count={nStaged} total={totalFiles} className="bg-sky-400" />
                      <Segment count={nCommitted} total={totalFiles} className="bg-emerald-400" />
                    </span>
                  </span>
                </Tip>

                <Tip content={<GitGroupTooltip group="unstaged" groups={groups} />}>
                  <span className={cn(item, 'text-amber-400')}>
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-mono">{nUnstaged}</span>
                  </span>
                </Tip>

                <Tip content={<GitGroupTooltip group="staged" groups={groups} />}>
                  <span className={cn(item, 'text-sky-400')}>
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    <span className="font-mono">{nStaged}</span>
                  </span>
                </Tip>

                <Tip content={<GitGroupTooltip group="committed" groups={groups} />}>
                  <span className={cn(item, 'text-emerald-400')}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-mono">{nCommitted}</span>
                  </span>
                </Tip>

                <Tip
                  content={
                    <GitLinesTooltip added={git.added} deleted={git.deleted} top={git.topDiffs} />
                  }
                >
                  <span className={item}>
                    <span className="font-mono text-emerald-400">+{git.added}</span>
                    <span className="font-mono text-rose-400">−{git.deleted}</span>
                  </span>
                </Tip>
              </span>
            )}

            {git.unpushed > 0 && (
              <Tip content={<UnpushedTooltip unpushed={git.unpushed} files={nCommitted} />}>
                <span className={cn(item, 'text-sky-400')}>
                  <ArrowUp className="w-3 h-3" />
                  {git.unpushed}
                </span>
              </Tip>
            )}
          </>
        )}

        {projectPath && (
          <Tip content={<RefreshTooltip lastSync={lastSync} everySec={REFRESH_MS / 1000} loading={loading} />}>
            <span
              className={cn(item, 'text-text-secondary', clickable)}
              onClick={() => void loadGit()}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </span>
          </Tip>
        )}

        {(scopeStats.error.length > 0 ||
          scopeStats.diff.length > 0 ||
          scopeStats.warn.length > 0 ||
          scopeStats.primary.length > 0) && (
          <>
            <Sep />
            <Tip
              content={
                <ScopeTooltip
                  error={scopeStats.error.length}
                  diff={scopeStats.diff.length}
                  deleted={scopeStats.deletedPaths.length}
                  warn={scopeStats.warn.length}
                  primary={scopeStats.primary.length}
                />
              }
            >
              <span className={item}>
                <span className="flex items-center gap-1 text-error">
                  <span className="w-2 h-2 rounded-full bg-error shrink-0" />
                  <span className="font-mono">{scopeStats.error.length}</span>
                </span>
                <span className="flex items-center gap-1 text-[#f97316]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${SCOPE_DIFF_DOT}`} />
                  <span className="font-mono">
                    {scopeStats.diff.length - scopeStats.deletedPaths.length}
                  </span>
                  {scopeStats.deletedPaths.length > 0 && (
                    <span className="font-mono">−{scopeStats.deletedPaths.length}</span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-warn">
                  <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
                  <span className="font-mono">{scopeStats.warn.length}</span>
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="font-mono">{scopeStats.primary.length}</span>
                </span>
              </span>
            </Tip>
          </>
        )}

        {debugStatus !== 'idle' && (
          <>
            <Sep />
            <Tip content={<DebugTooltip status={debugStatus} />}>
              <span
                className={cn(item, 'text-emerald-400', clickable)}
                onClick={() => useCodeStore.getState().setActivityPanelTab('debug' as any)}
              >
                <Bug className="w-3 h-3 animate-pulse" />
                {debugStatus === 'starting'
                  ? 'Starting'
                  : debugStatus === 'stopped'
                    ? 'Paused'
                    : 'Debugging'}
              </span>
            </Tip>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Tip content={<ProjectsTooltip count={projectCount} />}>
          <span className={cn(item, 'text-violet-400')}>
            <Layers className="w-3 h-3" />
            {projectCount} projects
          </span>
        </Tip>
        <Sep />
        {unsavedCount > 0 && (
          <>
            <Tip content={<UnsavedTooltip files={Array.from(unsavedSet ?? []).map(String)} />}>
              <span className={cn(item, 'text-rose-400')}>
                <Save className="w-3 h-3" />
                {unsavedCount} unsaved
              </span>
            </Tip>
            <Sep />
          </>
        )}
        <Tip content={<OpenFilesTooltip open={openCount} unsaved={unsavedCount} />}>
          <span className={cn(item, 'text-sky-400')}>
            <FileText className="w-3 h-3" />
            {openCount} open
          </span>
        </Tip>
        <Sep />
        <Tip content={<ViewTooltip views={VIEW_LABELS} current={viewMode} />}>
          <span className={cn(item, 'text-pink-400')}>
            <Eye className="w-3 h-3" />
            {VIEW_LABELS[viewMode] ?? viewMode}
          </span>
        </Tip>
        <Sep />
        <Tip content={<TimeTooltip now={now} />}>
          <span className={cn(item, 'text-text-secondary')}>
            <Clock className="w-3 h-3" />
            {formatTime(now)}
          </span>
        </Tip>
      </div>
    </div>
  );
}