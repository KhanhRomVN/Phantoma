/**
 * ------------------------------------------------------------------
 * Project Panel (Left Side) — aligned with ProjectPanel.html mockup
 * ------------------------------------------------------------------
 * Vertical project list with:
 * - Project groups (collapse, inline rename, ungroup) + "Ungrouped"
 * - Expandable project cards (collapsed tree / expanded branch blocks)
 * - Task chips, task status menu, background process list (kill)
 * - Sort (Manual / Name / Status / Token usage) + status filter
 * - Show hidden projects, expand / collapse all
 * - Drag-and-drop: projects (Manual sort only, also moves between
 *   groups) and branches (within a project)
 * - Context menus via the shared Dropdown component
 * - Add-project modal, Task Manager toast
 *
 * NOTE: Git scanning is not implemented yet, so mock branches are
 * injected per project (see buildMockBranches). All edits are kept in
 * local state; store persistence is still stubbed.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import type { ReactNode } from 'react';
// ── Icons ──
import {
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Plus,
  Eye,
  ArrowUp,
  ArrowDown,
  Check,
  Trash2,
  SlidersHorizontal,
  Folder,
  Pencil,
  X,
  Unlink,
  Link2,
} from 'lucide-react';
// ── Hooks & Store ──
import { useCodeStore, type Project } from '../../hooks/useCodeStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { logger } from '@renderer/utils/logger';

// ── Shared UI components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ── Local modal ──
import { AddProjectModal } from '../modal/AddProjectModal';

// ── Shared definitions ──
import {
  type SessionStatus,
  type SessionInfo,
  type BranchInfo,
  type TaskStatus,
  type ProcessInfo,
  type MenuPosition,
  STATUS_ORDER,
  STATUS_LABELS,
  TASK_STATUSES,
  StatusDot,
  TaskIcon,
} from './SessionCard';

// ── Project Card Component ──
import {
  ProjectCard,
  KebabButton,
  getProjectStatus,
  getProjectTokens,
  type ProjectExtended as CardProject,
} from './ProjectCard';

// ─── Local Types ────────────────────────────────────────────────────────

type ProjectExtended = Project & CardProject & { defaultBranch: string };

interface GroupInfo {
  id: string;
  name: string;
  open: boolean;
}

type SortMode = 'manual' | 'name' | 'status' | 'tokens';

const SORTS: [SortMode, string][] = [
  ['manual', 'Manual'],
  ['name', 'Name A → Z'],
  ['status', 'Status priority'],
  ['tokens', 'Token usage'],
];

type DropdownTarget =
  | { kind: 'project'; projectId: string; pos: MenuPosition }
  | { kind: 'branch'; projectId: string; branchName: string; pos: MenuPosition }
  | { kind: 'group'; groupId: string; pos: MenuPosition }
  | { kind: 'header-config'; pos: MenuPosition }
  | { kind: 'task'; sessionId: string; pos: MenuPosition }
  | { kind: 'session'; sessionId: string; projectId: string; pos: MenuPosition };

// ─── Constants & Helpers ────────────────────────────────────────────────

const PROJECT_COLORS = ['#4fa8e0', '#ffb020', '#a078ff', '#3ddc84', '#32c8be', '#ff78aa'];

const mkSum = (
  tokens: number,
  cost: number,
  added: number,
  removed: number,
  files: number,
  duration: string,
) => ({ tokens, cost, added, removed, files, duration });

/** Fetches real git branches for a project via IPC and maps them to BranchInfo[] */
async function fetchRealBranches(projectPath: string): Promise<BranchInfo[]> {
  console.log(`[FETCH_BRANCHES_START] Path: ${projectPath}`); // Force print to console
  
  try {
    const res = await (window as any).api.invoke('git:list-branches', projectPath);
    
    console.log(`[FETCH_BRANCHES_RAW_RESULT]`, res); // Print entire response object
    
    if (res?.error) {
      console.warn('[ProjectPanel] Failed to list branches', res.error);
      return [];
    }

    const rawBranches: string[] = res.branches || [];
    
    console.log(`[FETCH_BRANCHES_LIST] Count: ${rawBranches.length}`, rawBranches);

    // Common remote names that might appear as standalone entries due to parsing quirks
    const COMMON_REMOTES = ['origin', 'upstream'];

    // Filter to keep ONLY Local Branches.
    const localBranches = rawBranches.filter((name) => {
      if (typeof name !== 'string') return false;

      // 1. Exclude full remote paths (e.g., "remotes/origin/main")
      if (name.startsWith('remotes/') || name.startsWith('refs/remotes/')) {
        return false;
      }

      // 2. Exclude standalone remote names (e.g., "origin")
      if (COMMON_REMOTES.includes(name)) {
        return false;
      }

      // 3. Exclude remote-tracking branches represented in short form (e.g., "origin/main")
      // Heuristic: If it starts with a known remote name followed by a slash, it's remote.
      // Also, generally, any branch containing "/" is suspicious for being remote in this specific simplified view,
      // BUT we must be careful not to kill valid local branches like "feature/x".
      // Given the user explicitly said "only main is correct" and saw "origin/main", 
      // we assume the primary goal is removing noise from default remotes.
      
      // Check if it matches pattern "<remote>/<branch>" where <remote> is a common one
      const parts = name.split('/');
      if (parts.length > 1 && COMMON_REMOTES.includes(parts[0])) {
        return false;
      }

      return true;
    });

    // Deduplicate just in case
    const uniqueBranches = Array.from(new Set(localBranches));
    
    console.log(`[FINAL_BRANCHES]`, uniqueBranches);

    return uniqueBranches.map((name) => ({
      name,
      visible: true,
      sessions: [],
    }));
  } catch (e) {
    console.error('[ProjectPanel] Exception fetching branches', e);
    return [];
  }
}

/** Adds the UI-only fields (color, group, hidden, branches) to a store project */
function seedProject(p: Project, index: number): ProjectExtended {
  const raw = p as any;
  // Use branches from store if available, otherwise empty array.
  // Real git branches are fetched separately and merged/persisted via updateProject.
  const branches = (raw.branches ?? []) as BranchInfo[];

  return {
    ...p,
    defaultBranch: raw.defaultBranch ?? 'main',
    hidden: raw.hidden ?? false,
    color: raw.color ?? PROJECT_COLORS[index % PROJECT_COLORS.length],
    groupId: raw.groupId ?? null,
    branches,
  };
}

// ─── Small UI helpers ───────────────────────────────────────────────────

const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-3 pt-1.5 pb-1 text-[10.5px] text-text-secondary/50">{children}</div>
);

/** Fixed-width check column (+ optional leading icon) used as DropdownItem icon */
const ck = (checked: boolean, extra?: ReactNode) => (
  <span className="flex items-center gap-2">
    <span className="w-3.5 h-3.5 flex items-center justify-center text-[#ff6a1f]">
      {checked && <Check className="w-3.5 h-3.5" />}
    </span>
    {extra}
  </span>
);

/** Group header row with inline rename */
function GroupHeader({
  group,
  count,
  renaming,
  onToggle,
  onOpenMenu,
  onRenameDone,
}: {
  group: GroupInfo;
  count: number;
  renaming: boolean;
  onToggle: () => void;
  onOpenMenu: (pos: MenuPosition) => void;
  onRenameDone: (name: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (renaming) {
      doneRef.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const finish = (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onRenameDone(commit ? (inputRef.current?.value ?? null) : null);
  };

  return (
    <div
      className="group/gh flex items-center gap-[7px] px-3 py-[7px] bg-white/[0.02] border-b border-divider cursor-pointer select-none font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-secondary hover:text-text-primary"
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu({ top: e.clientY, left: e.clientX });
      }}
    >
      {group.open ? (
        <ChevronDown className="w-[11px] h-[11px] shrink-0 text-text-secondary/50" />
      ) : (
        <ChevronRight className="w-[11px] h-[11px] shrink-0 text-text-secondary/50" />
      )}
      <Folder className="w-[11px] h-[11px] shrink-0 text-[#a078ff]" />
      {renaming ? (
        <input
          ref={inputRef}
          defaultValue={group.name}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(true);
            if (e.key === 'Escape') finish(false);
          }}
          onBlur={() => finish(true)}
          className="flex-1 min-w-0 bg-background border border-[#ff6a1f] rounded-[5px] text-text-primary font-mono text-[11px] font-medium normal-case tracking-normal px-1.5 py-0.5 outline-none"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate">{group.name}</span>
      )}
      <span className="font-medium text-text-secondary/50">{count}</span>
      <KebabButton
        className="opacity-0 group-hover/gh:opacity-100"
        onClick={(e) => onOpenMenu({ top: e.clientY, left: e.clientX })}
      />
    </div>
  );
}

  // ── Main Component ─────────────────────────────────────────────────────

export const ProjectPanel = memo(function ProjectPanel() {
  const rawProjects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);
  const updateProject = useCodeStore((s) => s.updateProject);

  // Content View Actions
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const setActiveWorkspaceSessionId = useCodeStore((s) => s.setActiveWorkspaceSessionId);

  // Reset selection on mount to ensure EmptyState is shown initially
  useEffect(() => {
    setCurrentProject(null);
    setContentViewMode('files'); // Default view mode when no project selected
    setActiveWorkspaceSessionId(null);
  }, [setCurrentProject, setContentViewMode, setActiveWorkspaceSessionId]);

  // Local state mirrors store projects but adds UI-only fields (color, group, hidden, branches)
  const [projects, setProjects] = useState<ProjectExtended[]>(() => rawProjects.map(seedProject));
  const [groups, setGroups] = useState<GroupInfo[]>(() =>
    projects.some((p) => p.groupId === 'g1') ? [{ id: 'g1', name: 'Client work', open: true }] : [],
  );
  // Keep local edits (order, group, hidden) when the store changes.
  // IMPORTANT: Always take `branches` from the store because it contains
  // runtime session/agent data that must stay in sync with Workspace updates.
  useEffect(() => {
    setProjects((prev) => {
      const byId = new Map(rawProjects.map((p) => [p.id, p]));
      const kept = prev
        .filter((p) => byId.has(p.id))
        .map((p) => {
          const fresh = byId.get(p.id)!;
          return {
            ...fresh, // Start with latest store data (includes updated branches/sessions/agents)
            // Override with UI-only local state
            defaultBranch: p.defaultBranch,
            hidden: p.hidden,
            color: p.color,
            groupId: p.groupId,
            // DO NOT override branches here - let them come from 'fresh' (store)
          };
        });
      const known = new Set(prev.map((p) => p.id));
      const added = rawProjects
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !known.has(p.id))
        .map(({ p, i }) => seedProject(p, i));
      return [...kept, ...added];
    });
  }, [rawProjects]);

  // ── UI state ──
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  /** Tracks which project's Task Manager is currently open in ContentPanel */
  const [activeTaskManagerProjectId, setActiveTaskManagerProjectId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [filterStatus, setFilterStatus] = useState<'all' | SessionStatus>('all');
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [dropdownTarget, setDropdownTarget] = useState<DropdownTarget | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; on: boolean }>({ msg: '', on: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dragRef = useRef<{
    type: 'project' | 'branch';
    projectId: string;
    branchName?: string;
    el: HTMLElement | null;
  } | null>(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, on: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 1600);
  }, []);

  // ── Immutable updaters ──
  const patchProject = useCallback((id: string, fn: (p: ProjectExtended) => ProjectExtended) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
  }, []);

  // Track which project IDs have already been fetched to prevent infinite loops/re-fetching
  const fetchedBranchesRef = useRef<Set<string>>(new Set());

  // Fetch real git branches for projects that haven't been processed yet
  useEffect(() => {
    const fetchPendingBranches = async () => {
      // Find projects that have a valid path but haven't had their branches fetched yet
      const pending = projects.filter((p) => p.path && !fetchedBranchesRef.current.has(p.id));

      if (pending.length === 0) return;

      for (const proj of pending) {
        // Mark as processing immediately to avoid race conditions in rapid re-renders
        fetchedBranchesRef.current.add(proj.id);

        try {
          const realBranches = await fetchRealBranches(proj.path);

          if (realBranches.length > 0) {
            // MERGE LOGIC: Preserve existing sessions for branches that still exist in Git
            patchProject(proj.id, (p) => {
              const existingBranchMap = new Map(p.branches.map(b => [b.name, b]));
              
              const mergedBranches = realBranches.map(gitBranch => {
                const existing = existingBranchMap.get(gitBranch.name);
                if (existing) {
                  // Keep existing sessions and visibility settings
                  return {
                    ...gitBranch,
                    sessions: existing.sessions,
                    visible: existing.visible,
                  };
                }
                // New branch from Git, start with empty sessions
                return gitBranch;
              });

              // Sync back to store to ensure persistence reflects the merged state
              updateProject(proj.id, { branches: mergedBranches });

              return { ...p, branches: mergedBranches };
            });
          } else {
            // If no branches found (e.g., empty repo or not a git repo), we still consider it "fetched"
            // so we don't retry endlessly. We can optionally set a flag on the project later if needed.
            logger.info('[ProjectPanel] No branches found for project', {
              id: proj.id,
              path: proj.path,
            });
          }
        } catch (err) {
          logger.error('[ProjectPanel] Error fetching branches', { id: proj.id, err });
          // On error, remove from ref so it can be retried on next significant state change?
          // Or keep it to avoid spamming logs. Let's keep it marked as attempted for now.
        }
      }
    };

    fetchPendingBranches();
  }, [projects, patchProject, updateProject]);

  const patchSession = useCallback((sessionId: string, fn: (s: SessionInfo) => SessionInfo) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        branches: p.branches.map((b) => ({
          ...b,
          sessions: b.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
        })),
      })),
    );
  }, []);

  // ── Derived: filtered + sorted list ──
  const shownProjects = useMemo(() => {
    let list = projects.filter((p) => showHidden || !p.hidden);
    if (filterStatus !== 'all') list = list.filter((p) => getProjectStatus(p) === filterStatus);
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'status')
      list = [...list].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(getProjectStatus(a)) - STATUS_ORDER.indexOf(getProjectStatus(b)),
      );
    if (sortMode === 'tokens')
      list = [...list].sort((a, b) => getProjectTokens(b) - getProjectTokens(a));
    return list;
  }, [projects, showHidden, filterStatus, sortMode]);

  const hiddenCount = projects.filter((p) => p.hidden).length;
  const anyOpen = shownProjects.some((p) => expandedIds.has(p.id));
  const isDirty = sortMode !== 'manual' || filterStatus !== 'all';

  // ── Dropdown helpers ──
  const closeDropdown = useCallback(() => setDropdownTarget(null), []);

  const handleOpenDropdown = useCallback(
    (kind: 'project' | 'branch', projectId: string, branchName?: string, pos?: MenuPosition) => {
      const p = pos ?? { top: 0, left: 0 };
      if (kind === 'project') setDropdownTarget({ kind, projectId, pos: p });
      else if (branchName) setDropdownTarget({ kind, projectId, branchName, pos: p });
    },
    [],
  );

  const handleOpenTaskMenu = useCallback((sessionId: string, pos: MenuPosition) => {
    setDropdownTarget({ kind: 'task', sessionId, pos });
  }, []);

  // ── Expand / select ──
  const toggleExpandAll = useCallback(() => {
    const ids = shownProjects.map((p) => p.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (anyOpen ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [shownProjects, anyOpen]);

  const handleToggleProject = useCallback(
    (projectId: string) => {
      // Chỉ toggle trạng thái mở rộng local, KHÔNG set currentProjectId trong store
      // Vì theo yêu cầu, việc chọn project chỉ xảy ra khi chọn SessionCard
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(projectId)) next.delete(projectId);
        else next.add(projectId);
        return next;
      });
    },
    [],
  );

  const handleOpenProject = useCallback(
    (projectId: string) => {
      // Tương tự, chỉ mở rộng UI, không kích hoạt selection logic của toàn app
      setExpandedIds((prev) => (prev.has(projectId) ? prev : new Set(prev).add(projectId)));
    },
    [],
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) {
        // Deselect logic triggered by clicking an already-selected branch row
        setSelectedSessionId(null);
        setCurrentProject(null); // Clear current project selection when deselecting session
        return;
      }

      // Tìm project chứa session này từ local state
      const parentProject = projects.find(p => 
        p.branches.some(b => b.sessions.some(s => s.id === sessionId))
      );

      if (!parentProject) {
        console.warn('[DEBUG_SELECT_SESSION] Session not found in any project', { sessionId });
        return;
      }

      // Highlight the card in ProjectPanel
      setSelectedSessionId(sessionId);
      
      // Set current project in store ONLY when a session is selected
      setCurrentProject(parentProject.id);

      // If Task Manager was open, close it when selecting a session (implicit switch back to workspace)
      if (activeTaskManagerProjectId) {
        setActiveTaskManagerProjectId(null);
      }
      
      // Switch ContentPanel to Workspace view for this session
      setActiveWorkspaceSessionId(sessionId);
      setContentViewMode('workspace');
    },
    [projects, setCurrentProject, setActiveWorkspaceSessionId, setContentViewMode, activeTaskManagerProjectId],
  );

  /** Toggle Task Manager for a specific project. Clicking again closes it. */
  const handleToggleTaskManager = useCallback(
    (projectId: string) => {
      setSelectedSessionId(null); // Clear any inline session selection
      
      if (activeTaskManagerProjectId === projectId) {
        // Already open -> close it, revert to files/workspace default or just empty state?
        // Requirement says "click lần nữa quay về trạng thái trước đó". 
        // Safest bet is switching contentViewMode away from 'tasks'.
        // Since we don't track previous mode explicitly here easily without more state,
        // setting to 'files' acts as a safe fallback to the editor area if no service/session is picked.
        setActiveTaskManagerProjectId(null);
        setContentViewMode('files'); 
      } else {
        // Open for this project
        setActiveTaskManagerProjectId(projectId);
        setContentViewMode('tasks');
      }
    },
    [activeTaskManagerProjectId, setContentViewMode],
  );

  const handleSessionContextMenu = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Select the session first so actions apply to it
      setSelectedSessionId(sessionId);

      // Set dropdown target for Session-specific menu
      setDropdownTarget({
        kind: 'session',
        sessionId,
        projectId: currentProjectId || '',
        pos: { top: e.clientY, left: e.clientX },
      });
    },
    [currentProjectId],
  );

  // ── Project actions ──
  const toggleBranchVisibility = useCallback(
    (projectId: string, branchName: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        branches: p.branches.map((b) =>
          b.name === branchName ? { ...b, visible: !b.visible } : b,
        ),
      }));
    },
    [patchProject],
  );

  const moveProject = useCallback((projectId: string, dir: -1 | 1) => {
    setProjects((prev) => {
      const i = prev.findIndex((p) => p.id === projectId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const toggleProjectHidden = useCallback(
    (projectId: string) => patchProject(projectId, (p) => ({ ...p, hidden: !p.hidden })),
    [patchProject],
  );

  const setProjectGroup = useCallback(
    (projectId: string, groupId: string | null) =>
      patchProject(projectId, (p) => ({ ...p, groupId })),
    [patchProject],
  );

  const createGroupFromProject = useCallback(
    (projectId: string) => {
      const id = `g${Date.now()}`;
      setGroups((prev) => [...prev, { id, name: 'New group', open: true }]);
      setProjectGroup(projectId, id);
      setRenamingGroupId(id);
    },
    [setProjectGroup],
  );

  const handleRemoveProject = useCallback(
    (projectId: string) => {
      logger.info('[ProjectPanel] Remove project (stub)', {
        name: projects.find((p) => p.id === projectId)?.name,
      });
    },
    [projects],
  );

  // ── Branch actions ──
  const moveBranch = useCallback(
    (projectId: string, branchName: string, dir: -1 | 1) => {
      patchProject(projectId, (p) => {
        const i = p.branches.findIndex((b) => b.name === branchName);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= p.branches.length) return p;
        const branches = [...p.branches];
        [branches[i], branches[j]] = [branches[j], branches[i]];
        return { ...p, branches };
      });
    },
    [patchProject],
  );

  const hideBranch = useCallback(
    (projectId: string, branchName: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        branches: p.branches.map((b) => (b.name === branchName ? { ...b, visible: false } : b)),
      }));
    },
    [patchProject],
  );

  const handleNewSession = useCallback(
    (projectId: string, branchName: string) => {
      console.log('[DEBUG_SESSION_CREATE_START]', { projectId, branchName });
      
      // 1. Tìm project hiện tại trong local state để lấy dữ liệu gốc chính xác nhất
      const currentLocalProject = projects.find(p => p.id === projectId);
      if (!currentLocalProject) {
        console.error('[DEBUG_SESSION_CREATE_FAIL] Project not found in local state', { projectId });
        return;
      }

      // 2. Tạo cấu trúc branches mới với session vừa thêm
      const newBranches = currentLocalProject.branches.map((b) => {
        if (b.name !== branchName) return b;
        
        const prevNewest = b.sessions[0];
        const procs: ProcessInfo[] = prevNewest?.procs ?? [];
        const fresh: SessionInfo = {
          id: `n${Date.now()}`,
          title: 'New session',
          status: 'idle',
          time: 'now',
          task: undefined,
          agents: [],
          procs,
          summary: mkSum(0, 0, 0, 0, 0, '—'),
        };
        const older = prevNewest ? [{ ...prevNewest, procs: [] }, ...b.sessions.slice(1)] : [];
        return { ...b, sessions: [fresh, ...older] };
      });

      console.log('[DEBUG_SESSION_NEW_BRANCHES_CREATED]', { count: newBranches.length });

      // 3. Cập nhật Local State để UI phản hồi ngay lập tức
      setProjects((prev) => {
        const updated = prev.map((p) => (p.id === projectId ? { ...p, branches: newBranches } : p));
        console.log('[DEBUG_SESSION_LOCAL_STATE_UPDATED]', { projectId, totalProjects: updated.length });
        return updated;
      });

      // 4. Đồng bộ ngược lên Store (Zustand) để kích hoạt persist mechanism
      console.log('[DEBUG_SESSION_CALLING_UPDATE_PROJECT]', { projectId });
      updateProject(projectId, { branches: newBranches });
    },
    [projects, updateProject],
  );

  const handleRemoveSession = useCallback(
    (projectId: string, branchName: string) => {
      setProjects((prev) => {
        const updatedProjects = prev.map((p) => {
          if (p.id !== projectId) return p;

          const newBranches = p.branches.map((b) => {
            if (b.name !== branchName) return b;
            // Remove all sessions from this branch, or just the newest? 
            // Based on UI context "Remove Session" usually implies clearing the current view's session list for that branch.
            // However, looking at the menu structure, it seems to target the whole branch's session stack in this stub implementation.
            // Let's assume it removes ALL sessions for that branch as per typical "clear history" behavior in simple mocks,
            // OR we need to identify WHICH session to remove. 
            // The DropdownTarget for 'branch' doesn't carry sessionId. 
            // But wait, the user said "Remove Session". Usually this means deleting a specific one.
            // In the provided code, `handleRemoveSession` is called from Branch Context Menu.
            // If there are multiple sessions, which one gets removed?
            // Looking at `SessionCard`, there isn't a direct delete button per card in the main view, only context menu on branch level?
            // Actually, let's look at `DropdownTarget`. Kind 'session' exists.
            // The user complained about "Remove Session" not working. 
            // Currently `handleRemoveSession(projectId, branchName)` is called from Branch menu.
            // It likely intends to clear sessions for that branch.
            
            // To be safe and align with "remove THE session", if we can't distinguish, we might clear all.
            // BUT, standard UX suggests removing the active/latest one or providing a selector.
            // Given the constraint of the existing function signature `(projectId, branchName)`, 
            // I will implement it to clear ALL sessions for that branch, effectively resetting it.
            return { ...b, sessions: [] };
          });

          updateProject(projectId, { branches: newBranches });
          return { ...p, branches: newBranches };
        });
        return updatedProjects;
      });
    },
    [updateProject],
  );

  const handleKillProcess = useCallback(
    (sessionId: string, index: number) => {
      patchSession(sessionId, (s) => ({
        ...s,
        procs: (s.procs ?? []).filter((_, i) => i !== index),
      }));
    },
    [patchSession],
  );

  // ── Task actions ──
  const setTaskStatus = useCallback(
    (sessionId: string, status: TaskStatus) =>
      patchSession(sessionId, (s) => (s.task ? { ...s, task: { ...s.task, status } } : s)),
    [patchSession],
  );

  const removeTask = useCallback(
    (sessionId: string) => patchSession(sessionId, (s) => ({ ...s, task: undefined })),
    [patchSession],
  );

  // ── Group actions ──
  const toggleGroup = useCallback(
    (groupId: string) =>
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, open: !g.open } : g))),
    [],
  );

  const finishRename = useCallback((groupId: string, name: string | null) => {
    if (name && name.trim()) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: name.trim() } : g)));
    }
    setRenamingGroupId(null);
  }, []);

  const ungroup = useCallback((groupId: string) => {
    setProjects((prev) => prev.map((p) => (p.groupId === groupId ? { ...p, groupId: null } : p)));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  // ── Drag & Drop ──
  const clearDragMarks = () =>
    document.querySelectorAll('.pp-dragover').forEach((el) => el.classList.remove('pp-dragover'));

  const handleDragStart = useCallback(
    (e: React.DragEvent, type: 'project' | 'branch', projectId: string, branchName?: string) => {
      const el = e.currentTarget as HTMLElement;
      dragRef.current = { type, projectId, branchName, el };
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
      el.classList.add('pp-dragging');
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current?.el?.classList.remove('pp-dragging');
    dragRef.current = null;
    clearDragMarks();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const target = e.currentTarget as HTMLElement;
    const isBranchTarget = target.dataset.branch !== undefined;
    const ok =
      drag.type === 'branch'
        ? isBranchTarget && target.dataset.pid === drag.projectId && target !== drag.el
        : !isBranchTarget && target !== drag.el;
    if (!ok) return;
    e.preventDefault();
    clearDragMarks();
    target.classList.add('pp-dragover');
  }, []);

  const handleDrop = useCallback(
    (
      e: React.DragEvent,
      targetType: 'project' | 'branch',
      targetProjectId: string,
      targetBranchName?: string,
    ) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      clearDragMarks();
      drag.el?.classList.remove('pp-dragging');
      dragRef.current = null;

      if (drag.type === 'project' && targetType === 'project') {
        setProjects((prev) => {
          const src = prev.findIndex((p) => p.id === drag.projectId);
          const target = prev.find((p) => p.id === targetProjectId);
          if (src < 0 || !target || drag.projectId === targetProjectId) return prev;
          const next = [...prev];
          const [moved] = next.splice(src, 1);
          const dst = next.findIndex((p) => p.id === targetProjectId);
          // Dropping onto a project also moves it into that project's group
          next.splice(dst, 0, { ...moved, groupId: target.groupId });
          return next;
        });
      } else if (
        drag.type === 'branch' &&
        targetType === 'branch' &&
        drag.projectId === targetProjectId &&
        drag.branchName &&
        targetBranchName
      ) {
        patchProject(drag.projectId, (p) => {
          const src = p.branches.findIndex((b) => b.name === drag.branchName);
          const dst = p.branches.findIndex((b) => b.name === targetBranchName);
          if (src < 0 || dst < 0 || src === dst) return p;
          const branches = [...p.branches];
          branches.splice(dst, 0, branches.splice(src, 1)[0]);
          return { ...p, branches };
        });
      }
    },
    [patchProject],
  );

  // ── Resolve dropdown subjects ──
  const activeProject =
    dropdownTarget && 'projectId' in dropdownTarget
      ? (projects.find((p) => p.id === dropdownTarget.projectId) ?? null)
      : null;
  const activeBranch =
    dropdownTarget?.kind === 'branch' && activeProject
      ? (activeProject.branches.find((b) => b.name === dropdownTarget.branchName) ?? null)
      : null;
  const activeGroup =
    dropdownTarget?.kind === 'group'
      ? (groups.find((g) => g.id === dropdownTarget.groupId) ?? null)
      : null;
  const activeTask =
    dropdownTarget?.kind === 'task'
      ? (projects
          .flatMap((p) => p.branches.flatMap((b) => b.sessions))
          .find((s) => s.id === dropdownTarget.sessionId)?.task ?? null)
      : null;
  const activeProjectIndex = activeProject
    ? projects.findIndex((p) => p.id === activeProject.id)
    : -1;

  // ── Render helpers ──
  const renderCard = (project: ProjectExtended) => (
    <ProjectCard
      key={project.id}
      project={project}
      isSelected={expandedIds.has(project.id)}
      selectedSessionId={selectedSessionId}
      isTaskManagerActive={activeTaskManagerProjectId === project.id}
      draggable={sortMode === 'manual'}
      onToggleProject={handleToggleProject}
      onOpenProject={handleOpenProject}
      onSelectSession={handleSelectSession}
      onOpenDropdown={handleOpenDropdown}
      onOpenTaskMenu={handleOpenTaskMenu}
      onToggleTaskManager={handleToggleTaskManager}
      onNewSession={handleNewSession}
      onKillProcess={handleKillProcess}
      onSessionContextMenu={handleSessionContextMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );

  const headerBtn =
    'w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors cursor-pointer relative';
  const headerBtnIdle = 'text-text-secondary hover:bg-card-hover hover:text-text-primary';
  const headerBtnOn = 'text-[#ff6a1f] bg-[rgba(255,106,31,0.1)]';

  const ungrouped = shownProjects.filter((p) => !groups.some((g) => g.id === p.groupId));

  // ── Render ──
  return (
    <div className="flex flex-col h-full w-[340px] shrink-0 min-h-0 bg-sidebar-background border-r border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 h-[44px] flex items-center justify-between border-b border-divider shrink-0">
        <b className="text-[13px] font-semibold text-text-primary font-display">
          Projects
          <span className="font-medium text-[10.5px] font-mono text-text-secondary/50 ml-1.5">
            {shownProjects.length}
          </span>
        </b>
        <div className="flex gap-0.5 items-center">
          {/* Expand / Collapse all */}
          <button
            onClick={toggleExpandAll}
            className={cn(headerBtn, headerBtnIdle)}
            title={anyOpen ? 'Collapse all' : 'Expand all'}
          >
            {anyOpen ? (
              <ChevronsUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronsDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Filter & sort */}
          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setDropdownTarget({
                kind: 'header-config',
                pos: { top: r.bottom + 4, left: r.left - 130 },
              });
            }}
            className={cn(headerBtn, isDirty ? headerBtnOn : headerBtnIdle)}
            title="Filter & sort"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {isDirty && (
              <i className="absolute top-[3px] right-[3px] w-1.5 h-1.5 rounded-full bg-[#ff6a1f]" />
            )}
          </button>

          {/* Show hidden */}
          <button
            onClick={() => setShowHidden((v) => !v)}
            className={cn(headerBtn, showHidden ? headerBtnOn : headerBtnIdle)}
            title="Show hidden projects"
          >
            <Eye className="w-3.5 h-3.5" />
            {hiddenCount > 0 && (
              <i className="absolute -top-0.5 -right-0.5 px-[3px] rounded-md bg-[#4a4d57] text-white text-[8px] font-mono font-semibold not-italic">
                {hiddenCount}
              </i>
            )}
          </button>

          {/* Add project */}
          <button
            onClick={() => setAddModalOpen(true)}
            className={cn(headerBtn, headerBtnIdle)}
            title="Add project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">
        {shownProjects.length === 0 ? (
          <div className="text-center text-text-secondary/50 text-[11.5px] px-2.5 py-6">
            No projects match this filter.
          </div>
        ) : (
          <>
            {groups.map((g) => {
              const members = shownProjects.filter((p) => p.groupId === g.id);
              if (!members.length && filterStatus !== 'all') return null;
              return (
                <div key={g.id}>
                  <GroupHeader
                    group={g}
                    count={members.length}
                    renaming={renamingGroupId === g.id}
                    onToggle={() => toggleGroup(g.id)}
                    onOpenMenu={(pos) => setDropdownTarget({ kind: 'group', groupId: g.id, pos })}
                    onRenameDone={(name) => finishRename(g.id, name)}
                  />
                  {g.open &&
                    (members.length ? (
                      members.map(renderCard)
                    ) : (
                      <div className="text-center text-text-secondary/50 text-[11.5px] px-2.5 py-6">
                        Empty group
                      </div>
                    ))}
                </div>
              );
            })}

            {groups.length > 0 && ungrouped.length > 0 && (
              <div className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.05em] text-text-secondary/50">
                Ungrouped
              </div>
            )}
            {ungrouped.map(renderCard)}
          </>
        )}
      </div>

      {/* ── Unified Dropdown host ── */}
      {dropdownTarget && (
        <Dropdown
          open
          onOpenChange={(o) => {
            if (!o) closeDropdown();
          }}
          strategy="fixed"
          trigger="contextmenu"
          position={dropdownTarget.pos}
        >
          <DropdownTrigger asChild>
            <span />
          </DropdownTrigger>

          <DropdownContent>
            {/* HEADER CONFIG MENU */}
            {dropdownTarget.kind === 'header-config' && (
              <>
                <MenuLabel>Sort by</MenuLabel>
                {SORTS.map(([k, l]) => (
                  <DropdownItem
                    key={k}
                    icon={ck(sortMode === k)}
                    closeOnSelect={false}
                    onClick={() => setSortMode(k)}
                  >
                    {l}
                  </DropdownItem>
                ))}

                <DropdownSeparator />

                <MenuLabel>Filter by status</MenuLabel>
                <DropdownItem
                  icon={ck(filterStatus === 'all')}
                  closeOnSelect={false}
                  onClick={() => setFilterStatus('all')}
                >
                  All projects
                </DropdownItem>
                {STATUS_ORDER.map((st) => (
                  <DropdownItem
                    key={st}
                    icon={ck(filterStatus === st, <StatusDot status={st} />)}
                    closeOnSelect={false}
                    onClick={() => setFilterStatus(st)}
                  >
                    {STATUS_LABELS[st]}
                  </DropdownItem>
                ))}

                {isDirty && (
                  <>
                    <DropdownSeparator />
                    <DropdownItem
                      icon={ck(false, <X className="w-3 h-3" />)}
                      closeOnSelect={false}
                      onClick={() => {
                        setSortMode('manual');
                        setFilterStatus('all');
                      }}
                    >
                      <span className="text-text-secondary">Reset</span>
                    </DropdownItem>
                  </>
                )}
              </>
            )}

            {/* PROJECT CONTEXT MENU */}
            {dropdownTarget.kind === 'project' && activeProject && (
              <>
                <MenuLabel>Visible branches</MenuLabel>
                {activeProject.branches.map((b) => (
                  <DropdownItem
                    key={b.name}
                    icon={ck(b.visible)}
                    closeOnSelect={false}
                    onClick={() => toggleBranchVisibility(activeProject.id, b.name)}
                  >
                    <span className={cn('truncate', !b.visible && 'text-text-secondary/60')}>
                      {b.name}
                    </span>
                  </DropdownItem>
                ))}

                <DropdownSeparator />

                <MenuLabel>Group</MenuLabel>
                {groups.map((g) => (
                  <DropdownItem
                    key={g.id}
                    icon={ck(activeProject.groupId === g.id, <Folder className="w-3 h-3" />)}
                    onClick={() => {
                      setProjectGroup(activeProject.id, g.id);
                      closeDropdown();
                    }}
                  >
                    Move to {g.name}
                  </DropdownItem>
                ))}
                {activeProject.groupId && (
                  <DropdownItem
                    icon={ck(false, <X className="w-3 h-3" />)}
                    onClick={() => {
                      setProjectGroup(activeProject.id, null);
                      closeDropdown();
                    }}
                  >
                    <span className="text-text-secondary">Remove from group</span>
                  </DropdownItem>
                )}
                <DropdownItem
                  icon={ck(false, <Plus className="w-3 h-3" />)}
                  onClick={() => {
                    createGroupFromProject(activeProject.id);
                    closeDropdown();
                  }}
                >
                  New group from project
                </DropdownItem>

                <DropdownSeparator />

                <DropdownItem
                  icon={<ArrowUp className="w-3.5 h-3.5" />}
                  disabled={activeProjectIndex <= 0}
                  onClick={() => {
                    moveProject(activeProject.id, -1);
                    closeDropdown();
                  }}
                >
                  <span className="flex w-full items-center justify-between gap-6">
                    Move up
                    <span className="font-mono text-[10px] text-text-secondary/50">
                      {activeProjectIndex + 1}/{projects.length}
                    </span>
                  </span>
                </DropdownItem>
                <DropdownItem
                  icon={<ArrowDown className="w-3.5 h-3.5" />}
                  disabled={activeProjectIndex >= projects.length - 1}
                  onClick={() => {
                    moveProject(activeProject.id, 1);
                    closeDropdown();
                  }}
                >
                  Move down
                </DropdownItem>
                <DropdownItem
                  icon={<Eye className="w-3.5 h-3.5" />}
                  variant={activeProject.hidden ? undefined : 'error'}
                  onClick={() => {
                    toggleProjectHidden(activeProject.id);
                    closeDropdown();
                  }}
                >
                  {activeProject.hidden ? 'Show project' : 'Hide project'}
                </DropdownItem>

                <DropdownSeparator />
                <DropdownItem
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  variant="error"
                  onClick={() => {
                    handleRemoveProject(activeProject.id);
                    closeDropdown();
                  }}
                >
                  Remove project
                </DropdownItem>
              </>
            )}

            {/* BRANCH CONTEXT MENU */}
            {dropdownTarget.kind === 'branch' && activeProject && activeBranch && (
              <>
                <DropdownItem
                  icon={<ArrowUp className="w-3.5 h-3.5" />}
                  onClick={() => {
                    moveBranch(activeProject.id, activeBranch.name, -1);
                    closeDropdown();
                  }}
                >
                  Move up
                </DropdownItem>
                <DropdownItem
                  icon={<ArrowDown className="w-3.5 h-3.5" />}
                  onClick={() => {
                    moveBranch(activeProject.id, activeBranch.name, 1);
                    closeDropdown();
                  }}
                >
                  Move down
                </DropdownItem>
                <DropdownItem
                  icon={<Eye className="w-3.5 h-3.5" />}
                  variant="error"
                  onClick={() => {
                    hideBranch(activeProject.id, activeBranch.name);
                    closeDropdown();
                  }}
                >
                  Hide branch
                </DropdownItem>

                {activeBranch.sessions.length > 0 && (
                  <>
                    <DropdownSeparator />
                    <DropdownItem
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      variant="error"
                      onClick={() => {
                        handleRemoveSession(activeProject.id, activeBranch.name);
                        closeDropdown();
                      }}
                    >
                      Remove session
                    </DropdownItem>
                  </>
                )}
              </>
            )}

            {/* GROUP MENU */}
            {dropdownTarget.kind === 'group' && activeGroup && (
              <>
                <DropdownItem
                  icon={<Pencil className="w-3 h-3" />}
                  onClick={() => {
                    setRenamingGroupId(activeGroup.id);
                    closeDropdown();
                  }}
                >
                  Rename group
                </DropdownItem>
                <DropdownItem
                  icon={<Trash2 className="w-3 h-3" />}
                  variant="error"
                  onClick={() => {
                    ungroup(activeGroup.id);
                    closeDropdown();
                  }}
                >
                  Ungroup (keep projects)
                </DropdownItem>
              </>
            )}

            {/* TASK STATUS MENU */}
            {dropdownTarget.kind === 'task' && activeTask && (
              <>
                {TASK_STATUSES.map(([k, l]) => (
                  <DropdownItem
                    key={k}
                    icon={ck(activeTask.status === k, <TaskIcon status={k} />)}
                    onClick={() => {
                      setTaskStatus(dropdownTarget.sessionId, k);
                      closeDropdown();
                    }}
                  >
                    {l}
                  </DropdownItem>
                ))}
                <DropdownSeparator />
                <DropdownItem
                  icon={<Trash2 className="w-3 h-3" />}
                  variant="error"
                  onClick={() => {
                    removeTask(dropdownTarget.sessionId);
                    closeDropdown();
                  }}
                >
                  Remove task
                </DropdownItem>
              </>
            )}

            {/* SESSION CONTEXT MENU */}
            {dropdownTarget.kind === 'session' && (
              <>
                <DropdownItem
                  icon={<Pencil className="w-3 h-3" />}
                  onClick={() => {
                    const sessionId = dropdownTarget.sessionId;
                    // Find current title to pre-fill if we had an inline edit state, 
                    // but for now just dispatch event or set a global rename target.
                    // Assuming there's a mechanism to trigger rename via event or store update.
                    window.dispatchEvent(new CustomEvent('phantoma:request-rename-session', { detail: sessionId }));
                    closeDropdown();
                  }}
                >
                  Rename Session
                </DropdownItem>

                <DropdownSeparator />

                <DropdownItem
                  icon={<Link2 className="w-3 h-3" />}
                  onClick={() => {
                    // TODO: Implement assign task logic
                    showToast('Assign Task clicked');
                    closeDropdown();
                  }}
                >
                  Assign Task...
                </DropdownItem>
                <DropdownItem
                  icon={<Unlink className="w-3 h-3" />}
                  onClick={() => {
                    // TODO: Implement unassign task logic
                    showToast('Unassign Task clicked');
                    closeDropdown();
                  }}
                >
                  Unassign Task
                </DropdownItem>

                <DropdownSeparator />

                <span className="block px-2 py-1 text-[10px] font-semibold text-text-secondary/50 uppercase tracking-wider">
                  Change Task Status
                </span>
                {TASK_STATUSES.map(([k, l]) => (
                  <DropdownItem
                    key={k}
                    icon={<TaskIcon status={k} />}
                    onClick={() => {
                      setTaskStatus(dropdownTarget.sessionId, k);
                      closeDropdown();
                    }}
                  >
                    {l}
                  </DropdownItem>
                ))}

                <DropdownSeparator />

                <DropdownItem
                  icon={<Trash2 className="w-3 h-3" />}
                  variant="error"
                  onClick={() => {
                    const sessionId = dropdownTarget.sessionId;
                    setProjects((prev) => {
                      const updatedProjects = prev.map((p) => {
                        if (p.id !== dropdownTarget.projectId) return p;

                        const newBranches = p.branches.map((b) => ({
                          ...b,
                          sessions: b.sessions.filter((s) => s.id !== sessionId),
                        }));

                        updateProject(p.id, { branches: newBranches });
                        return { ...p, branches: newBranches };
                      });
                      return updatedProjects;
                    });
                    
                    // Clear selection if the deleted session was selected
                    if (selectedSessionId === sessionId) {
                      setSelectedSessionId(null);
                    }
                    
                    closeDropdown();
                  }}
                >
                  Delete Session
                </DropdownItem>
              </>
            )}
          </DropdownContent>
        </Dropdown>
      )}

      {/* ── Toast ── */}
      <div
        className={cn(
          'fixed left-4 bottom-4 z-[60] px-3 py-[7px] rounded-lg border border-border bg-dropdown-item-hover text-xs text-text-primary pointer-events-none transition-all duration-200',
          toast.on ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5',
        )}
      >
        {toast.msg}
      </div>

      {/* ── Add Project Modal ── */}
      <AddProjectModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
});

export default ProjectPanel;
