/**
 * ------------------------------------------------------------------
 * Content Header Bar
 * ------------------------------------------------------------------
 * Extracted from ContentPanel/index.tsx
 * Displays project name, branch, session info, and global actions
 * depending on the current view mode (workspace/tasks/files).
 * ------------------------------------------------------------------
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  GitBranch,
  Bell,
  Search,
  Plus,
  MoreVertical,
  LayoutGrid,
  List,
  GanttChart,
  Archive,
  Palette,
  FileText,
  Link2,
} from 'lucide-react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { useDesignStore } from '../../hooks/useDesignStore';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

import { useSessionTasks } from '../../hooks/useSessionTasks';
import { getTempSessionName } from '../ProjectPanel/SessionCard';
import { getProjectIdentity } from '../ProjectPanel/ProjectCard';
import { ArchivedTasksModal } from './ArchivedTasksModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Height matches ProjectPanel header (h-[44px]) */
const CONTENT_HEADER_HEIGHT = 44;

// ─── Content Header Bar Component ───────────────────────────────────────────

export function ContentHeaderBar() {
  const contentViewMode = useCodeStore((s) => s.contentViewMode);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const projectName = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.name ?? '';
  });
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });

  const activeWorkspaceSessionId = useCodeStore((s) => s.activeWorkspaceSessionId);

  const activeDesign = useDesignStore(
    (s) => s.designs.find((d) => d.id === s.activeDesignId) ?? null,
  );
  const designLoading = useDesignStore((s) => s.loading);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);

  const { accentColors, toRgba } = useAccentColors();
  const identity = useMemo(
    () => getProjectIdentity((currentProjectId ?? '') + projectName),
    [currentProjectId, projectName],
  );

  const [gitBranch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setBranch(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const gitHead = projectPath.replace(/\/$/, '') + '/.git/HEAD';
        const content: string = await window.api.invoke('fs:read-file', gitHead);
        const match = content?.match(/^ref: refs\/heads\/(.+)$/m);
        if (!cancelled) setBranch(match ? match[1].trim() : null);
      } catch {
        if (!cancelled) setBranch(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Get active session info
  const activeSession = useMemo(() => {
    if (!activeWorkspaceSessionId || !currentProjectId) return null;
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    if (!project || !project.branches) return null;

    for (const b of project.branches) {
      const s = b.sessions.find((sess) => sess.id === activeWorkspaceSessionId);
      if (s) return s;
    }
    return null;
  }, [activeWorkspaceSessionId, currentProjectId]);

  const sessionBranchName = useMemo(() => {
    if (!activeWorkspaceSessionId || !currentProjectId) return null;
    const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
    const owner = project?.branches?.find((b) =>
      b.sessions.some((sess) => sess.id === activeWorkspaceSessionId),
    );
    return owner?.name ?? null;
  }, [activeWorkspaceSessionId, currentProjectId]);

  const branch = sessionBranchName ?? gitBranch;

  const sessionTask = useSessionTasks((s) =>
    activeWorkspaceSessionId ? s.bySession[activeWorkspaceSessionId] : undefined,
  );
  const sessionDisplayName = activeSession
    ? (sessionTask?.title ??
      getTempSessionName(activeSession.id, projectName ?? '', sessionBranchName ?? gitBranch ?? ''))
    : '';

  // TaskManager specific state
  const [searchQuery, setSearchQuery] = useState('');

  const [taskLayout, setTaskLayout] = useState<'board' | 'table' | 'timeline'>(() => {
    try {
      const stored = localStorage.getItem('phantoma:task-layout');
      return stored === 'table' || stored === 'timeline' ? stored : 'board';
    } catch {
      return 'board';
    }
  });
  const [archiveOpen, setArchiveOpen] = useState(false);

  const handleLayoutChange = (layout: 'board' | 'table' | 'timeline') => {
    setTaskLayout(layout);
    try {
      localStorage.setItem('phantoma:task-layout', layout);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new CustomEvent('phantoma:task-layout', { detail: layout }));
  };

  const handleNewTaskClick = () => {
    window.dispatchEvent(new CustomEvent('phantoma:new-task'));
  };

  // Git view state
  const [gitSync, setGitSync] = useState<{
    branch: string;
    hasUpstream: boolean;
    ahead: number;
    behind: number;
    changed: number;
    staged: number;
    stashes: number;
  } | null>(null);
  const [gitBusy, setGitBusy] = useState<'fetch' | 'pull' | 'push' | null>(null);
  const [gitMsg, setGitMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadGitSync = useCallback(async () => {
    if (!projectPath) return;
    try {
      const res = await window.api.invoke('git:sync-info', projectPath);
      setGitSync(res?.error ? null : res);
    } catch {
      setGitSync(null);
    }
  }, [projectPath]);

  useEffect(() => {
    if (contentViewMode !== 'git' || !projectPath) return;
    void loadGitSync();
    const timer = setInterval(() => void loadGitSync(), 15000);
    return () => clearInterval(timer);
  }, [contentViewMode, projectPath, loadGitSync]);

  const runGitOp = async (op: 'fetch' | 'pull' | 'push') => {
    if (!projectPath || gitBusy) return;
    setGitBusy(op);
    try {
      const res = await window.api.invoke(`git:${op}`, projectPath);
      const ok = !res?.error;
      setGitMsg({
        ok,
        text: ok ? `${op[0].toUpperCase()}${op.slice(1)} completed` : String(res.error).split('\n')[0],
      });
      window.dispatchEvent(new CustomEvent('phantoma:git-refresh'));
      await loadGitSync();
    } catch (e: any) {
      setGitMsg({ ok: false, text: e?.message ?? String(e) });
    } finally {
      setGitBusy(null);
      setTimeout(() => setGitMsg(null), 3500);
    }
  };

  return (
    <>
      <div
        className="w-full shrink-0 border-b border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center gap-3"
        style={{ height: CONTENT_HEADER_HEIGHT }}
      >
        {/* LEFT SECTION: Session Name + Branch Badge */}
        <div className="flex-1 min-w-0 flex items-center gap-3 z-10">
          {contentViewMode === 'tasks' && (
            <>
              <span
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0"
                style={{
                  color: identity.color,
                  backgroundColor: `color-mix(in srgb, ${identity.color} 15%, transparent)`,
                }}
              >
                <identity.Icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                {projectName}
              </span>
            </>
          )}

          {contentViewMode === 'git' && (
            <>
              <span
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0"
                style={{
                  color: identity.color,
                  backgroundColor: `color-mix(in srgb, ${identity.color} 15%, transparent)`,
                }}
              >
                <identity.Icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">{projectName}</span>
              {gitSync && (
                <>
                  <span className="flex items-center gap-1.5 text-[11px] font-mono px-1.5 py-0.5 rounded border border-border bg-card-background text-text-secondary shrink-0">
                    <GitBranch className="w-3 h-3" strokeWidth={1.5} />
                    {gitSync.branch}
                  </span>
                  <span
                    title={
                      gitSync.hasUpstream
                        ? `${gitSync.ahead} ahead, ${gitSync.behind} behind upstream`
                        : 'No upstream configured'
                    }
                    className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary shrink-0"
                  >
                    <span className={gitSync.ahead ? 'text-green' : ''}>
                      <ArrowUp className="inline w-3 h-3" />
                      {gitSync.ahead}
                    </span>
                    <span className={gitSync.behind ? 'text-orange-400' : ''}>
                      <ArrowDown className="inline w-3 h-3" />
                      {gitSync.behind}
                    </span>
                  </span>
                  <span
                    title={`${gitSync.changed} changed, ${gitSync.staged} staged`}
                    className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="font-mono">{gitSync.changed}</span>
                  </span>
                  <span
                    title={`${gitSync.stashes} stashes`}
                    className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0"
                  >
                    <Layers className="w-3 h-3" />
                    <span className="font-mono">{gitSync.stashes}</span>
                  </span>
                </>
              )}
              {gitMsg && (
                <span
                  className={`text-[11px] truncate ${gitMsg.ok ? 'text-green' : 'text-red'}`}
                  title={gitMsg.text}
                >
                  {gitMsg.text}
                </span>
              )}
            </>
          )}

          {contentViewMode === 'design' && (
            <>
              <span className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary">
                <Palette className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                {activeDesign?.name ?? 'Design'}
              </span>
              {activeDesign && (
                <>
                  <span
                    title={`${activeDesign.nodes.length} pages`}
                    className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="font-mono">{activeDesign.nodes.length}</span>
                  </span>
                  <span
                    title={`${activeDesign.edges.length} links`}
                    className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0"
                  >
                    <Link2 className="w-3 h-3" />
                    <span className="font-mono">{activeDesign.edges.length}</span>
                  </span>
                </>
              )}
            </>
          )}

          {contentViewMode === 'workspace' && activeSession && (
            <>
              <span
                className="text-sm font-semibold text-text-primary truncate max-w-[200px]"
                title={sessionDisplayName}
              >
                {sessionDisplayName}
              </span>

              {/* Branch Badge next to Session Name */}
              {branch &&
                (() => {
                  let hash = 0;
                  for (let i = 0; i < branch.length; i++) {
                    hash = (hash << 5) - hash + branch.charCodeAt(i);
                    hash |= 0;
                  }
                  const colorIndex = Math.abs(hash) % accentColors.length;
                  const branchColor = accentColors[colorIndex];

                  return (
                    <span
                      className="flex items-center gap-1.5 text-[11px] font-mono px-1.5 py-0.5 rounded cursor-default border shrink-0"
                      style={{
                        color: branchColor,
                        backgroundColor: toRgba(branchColor, 0.1),
                        borderColor: toRgba(branchColor, 0.2),
                      }}
                    >
                      <GitBranch className="w-3 h-3" strokeWidth={1.5} />
                      {branch}
                    </span>
                  );
                })()}
            </>
          )}
        </div>

        {/* RIGHT SECTION: Actions */}
        <div className="shrink-0 flex items-center gap-2 z-10">
          {/* Task Manager Controls — Only visible when tasks view is active */}
          {contentViewMode === 'tasks' && (
            <>
              {/* Search Bar */}
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    window.dispatchEvent(
                      new CustomEvent('phantoma:task-search', { detail: e.target.value }),
                    );
                  }}
                  placeholder="Search tasks..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 transition-colors"
                />
              </div>

              <div className="h-[26px] p-0.5 rounded-md border border-border bg-card-background flex items-center gap-0.5">
                {(
                  [
                    ['board', LayoutGrid, 'Board view'],
                    ['table', List, 'Table view'],
                    ['timeline', GanttChart, 'Timeline view'],
                  ] as const
                ).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    onClick={() => handleLayoutChange(key)}
                    title={label}
                    className={`w-[22px] h-full rounded flex items-center justify-center transition-colors cursor-pointer ${
                      taskLayout === key
                        ? 'bg-primary/15 text-primary'
                        : 'text-text-primary/80 hover:text-text-primary hover:bg-card-hover'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setArchiveOpen(true)}
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                title="Archived tasks"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              <Dropdown trigger="click" align="end">
                <DropdownTrigger asChild>
                  <button
                    className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </DropdownTrigger>
                <DropdownContent>
                  <div className="w-[260px] py-6 flex flex-col items-center gap-2 text-center">
                    <span className="w-9 h-9 rounded-xl bg-card-hover grid place-items-center text-text-secondary">
                      <Bell className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                    <p className="text-xs font-medium text-text-primary">No notifications</p>
                    <p className="text-[11px] text-text-secondary">You are all caught up.</p>
                  </div>
                </DropdownContent>
              </Dropdown>

              <button
                onClick={handleNewTaskClick}
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer"
                title="New Task"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {contentViewMode === 'git' && (
            <div className="h-[28px] p-0.5 rounded-md border border-border bg-card-hover flex items-center gap-0.5">
              {(
                [
                  ['fetch', Download, 'Fetch all remotes'],
                  ['pull', ArrowDown, 'Pull'],
                  ['push', ArrowUp, 'Push'],
                ] as const
              ).map(([op, Icon, label]) => (
                <button
                  key={op}
                  onClick={() => void runGitOp(op)}
                  disabled={gitBusy !== null}
                  title={label}
                  className="h-full px-2 rounded flex items-center gap-1 text-[11px] font-medium text-text-primary hover:bg-card-background transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gitBusy === op ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">{op}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('phantoma:git-refresh'));
                  void loadGitSync();
                }}
                title="Refresh"
                className="w-[24px] h-full rounded flex items-center justify-center text-text-primary hover:bg-card-background transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {contentViewMode === 'design' && (
            <button
              onClick={() => projectPath && void loadDesigns(projectPath)}
              disabled={designLoading || !projectPath}
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reload designs"
            >
              {designLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Global More Options */}
          <Dropdown trigger="click" align="end">
            <DropdownTrigger asChild>
              <button
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                title="More options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem disabled>No actions available yet</DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>
      <ArchivedTasksModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        projectPath={projectPath}
      />
    </>
  );
}
