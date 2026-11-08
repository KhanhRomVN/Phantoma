/**
 * ------------------------------------------------------------------
 * FooterTooltips
 * ------------------------------------------------------------------
 * Rich tooltip panels for FooterBar. Each panel is a small detailed UI
 * (bars, rows, chips, lists) that expands the compact item in the bar.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { ArrowUp, CheckCircle2, FolderOpen, GitBranch, GitCommit, Layers } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath } from '@renderer/utils/file-icon';
import type { GitChangeKind } from '../services/git-status-parser';

// ─── Types ──────────────────────────────────────────────────────────────
export interface GitFile {
  path: string;
  kind: GitChangeKind;
}

export interface DiffEntry {
  path: string;
  added: number;
  deleted: number;
}

export type GitGroupKey = 'unstaged' | 'staged' | 'committed';

export interface GitGroups {
  unstaged: GitFile[];
  staged: GitFile[];
  committed: string[];
}

// ─── Shared building blocks ─────────────────────────────────────────────
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

function Row({
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

// ─── Git changes ────────────────────────────────────────────────────────
export function GitOverviewTooltip({
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
  const kinds = { added: 0, modified: 0, deleted: 0 };
  for (const f of [...groups.unstaged, ...groups.staged]) kinds[f.kind]++;
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
      <Bar
        parts={[
          { value: counts.unstaged, className: 'bg-amber-400' },
          { value: counts.staged, className: 'bg-sky-400' },
          { value: counts.committed, className: 'bg-emerald-400' },
        ]}
      />
      <div className="flex flex-col gap-2">
        {(Object.keys(GROUP_META) as GitGroupKey[]).map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <Row
              dot={GROUP_META[k].dot}
              label={GROUP_META[k].label}
              sub={GROUP_META[k].hint}
              value={counts[k]}
              valueClass={GROUP_META[k].text}
            />
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div
                className={cn('h-full', GROUP_META[k].dot)}
                style={{ width: total ? `${(counts[k] / total) * 100}%` : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 pt-2 border-t border-border">
        <span className="text-text-secondary">Working tree</span>
        <Chip className={KIND_META.modified.cls}>M {kinds.modified}</Chip>
        <Chip className={KIND_META.added.cls}>A {kinds.added}</Chip>
        <Chip className={KIND_META.deleted.cls}>D {kinds.deleted}</Chip>
      </div>
      <Hint>Click to open Git view</Hint>
    </Panel>
  );
}

export function GitGroupTooltip({
  group,
  groups,
}: {
  group: GitGroupKey;
  groups: GitGroups;
}) {
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

export function GitLinesTooltip({
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

export function GitCleanTooltip() {
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

// ─── Branch / push / refresh / project ──────────────────────────────────
export function BranchTooltip({
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

export function UnpushedTooltip({ unpushed, files }: { unpushed: number; files: number }) {
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

export function RefreshTooltip({
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

export function ProjectTooltip({
  name,
  path,
  count,
}: {
  name: string;
  path: string;
  count: number;
}) {
  return (
    <Panel width={280} icon={<FolderOpen className="w-3 h-3 text-violet-400" />} title={name}>
      <span className="font-mono text-text-secondary break-all">{path}</span>
      <Row label="Projects loaded" value={count} valueClass="text-violet-400" />
    </Panel>
  );
}

export function ProjectsTooltip({ count }: { count: number }) {
  return (
    <Panel width={200} icon={<Layers className="w-3 h-3 text-violet-400" />} title="Projects">
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-[22px] leading-none font-bold text-violet-400">{count}</span>
        <span className="text-text-secondary pb-0.5">loaded in workspace</span>
      </div>
    </Panel>
  );
}

// ─── Scope ──────────────────────────────────────────────────────────────
export function ScopeTooltip({
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
    { label: 'Conflict risk', sub: 'also changed in another branch', n: error, dot: 'bg-error', text: 'text-error' },
    { label: 'Diverged', sub: `${edited} edited · ${deleted} deleted`, n: diff, dot: 'bg-[#f97316]', text: 'text-[#f97316]' },
    { label: 'Outside scope', sub: 'same as default branch', n: warn, dot: 'bg-warn', text: 'text-warn' },
    { label: 'In scope', sub: 'this branch', n: primary, dot: 'bg-primary', text: 'text-primary' },
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

// ─── Debug ──────────────────────────────────────────────────────────────
export function DebugTooltip({ status }: { status: string }) {
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

// ─── Right side ─────────────────────────────────────────────────────────
export function UnsavedTooltip({ files }: { files: string[] }) {
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

export function OpenFilesTooltip({ open, unsaved }: { open: number; unsaved: number }) {
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

export function ViewTooltip({
  views,
  current,
}: {
  views: Record<string, string>;
  current: string;
}) {
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

export function TimeTooltip({ now }: { now: Date }) {
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