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
import {
  GitBranch,
  Search,
  Plus,
  MoreVertical,
  Pin,
  Share2,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useCodeStore } from '../../hooks/useCodeStore';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

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
  
  const { accentColors, toRgba } = useAccentColors();

  const [branch, setBranch] = useState<string | null>(null);
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [tempSessionTitle, setTempSessionTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const isValidWorkspaceSession = !!activeSession;

  // TaskManager specific state
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewTaskClick = () => {
    window.dispatchEvent(new CustomEvent('phantoma:new-task'));
  };

  return (
    <div
      className="w-full shrink-0 border-b border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center gap-3"
      style={{ height: CONTENT_HEADER_HEIGHT }}
    >
      {/* LEFT SECTION: Session Name + Branch Badge */}
      <div className="flex-1 min-w-0 flex items-center gap-3 z-10">
        {contentViewMode === 'workspace' && activeSession && (
          <>
            {isEditingSession ? (
              <input
                ref={inputRef}
                value={tempSessionTitle}
                onChange={(e) => setTempSessionTitle(e.target.value)}
                onBlur={() => {
                  window.dispatchEvent(new CustomEvent('phantoma:update-session-title', { 
                    detail: { sessionId: activeSession.id, newTitle: tempSessionTitle } 
                  }));
                  setIsEditingSession(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                     window.dispatchEvent(new CustomEvent('phantoma:update-session-title', { 
                      detail: { sessionId: activeSession.id, newTitle: tempSessionTitle } 
                    }));
                    setIsEditingSession(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingSession(false);
                  }
                }}
                className="h-[26px] text-sm font-semibold text-text-primary bg-input border border-primary rounded-md px-2 py-0 focus:outline-none w-full max-w-[240px] shadow-sm"
                autoFocus
              />
            ) : (
              <span 
                onClick={() => {
                  setTempSessionTitle(activeSession.title);
                  setIsEditingSession(true);
                }}
                className="group relative flex items-center gap-1.5 cursor-pointer select-none"
                title="Click to rename session"
              >
                <span className="text-sm font-semibold text-text-primary truncate max-w-[200px] group-hover:text-primary transition-colors">
                  {activeSession.title}
                </span>
                <Pencil className="w-3 h-3 shrink-0 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity absolute -right-4 top-1/2 -translate-y-1/2" />
              </span>
            )}

            {/* Branch Badge next to Session Name */}
            {branch && (() => {
              let hash = 0;
              for (let i = 0; i < branch.length; i++) {
                hash = ((hash << 5) - hash) + branch.charCodeAt(i);
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
        {/* Workspace Quick Actions (FakeUI) */}
        {contentViewMode === 'workspace' && activeWorkspaceSessionId && (
          <>
            <button
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-primary transition-colors cursor-pointer group"
              title="Pin Session"
            >
              <Pin className="w-3.5 h-3.5 group-hover:-rotate-12 transition-transform" />
            </button>
            <button
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-blue-400 transition-colors cursor-pointer"
              title="Share Context"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
              title="Clear Memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-divider mx-1" />
          </>
        )}

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
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-input border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* New Task Button */}
            <button
              onClick={handleNewTaskClick}
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
              title="New Task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </>
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
  );
}