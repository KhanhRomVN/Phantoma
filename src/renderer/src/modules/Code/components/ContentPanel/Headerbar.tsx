/**
 * ------------------------------------------------------------------
 * Content Header Bar
 * ------------------------------------------------------------------
 * Extracted from ContentPanel/index.tsx
 * Displays project name, branch, session info, and global actions
 * depending on the current view mode (workspace/tasks/files).
 * ------------------------------------------------------------------
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ContentViewMode } from '../../hooks/useCodeStore';
import {
  Workflow,
  Loader2,
  RefreshCw,
  GitBranch,
  Filter,
  Search,
  Plus,
  MoreVertical,
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
import { useAccentColors } from '@renderer/hooks/useAccentColors';

import { useSessionTasks } from '../../hooks/useSessionTasks';
import { getTempSessionName } from '../ProjectPanel/SessionCard';
import { getProjectIdentity, ProjectIcon } from '../ProjectPanel/ProjectCard';
import { ArchivedTasksModal } from './ArchivedTasksModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Height matches ProjectPanel header (h-[44px]) */
const CONTENT_HEADER_HEIGHT = 44;

// ─── Content Header Bar Component ───────────────────────────────────────────

export function ContentHeaderBar() {
  const contentViewMode = useCodeStore((s) => s.contentViewMode);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const lastViewModeRef = useRef<ContentViewMode>('workspace');

  useEffect(() => {
    if (contentViewMode !== 'agents' && contentViewMode !== 'settings') {
      lastViewModeRef.current = contentViewMode;
    }
  }, [contentViewMode]);

  const hasOrchestrator = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === s.currentProjectId);
    return !!project?.workspacePanels?.some(
      (w) => w.workflowAgentId === 'orchestrator' && w.sessionId === s.activeWorkspaceSessionId,
    );
  });

  const toggleAgents = () =>
    setContentViewMode(contentViewMode === 'agents' ? lastViewModeRef.current : 'agents');

  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const projectName = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.name ?? '';
  });
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });

  const projectLogoPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.logoPath ?? null,
  );

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

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);

  useEffect(() => {
    if (contentViewMode !== 'tasks') {
      setFilterOpen(false);
      setFilterCount(0);
    }
  }, [contentViewMode]);

  useEffect(() => {
    const onCount = (e: Event) => setFilterCount((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('phantoma:task-filter-count', onCount);
    return () => window.removeEventListener('phantoma:task-filter-count', onCount);
  }, []);

  const handleFilterToggle = () => {
    const next = !filterOpen;
    setFilterOpen(next);
    window.dispatchEvent(new CustomEvent('phantoma:task-filter-open', { detail: next }));
  };

  const handleNewTaskClick = () => {
    window.dispatchEvent(new CustomEvent('phantoma:new-task'));
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
              <ProjectIcon color={identity.color} Icon={identity.Icon} logoPath={projectLogoPath} />
              <span className="text-sm font-semibold text-text-primary truncate">
                {projectName}
              </span>
            </>
          )}

          {contentViewMode === 'git' && (
            <span className="text-sm font-semibold text-text-primary truncate">{projectName}</span>
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

          {contentViewMode === 'settings' && (
            <span className="text-sm font-semibold text-text-primary truncate">Settings</span>
          )}

          {contentViewMode === 'agents' && (
            <>
              <span className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 bg-primary/15 text-primary">
                <Workflow className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                Agent Workflow
              </span>
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

              <button
                onClick={() => setArchiveOpen(true)}
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                title="Archived tasks"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleFilterToggle}
                className={`relative w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                  filterOpen
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                }`}
                title="Filter"
              >
                <Filter className="w-3.5 h-3.5" />
                {filterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-[9px] leading-[14px] text-center text-white">
                    {filterCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleNewTaskClick}
                className="w-[26px] h-[26px] rounded-md flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer"
                title="New Task"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </>
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

          {(hasOrchestrator || contentViewMode === 'agents') && (
            <button
              onClick={toggleAgents}
              title={contentViewMode === 'agents' ? 'Close Agent Workflow' : 'Open Agent Workflow'}
              className={`w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                contentViewMode === 'agents'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
            </button>
          )}

          {contentViewMode !== 'tasks' && contentViewMode !== 'settings' && (
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
          )}
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
