/**
 * ------------------------------------------------------------------
 * FooterBar
 * ------------------------------------------------------------------
 * Flat status bar at the bottom of the Code module (no button/badge
 * styling, only colored text and icons). Every item shows an instant
 * (no delay) rich tooltip panel from FooterTooltips.tsx.
 *
 * Left:  project name, git branch (click opens Git view), changes
 *        overview (total + not added / added / committed segmented bar
 *        with +/- line stats), unpushed commits, refresh.
 * Right: unsaved files, open files, current view mode, clock.
 * Git data comes from the `git:status` IPC and refreshes every 15s.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
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
import { useCodeStore } from '../hooks/useCodeStore';
import { useDebugStore } from '../stores/useDebugStore';
import { SCOPE_DIFF_DOT, useScopeStats } from '../stores/useScopeStatsStore';
import type { GitChangeKind } from '../services/git-status-parser';
import {
  BranchTooltip,
  DebugTooltip,
  GitCleanTooltip,
  GitGroupTooltip,
  GitLinesTooltip,
  GitOverviewTooltip,
  OpenFilesTooltip,
  ProjectsTooltip,
  ProjectTooltip,
  RefreshTooltip,
  ScopeTooltip,
  TimeTooltip,
  TOOLTIP_CLASS,
  UnpushedTooltip,
  UnsavedTooltip,
  ViewTooltip,
} from './FooterTooltips';
import type { DiffEntry, GitFile } from './FooterTooltips';

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
      const res = await window.api.invoke('git:status', projectPath);
      if (!res || res.error) {
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
        'h-7 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-3 flex items-center justify-between gap-3 text-[11px] select-none shrink-0 w-full',
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