/**
 * ------------------------------------------------------------------
 * FooterBar
 * ------------------------------------------------------------------
 * Flat status bar at the bottom of the Code module (no button/badge
 * styling, only colored text and icons).
 *
 * Left:  project name, git branch (click opens Git view), working tree
 *        changes with +/- line stats, unpushed commits, refresh.
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
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { useCodeStore } from '../hooks/useCodeStore';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface FooterBarProps {
  className?: string;
}

interface GitInfo {
  branch: string;
  changed: number;
  added: number;
  deleted: number;
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

function Sep() {
  return <span className="h-3 w-px bg-border shrink-0" />;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Component ──────────────────────────────────────────────────────────
export function FooterBar({ className }: FooterBarProps) {
  const projectName = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.name ?? '',
  );
  const projectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path ?? '',
  );
  const unsavedCount = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.unsavedFiles.size ?? 0,
  );
  const openCount = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.openFiles.length ?? 0,
  );
  const viewMode = useCodeStore((s) => s.contentViewMode);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);

  const [git, setGit] = useState<GitInfo | null>(null);
  const [loading, setLoading] = useState(false);
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
      const stats = Object.values(res.diffStats ?? {}) as { added: number; deleted: number }[];
      setGit({
        branch: res.branch || 'detached',
        changed: String(res.output ?? '')
          .split('\n')
          .filter((l) => l.trim()).length,
        added: stats.reduce((n, s) => n + s.added, 0),
        deleted: stats.reduce((n, s) => n + s.deleted, 0),
        unpushed: (res.unpushedCommits ?? []).length,
      });
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
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className={cn(
        'h-7 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-3 flex items-center justify-between gap-3 text-[11px] select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {projectName && (
          <span className={cn(item, 'min-w-0 text-violet-400')} title={projectPath}>
            <FolderOpen className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[160px]">{projectName}</span>
          </span>
        )}

        {git && (
          <>
            <Sep />
            <span
              className={cn(item, 'text-primary', clickable)}
              onClick={() => setContentViewMode('git')}
              title="Open Git view"
            >
              <GitBranch className="w-3 h-3" />
              <span className="font-mono">{git.branch}</span>
            </span>

            {git.changed === 0 ? (
              <span className={cn(item, 'text-emerald-400')} title="Working tree clean">
                <CheckCircle2 className="w-3 h-3" />
                Clean
              </span>
            ) : (
              <span
                className={cn(item, 'text-amber-400')}
                title={`${git.changed} changed file(s), +${git.added} −${git.deleted}`}
              >
                <GitCommit className="w-3 h-3" />
                {git.changed} changed
                <span className="font-mono text-emerald-400">+{git.added}</span>
                <span className="font-mono text-rose-400">−{git.deleted}</span>
              </span>
            )}

            {git.unpushed > 0 && (
              <span className={cn(item, 'text-sky-400')} title={`${git.unpushed} commit(s) not pushed`}>
                <ArrowUp className="w-3 h-3" />
                {git.unpushed}
              </span>
            )}
          </>
        )}

        {projectPath && (
          <span
            className={cn(item, 'text-text-secondary', clickable)}
            onClick={() => void loadGit()}
            title="Refresh git status"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {unsavedCount > 0 && (
          <>
            <span className={cn(item, 'text-rose-400')} title="Files with unsaved changes">
              <Save className="w-3 h-3" />
              {unsavedCount} unsaved
            </span>
            <Sep />
          </>
        )}
        <span className={cn(item, 'text-sky-400')} title="Open files">
          <FileText className="w-3 h-3" />
          {openCount} open
        </span>
        <Sep />
        <span className={cn(item, 'text-pink-400')} title="Current view">
          <Eye className="w-3 h-3" />
          {VIEW_LABELS[viewMode] ?? viewMode}
        </span>
        <Sep />
        <span className={cn(item, 'text-text-secondary')} title={now.toLocaleString()}>
          <Clock className="w-3 h-3" />
          {formatTime(now)}
        </span>
      </div>
    </div>
  );
}