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
  GitBranch,
  Square,
} from 'lucide-react';
// ── Hooks & Store ──
import { useCodeStore, type Project } from '../../hooks/useCodeStore';
import { useSessionTasks } from '../../hooks/useSessionTasks';
import {
  taskService,
  getBlockers,
  getUnfinishedChain,
  type StoredTask,
} from '../../services/task.service';
import { ConfirmForceStartTaskModal } from '../ContentPanel/TaskManager/ConfirmForceStartTaskModal';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Shared UI components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ── Local modals ──
import { OpenProjectModal } from '../modal/OpenProjectModal/index';
import { ConfirmDeleteProjectModal } from '../modal/ConfirmDeleteProjectModal';
import { CreateBranchModal, type CreatedBranchResult } from '../modal/CreateBranchModal';
import { ConfirmDeleteBranchModal } from '../modal/ConfirmDeleteBranchModal';

// ── Group Picker Form ──
import { GroupPickerForm, GROUP_ICONS } from './GroupPickerForm';

// ── Shared definitions ──
import {
  type SessionStatus,
  type SessionInfo,
  type BranchInfo,
  type TaskStatus,
  type ProcessInfo,
  type ProcessInteractHandler,
  type MenuPosition,
  STATUS_ORDER,
  STATUS_LABELS,
  TASK_STATUSES,
  StatusDot,
  TaskIcon,
} from './SessionCard';

// ── Accent Colors Hook (Simple implementation for stable random colors) ──
const ACCENT_PALETTE = [
  '#ff6a1f', // Orange Primary
  '#a078ff', // Purple
  '#3ddc84', // Green
  '#4fa8e0', // Blue
  '#ffb020', // Yellow
  '#ff78aa', // Pink
  '#32c8be', // Teal
];

function useAccentColors() {
  return useMemo(() => ({ accentColors: ACCENT_PALETTE }), []);
}

// Helper to get visible branches count
function getVisibleBranches(project: ProjectExtended): BranchInfo[] {
  return project.branches.filter((b) => b.visible);
}

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
  iconId?: string; // New field for group icon
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
  | { kind: 'session'; sessionId: string; projectId: string; pos: MenuPosition }
  | { kind: 'assign-task'; sessionId: string; projectId: string; pos: MenuPosition }
  | { kind: 'process'; sessionId: string; index: number; pos: MenuPosition }
  | { kind: 'move-to-group'; projectId: string; pos: MenuPosition };

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
  try {
    const res = await (window as any).api.invoke('git:list-branches', projectPath);

    if (res?.error) {
      console.warn('[ProjectPanel] Failed to list branches', res.error);
      return [];
    }

    const rawBranches: string[] = res.branches || [];

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

/** Group header row with inline rename and drag support */
function GroupHeader({
  group,
  count,
  renaming,
  onToggle,
  onOpenMenu,
  onRenameDone,
  onEditClick,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  group: GroupInfo;
  count: number;
  renaming: boolean;
  onToggle: () => void;
  onOpenMenu: (pos: MenuPosition) => void;
  onRenameDone: (name: string | null) => void;
  onEditClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const { accentColors } = useAccentColors();

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

  // Resolve icon component from ID
  const IconComp = GROUP_ICONS.find((g) => g.id === group.iconId)?.icon || (
    <Folder className="w-[11px] h-[11px]" />
  );

  // Generate stable random color based on group ID/name hash
  const groupColor = useMemo(() => {
    let hash = 0;
    const str = group.id + group.name;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % accentColors.length;
    return accentColors[idx];
  }, [group.id, group.name, accentColors]);

  return (
    <div
      draggable={draggable}
      data-gid={group.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        // Removed 'uppercase' and 'tracking-[0.05em]' to preserve raw case
        'group/gh flex items-center gap-[7px] px-3 py-[7px] bg-white/[0.02] border-b border-divider cursor-pointer select-none font-mono text-[10.5px] font-semibold text-text-secondary hover:text-text-primary transition-colors',
        draggable && 'hover:bg-card-hover',
      )}
      onClick={onToggle}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditClick?.();
      }}
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

      {/* Dynamic Icon Container with Random Accent Color */}
      <span className="shrink-0 [&_svg]:w-[11px] [&_svg]:h-[11px]" style={{ color: groupColor }}>
        {IconComp}
      </span>

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
    setCurrentProject(undefined as unknown as string);
    setContentViewMode('files'); // Default view mode when no project selected
    setActiveWorkspaceSessionId(null);
  }, [setCurrentProject, setContentViewMode, setActiveWorkspaceSessionId]);

  // Local state mirrors store projects but adds UI-only fields (color, group, hidden, branches)
  const [projects, setProjects] = useState<ProjectExtended[]>(() => rawProjects.map(seedProject));

  // ── Group Persistence Key ──
  const GROUP_STORAGE_KEY = 'phantoma_project_groups_v1';

  // Helper to load groups from storage safely
  const loadGroupsFromStorage = (): GroupInfo[] => {
    try {
      const stored = window.localStorage.getItem(GROUP_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Basic validation to ensure structure integrity
      if (!Array.isArray(parsed)) return [];
      return parsed.map((g: any) => ({
        id: String(g.id),
        name: String(g.name || 'Untitled'),
        open: Boolean(g.open ?? true),
        iconId: g.iconId ? String(g.iconId) : undefined,
      }));
    } catch (e) {
      console.error('Failed to load groups from storage:', e);
      return [];
    }
  };

  // Initialize groups state with persisted data
  const [groups, setGroups] = useState<GroupInfo[]>(loadGroupsFromStorage);

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
            // Ensure critical fields have valid defaults if missing from store payload
            branches: fresh.branches ?? [],
            defaultBranch: p.defaultBranch || 'main',
            hidden: p.hidden ?? false,
            color: p.color || '#8b91a1',
            groupId: p.groupId ?? null,
            files: fresh.files ?? [],
            services: fresh.services ?? [],
            agentGroups: fresh.agentGroups ?? [],
            mcps: fresh.mcps ?? [],
            activeWorkspacePanelId: fresh.activeWorkspacePanelId ?? null,
            workspacePanels: fresh.workspacePanels ?? [],
            expandedFolderIds: fresh.expandedFolderIds ?? [],
            openFiles: fresh.openFiles ?? [],
            fileDisplayNames: fresh.fileDisplayNames ?? {},
            fileNodeMap: fresh.fileNodeMap ?? {},
            activeFileTabId: fresh.activeFileTabId ?? null,
            currentServiceId: fresh.currentServiceId ?? null,
            currentFileId: fresh.currentFileId ?? null,
            bottomPanelTab: fresh.bottomPanelTab ?? 'output',
            isBottomPanelOpen: fresh.isBottomPanelOpen ?? true,
            activityPanelTab: fresh.activityPanelTab ?? 'explore',
            unsavedFiles: new Set(fresh.unsavedFiles || []),
            originalContents: fresh.originalContents ?? {},
            dirVersions: fresh.dirVersions ?? {},
            designs: fresh.designs ?? [],
          } as ProjectExtended;
        });
      const known = new Set(prev.map((p) => p.id));
      const added = rawProjects
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !known.has(p.id))
        .map(({ p, i }) => seedProject(p, i));
      return [...kept, ...added];
    });
  }, [rawProjects]);

  // Persist groups whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups));
    } catch (e) {
      console.error('Failed to save groups to storage:', e);
    }
  }, [groups]);

  // ── UI state ──
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  /** Tracks which project's Task Manager is currently open in ContentPanel */
  const [activeTaskManagerProjectId, setActiveTaskManagerProjectId] = useState<string | null>(null);
  const [activeGitProjectId, setActiveGitProjectId] = useState<string | null>(null);
  const [showHidden] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [filterStatus, setFilterStatus] = useState<'all' | SessionStatus>('all');
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [dropdownTarget, setDropdownTarget] = useState<DropdownTarget | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<ProjectExtended | null>(null);
  const [createBranchProjectId, setCreateBranchProjectId] = useState<string | null>(null);
  const [confirmDeleteBranchTarget, setConfirmDeleteBranchTarget] = useState<{
    project: ProjectExtended;
    branchName: string;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; on: boolean }>({ msg: '', on: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Group Creation State ──
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const dragRef = useRef<{
    type: 'project' | 'branch' | 'group';
    projectId?: string;
    branchName?: string;
    groupId?: string;
    el: HTMLElement | null;
  } | null>(null);

  // Global flag to trigger collapse-all during drag
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

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
              const existingBranchMap = new Map(p.branches.map((b) => [b.name, b]));

              const mergedBranches = realBranches.map((gitBranch) => {
                const existing = existingBranchMap.get(gitBranch.name);
                if (existing) {
                  // Keep existing sessions and visibility settings
                  return {
                    ...gitBranch,
                    sessions: existing.sessions,
                    visible: existing.visible,
                    path: existing.path,
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
          }
        } catch (err) {
          console.error('[ProjectPanel] Error fetching branches', { id: proj.id, err });
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

  const handleToggleProject = useCallback((projectId: string) => {
    // Chỉ toggle trạng thái mở rộng local, KHÔNG set currentProjectId trong store
    // Vì theo yêu cầu, việc chọn project chỉ xảy ra khi chọn SessionCard
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const handleOpenProject = useCallback((projectId: string) => {
    // Tương tự, chỉ mở rộng UI, không kích hoạt selection logic của toàn app
    setExpandedIds((prev) => (prev.has(projectId) ? prev : new Set(prev).add(projectId)));
  }, []);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) {
        // Deselect logic triggered by clicking an already-selected branch row
        setSelectedSessionId(null);
        setCurrentProject(undefined as unknown as string); // Clear current project selection when deselecting session
        return;
      }

      // Tìm project chứa session này từ local state
      const parentProject = projects.find((p) =>
        p.branches.some((b) => b.sessions.some((s) => s.id === sessionId)),
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
      if (activeGitProjectId) {
        setActiveGitProjectId(null);
      }

      // Switch ContentPanel to Workspace view for this session
      setActiveWorkspaceSessionId(sessionId);
      setContentViewMode('workspace');
    },
    [
      projects,
      setCurrentProject,
      setActiveWorkspaceSessionId,
      setContentViewMode,
      activeTaskManagerProjectId,
      activeGitProjectId,
    ],
  );

  /** Toggle Git view for a specific project. Clicking again closes it. */
  const handleToggleGit = useCallback(
    (projectId: string) => {
      setSelectedSessionId(null);
      setActiveTaskManagerProjectId(null);

      if (activeGitProjectId === projectId) {
        setActiveGitProjectId(null);
        setContentViewMode('files');
      } else {
        setCurrentProject(projectId);
        setActiveGitProjectId(projectId);
        setContentViewMode('git');
      }
    },
    [activeGitProjectId, setContentViewMode, setCurrentProject],
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
        setActiveGitProjectId(null);
        setCurrentProject(projectId);
        setActiveTaskManagerProjectId(projectId);
        setContentViewMode('tasks');
      }
    },
    [activeTaskManagerProjectId, setContentViewMode, setCurrentProject],
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

  // Removed unused createGroupFromProject as logic shifted to GroupPickerForm + Drag/Drop

  const removeProjectFromStore = useCodeStore((s) => s.removeProject);

  const handleRemoveProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      setConfirmDeleteTarget(target);
    },
    [projects],
  );

  const confirmRemoveProject = useCallback(() => {
    if (!confirmDeleteTarget) return;
    removeProjectFromStore(confirmDeleteTarget.id);
    showToast(`Removed "${confirmDeleteTarget.name}"`);
    setConfirmDeleteTarget(null);
  }, [confirmDeleteTarget, removeProjectFromStore, showToast]);

  const createBranchProject = useMemo(
    () => projects.find((p) => p.id === createBranchProjectId) ?? null,
    [projects, createBranchProjectId],
  );

  const handleBranchCreated = useCallback(
    (project: ProjectExtended, result: CreatedBranchResult) => {
      const exists = project.branches.some((b) => b.name === result.branch);
      const newBranches: BranchInfo[] = exists
        ? project.branches.map((b) => (b.name === result.branch ? { ...b, path: result.path } : b))
        : [
            ...project.branches,
            { name: result.branch, visible: true, sessions: [], path: result.path },
          ];
      patchProject(project.id, (p) => ({ ...p, branches: newBranches }));
      updateProject(project.id, { branches: newBranches } as any);
      showToast(`Created branch "${result.branch}"`);
    },
    [patchProject, updateProject, showToast],
  );

  const confirmDeleteBranch = useCallback(async () => {
    if (!confirmDeleteBranchTarget) return {};
    const { project, branchName } = confirmDeleteBranchTarget;
    const res = await (window as any).api.invoke('git:delete-branch', project.path, branchName);
    if (res?.error) return { error: res.error as string };
    const removed = project.branches.find((b) => b.name === branchName);
    const removedSessionIds = new Set((removed?.sessions ?? []).map((s) => s.id));
    const newBranches = project.branches.filter((b) => b.name !== branchName);
    patchProject(project.id, (p) => ({ ...p, branches: newBranches }));
    updateProject(project.id, { branches: newBranches } as any);
    setSelectedSessionId((id) => (id && removedSessionIds.has(id) ? null : id));
    showToast(`Deleted branch "${branchName}"`);
    return {};
  }, [confirmDeleteBranchTarget, patchProject, updateProject, showToast]);

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
      // 1. Tìm project hiện tại trong local state để lấy dữ liệu gốc chính xác nhất
      const currentLocalProject = projects.find((p) => p.id === projectId);
      if (!currentLocalProject) {
        console.error('[DEBUG_SESSION_CREATE_FAIL] Project not found in local state', {
          projectId,
        });
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

      // 3. Cập nhật Local State để UI phản hồi ngay lập tức
      setProjects((prev) => {
        const updated = prev.map((p) => (p.id === projectId ? { ...p, branches: newBranches } : p));
        return updated;
      });

      // 4. Đồng bộ ngược lên Store (Zustand) để kích hoạt persist mechanism
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

  const findProcess = useCallback(
    (sessionId: string, index: number) =>
      projects
        .flatMap((p) => p.branches ?? [])
        .flatMap((b) => b.sessions)
        .find((s) => s.id === sessionId)?.procs?.[index],
    [projects],
  );

  const handleKillProcess = useCallback(
    (sessionId: string, index: number) => {
      const target = findProcess(sessionId, index);
      if (target?.terminalId && target.status !== 'crashed') {
        window.api.invoke('terminal:kill-foreground', target.terminalId).catch(() => {});
      }
      patchSession(sessionId, (s) => ({
        ...s,
        procs: (s.procs ?? []).filter((_, i) => i !== index),
      }));
    },
    [patchSession, findProcess],
  );

  const requestFocusPanel = useCodeStore((s) => s.requestFocusPanel);

  const handleProcessInteract: ProcessInteractHandler = useCallback(
    (action, sessionId, index, e) => {
      if (action === 'menu') {
        setDropdownTarget({
          kind: 'process',
          sessionId,
          index,
          pos: { top: e.clientY, left: e.clientX },
        });
        return;
      }
      e.stopPropagation();
      const panelId = findProcess(sessionId, index)?.panelId;
      handleSelectSession(sessionId);
      if (panelId) requestFocusPanel(sessionId, panelId);
    },
    [findProcess, handleSelectSession, requestFocusPanel],
  );

  // ── Task actions ──
  const bySession = useSessionTasks((s) => s.bySession);
  const tasksByPath = useSessionTasks((s) => s.byPath);
  const loadSessionTasks = useSessionTasks((s) => s.load);

  useEffect(() => {
    projects.forEach((p) => {
      if (p.path) void loadSessionTasks(p.path);
    });
  }, [projects.map((p) => p.path).join('|'), loadSessionTasks]);

  const findSessionProjectPath = useCallback(
    (sessionId: string) =>
      projects.find((p) => p.branches.some((b) => b.sessions.some((s) => s.id === sessionId)))
        ?.path,
    [projects],
  );

  const [forceStart, setForceStart] = useState<{
    path: string;
    title: string;
    chain: StoredTask[];
    proceed: () => Promise<unknown>;
  } | null>(null);

  const setTaskStatus = useCallback(
    (sessionId: string, status: TaskStatus) => {
      const task = bySession[sessionId];
      const path = findSessionProjectPath(sessionId);
      if (!task || !path) return;
      const all = tasksByPath[path] ?? [];
      if (status !== 'todo' && status !== task.status && getBlockers(task, all).length > 0) {
        setForceStart({
          path,
          title: task.title,
          chain: getUnfinishedChain(task, all),
          proceed: () => taskService.update(path, task.id, { status }),
        });
        return;
      }
      void taskService.update(path, task.id, { status });
    },
    [bySession, tasksByPath, findSessionProjectPath],
  );

  const removeTask = useCallback(
    (sessionId: string) => {
      const task = bySession[sessionId];
      const path = findSessionProjectPath(sessionId);
      if (task && path) void taskService.update(path, task.id, { sessionId: null, branchName: null });
    },
    [bySession, findSessionProjectPath],
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

  // ── Drag & Drop Engine (Multi-level: Group / Project / Branch) ──
  const clearDragMarks = () =>
    document.querySelectorAll('.pp-dragover').forEach((el) => el.classList.remove('pp-dragover'));

  const handleDragStart = useCallback(
    (
      e: React.DragEvent,
      type: 'project' | 'branch' | 'group',
      idOrPid: string,
      secondaryArg?: string, // branchName or groupId depending on type
    ) => {
      // --- GUARD: Block drag if fewer than 2 items of this type are visible ---
      let count = 0;
      if (type === 'project') {
        count = shownProjects.length;
      } else if (type === 'group') {
        count = groups.length;
      } else if (type === 'branch') {
        // Count branches in the specific project being dragged from
        const proj = projects.find((p) => p.id === idOrPid);
        count = proj ? getVisibleBranches(proj).length : 0;
      }

      if (count < 2) {
        e.preventDefault(); // Stop native drag
        return;
      }

      const el = e.currentTarget as HTMLElement;

      // Normalize args based on type for internal storage consistency
      let projectId: string | undefined;
      let branchName: string | undefined;
      let groupId: string | undefined;

      if (type === 'project') {
        projectId = idOrPid;
      } else if (type === 'branch') {
        projectId = idOrPid;
        branchName = secondaryArg;
      } else if (type === 'group') {
        groupId = idOrPid;
      }

      dragRef.current = { type, projectId, branchName, groupId, el };
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
      el.classList.add('pp-dragging');
      setIsGlobalDragging(true); // Trigger UI collapse
    },
    [shownProjects, groups, projects],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current?.el?.classList.remove('pp-dragging');
    dragRef.current = null;
    clearDragMarks();
    setIsGlobalDragging(false); // Restore UI
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const target = e.currentTarget as HTMLElement;

    // Walk up DOM to find closest drop-zone ancestor with data attributes
    // This fixes the issue where dragging over child elements (like text spans inside headers) fails detection
    const zoneEl = target.closest('[data-gid], [data-pid], [data-branch]') as HTMLElement | null;

    if (!zoneEl) return;

    const targetGroupId = zoneEl.dataset.gid;
    const targetProjectId = zoneEl.dataset.pid;
    const targetBranchName = zoneEl.dataset.branch;

    let isValidDrop = false;

    // Rule 1: Cannot drop Group into Group
    if (drag.type === 'group' && targetGroupId) {
      isValidDrop = false;
    }
    // Rule 2: Branch reorder only within same project
    else if (drag.type === 'branch') {
      isValidDrop = !!targetBranchName && targetProjectId === drag.projectId && zoneEl !== drag.el;
    }
    // Rule 3: Project can drop on Project (reorder) or Group (assign)
    else if (drag.type === 'project') {
      if (targetProjectId) {
        // Reorder projects
        isValidDrop = zoneEl !== drag.el;
      } else if (targetGroupId) {
        // Dropping INTO a group header/container -> Assign project to this group
        isValidDrop = true;
      }
    }
    // Rule 4: Group reordering (only against other Groups)
    else if (drag.type === 'group') {
      if (targetGroupId) {
        isValidDrop = zoneEl !== drag.el; // Reorder groups
      }
    }

    if (!isValidDrop) return;

    e.preventDefault();
    clearDragMarks();
    // Highlight the ZONE element, not necessarily the immediate hover target
    zoneEl.classList.add('pp-dragover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      clearDragMarks();
      drag.el?.classList.remove('pp-dragging');
      dragRef.current = null;
      setIsGlobalDragging(false);

      const target = e.currentTarget as HTMLElement;
      const zoneEl = target.closest('[data-gid], [data-pid], [data-branch]') as HTMLElement | null;
      if (!zoneEl) return;

      const targetGroupId = zoneEl.dataset.gid;
      const targetProjectId = zoneEl.dataset.pid;
      const targetBranchName = zoneEl.dataset.branch;

      // --- Logic Dispatcher ---

      // 1. Branch Reorder (Same Project)
      if (drag.type === 'branch' && targetBranchName && targetProjectId === drag.projectId) {
        patchProject(drag.projectId!, (p) => {
          const src = p.branches.findIndex((b) => b.name === drag.branchName);
          const dst = p.branches.findIndex((b) => b.name === targetBranchName);
          if (src < 0 || dst < 0 || src === dst) return p;
          const branches = [...p.branches];
          branches.splice(dst, 0, branches.splice(src, 1)[0]);
          return { ...p, branches };
        });
        return;
      }

      // 2. Project -> Group (Assign Group)
      if (drag.type === 'project' && targetGroupId) {
        patchProject(drag.projectId!, (p) => ({ ...p, groupId: targetGroupId }));
        showToast(`Moved "${projects.find((pr) => pr.id === drag.projectId)?.name}" to group`);
        return;
      }

      // 3. Project -> Project (Reorder)
      if (drag.type === 'project' && targetProjectId) {
        setProjects((prev) => {
          const srcIdx = prev.findIndex((p) => p.id === drag.projectId);
          const tgtIdx = prev.findIndex((p) => p.id === targetProjectId);

          if (srcIdx < 0 || tgtIdx < 0 || srcIdx === tgtIdx) return prev;

          const next = [...prev];
          const [moved] = next.splice(srcIdx, 1);
          const newTgtIdx = next.findIndex((p) => p.id === targetProjectId);
          next.splice(newTgtIdx, 0, moved);
          return next;
        });
        return;
      }

      // 4. Group -> Group (Reorder)
      if (drag.type === 'group' && targetGroupId) {
        setGroups((prev) => {
          const srcIdx = prev.findIndex((g) => g.id === drag.groupId);
          const tgtIdx = prev.findIndex((g) => g.id === targetGroupId);
          if (srcIdx < 0 || tgtIdx < 0 || srcIdx === tgtIdx) return prev;
          const next = [...prev];
          const [moved] = next.splice(srcIdx, 1);
          const newTgtIdx = next.findIndex((g) => g.id === targetGroupId);
          next.splice(newTgtIdx, 0, moved);
          return next;
        });
        return;
      }
    },
    [patchProject, projects, showToast, setProjects, setGroups],
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
      ? (bySession[dropdownTarget.sessionId] ?? null)
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
      isGitActive={activeGitProjectId === project.id}
      onToggleGit={handleToggleGit}
      draggable={sortMode === 'manual'}
      isGlobalDragging={isGlobalDragging}
      onToggleProject={handleToggleProject}
      onOpenProject={handleOpenProject}
      onSelectSession={handleSelectSession}
      onOpenDropdown={handleOpenDropdown}
      onOpenTaskMenu={handleOpenTaskMenu}
      onToggleTaskManager={handleToggleTaskManager}
      onNewSession={handleNewSession}
      onProcessInteract={handleProcessInteract}
      onSessionContextMenu={handleSessionContextMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );

  const handleCreateGroup = useCallback(
    (iconId: string, name: string) => {
      const id = `g${Date.now()}`;
      setGroups((prev) => [...prev, { id, name, open: true, iconId }]);
      setGroupFormOpen(false);
      showToast(`Created group "${name}"`);
    },
    [showToast],
  );

  const handleUpdateGroup = useCallback(
    (groupId: string, iconId: string, name: string) => {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name, iconId } : g)));
      setEditingGroupId(null);
      showToast(`Updated group "${name}"`);
    },
    [showToast],
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
          {/* Create New Group Button */}
          <button
            onClick={() => {
              setGroupFormOpen(true);
              setEditingGroupId(null); // Ensure we are in create mode
            }}
            className={cn(headerBtn, headerBtnIdle)}
            title="Create new group"
          >
            <Folder className="w-3.5 h-3.5" />
          </button>

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
        {/* Group Creation Form */}
        {groupFormOpen && (
          <div className="px-3 py-2 sticky top-0 z-10 bg-sidebar-background/95 backdrop-blur-sm border-b border-divider">
            <GroupPickerForm onSave={handleCreateGroup} onCancel={() => setGroupFormOpen(false)} />
          </div>
        )}

        {shownProjects.length === 0 && groups.length === 0 && !groupFormOpen ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
            <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
              </p>
              <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed">
                {projects.length === 0
                  ? 'Create or open a project to get started.'
                  : 'Try adjusting your filters or sort order.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {groups.map((g) => {
              const members = shownProjects.filter((p) => p.groupId === g.id);
              // Hide empty groups when filtering unless explicitly looking for them?
              // For now, keep structure stable.

              return (
                <div key={g.id} data-gid={g.id}>
                  {editingGroupId === g.id ? (
                    <div className="px-2 py-1.5 bg-sidebar-background/50">
                      <GroupPickerForm
                        initialIconId={g.iconId || 'folder'}
                        initialName={g.name}
                        isEditing
                        onSave={(iconId, name) => handleUpdateGroup(g.id, iconId, name)}
                        onCancel={() => setEditingGroupId(null)}
                        onDragStart={(e) => handleDragStart(e, 'group', g.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragging={dragRef.current?.groupId === g.id}
                      />
                    </div>
                  ) : (
                    <GroupHeader
                      group={g}
                      count={members.length}
                      renaming={renamingGroupId === g.id}
                      onToggle={() => toggleGroup(g.id)}
                      onOpenMenu={(pos) => setDropdownTarget({ kind: 'group', groupId: g.id, pos })}
                      onRenameDone={(name) => finishRename(g.id, name)}
                      onEditClick={() => setEditingGroupId(g.id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'group', g.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  )}

                  {g.open && (
                    <div className="pl-2">
                      {members.length ? (
                        members.map(renderCard)
                      ) : (
                        <div className="text-center text-text-secondary/50 text-[11.5px] px-2.5 py-4 italic">
                          Drop projects here
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {groups.length > 0 && ungrouped.length > 0 && (
              <div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.05em] text-text-secondary/50 flex items-center gap-2">
                <span>Ungrouped</span>
                <div className="h-px flex-1 bg-divider" />
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

                <DropdownItem
                  icon={<GitBranch className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setCreateBranchProjectId(activeProject.id);
                    closeDropdown();
                  }}
                >
                  Create branch...
                </DropdownItem>

                <DropdownSeparator />

                {/* SUBMENU: MOVE TO GROUP */}
                {groups.length > 0 && (
                  <DropdownItem
                    icon={<ChevronRight className="w-3 h-3 rotate-90 ml-auto" />} // Visual cue for submenu
                    closeOnSelect={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDropdownTarget({
                        kind: 'move-to-group',
                        projectId: activeProject.id,
                        pos: { top: rect.top, left: rect.right + 4 },
                      });
                    }}
                  >
                    Move to group...
                  </DropdownItem>
                )}

                {/* INLINE LIST IF NO GROUPS YET OR AS FALLBACK? 
                    Requirement says "if at least 1 group". If 0 groups, maybe hide or show disabled.
                    Let's stick to requirement: Only show if groups exist. 
                    If user wants to create new group immediately, they use the item below.
                */}

                {activeProject.groupId && (
                  <DropdownItem
                    icon={<X className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setProjectGroup(activeProject.id, null);
                      closeDropdown();
                    }}
                  >
                    <span className="text-text-secondary">Remove from current group</span>
                  </DropdownItem>
                )}

                <DropdownItem
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    // Open Group Form inline in header area instead of modal/alert
                    setGroupFormOpen(true);
                    // Optionally store which project triggered it to auto-add after creation?
                    // For now, just opens form. User creates group, then drags project in.
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
                  icon={<Folder className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    const target = activeBranch.path ?? activeProject.path;
                    closeDropdown();
                    try {
                      const err = await (window as any).api.invoke('shell:open-path', target);
                      if (err) showToast(`Cannot open folder: ${err}`);
                    } catch (e) {
                      console.error('[DEBUG] open-folder invoke failed', e);
                    }
                  }}
                >
                  Open Folder
                </DropdownItem>

                <DropdownSeparator />

                {activeProject.branches.filter((b) => b.visible).length > 1 && (
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
                  </>
                )}
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

                {activeBranch.name !== activeProject.defaultBranch && (
                  <>
                    <DropdownSeparator />
                    <DropdownItem
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      variant="error"
                      onClick={() => {
                        setConfirmDeleteBranchTarget({
                          project: activeProject,
                          branchName: activeBranch.name,
                        });
                        closeDropdown();
                      }}
                    >
                      Delete branch
                    </DropdownItem>
                  </>
                )}
              </>
            )}

            {/* MOVE TO GROUP SUBMENU */}
            {dropdownTarget.kind === 'move-to-group' && activeProject && (
              <>
                <MenuLabel>Select Group</MenuLabel>
                {groups.map((g) => (
                  <DropdownItem
                    key={g.id}
                    icon={ck(
                      activeProject.groupId === g.id,
                      GROUP_ICONS.find((i) => i.id === g.iconId)?.icon || (
                        <Folder className="w-3 h-3" />
                      ),
                    )}
                    onClick={() => {
                      setProjectGroup(activeProject.id, g.id);
                      showToast(`Moved "${activeProject.name}" to ${g.name}`);
                      closeDropdown();
                    }}
                  >
                    {g.name}
                  </DropdownItem>
                ))}
                <DropdownSeparator />
                <DropdownItem
                  icon={<X className="w-3 h-3" />}
                  onClick={() => {
                    // Return to main project menu or close?
                    // Usually returning is better UX if they misclicked.
                    setDropdownTarget({
                      kind: 'project',
                      projectId: activeProject.id,
                      pos: dropdownTarget.pos,
                    });
                  }}
                >
                  <span className="text-text-secondary">Back</span>
                </DropdownItem>
              </>
            )}

            {/* GROUP MENU */}
            {dropdownTarget.kind === 'group' && activeGroup && (
              <>
                <DropdownItem
                  icon={<Pencil className="w-3 h-3" />}
                  onClick={() => {
                    setEditingGroupId(activeGroup.id);
                    closeDropdown();
                  }}
                >
                  Edit Group (Icon & Name)
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

            {/* ASSIGN TASK PICKER */}
            {dropdownTarget.kind === 'assign-task' &&
              (() => {
                const proj = projects.find((p) => p.id === dropdownTarget.projectId);
                const path = proj?.path ?? '';
                const branchName =
                  proj?.branches.find((b) =>
                    b.sessions.some((s) => s.id === dropdownTarget.sessionId),
                  )?.name ?? null;
                const candidates = (tasksByPath[path] ?? []).filter((t) => !t.archived && !t.sessionId);
                if (candidates.length === 0) {
                  return (
                    <span className="block px-2 py-1 text-xs text-text-secondary/60">
                      No unlinked tasks
                    </span>
                  );
                }
                return (
                  <>
                    {candidates.map((t) => (
                      <DropdownItem
                        key={t.id}
                        icon={<TaskIcon status={t.status} />}
                        onClick={() => {
                          void taskService.update(path, t.id, {
                            sessionId: dropdownTarget.sessionId,
                            branchName,
                          });
                          closeDropdown();
                        }}
                      >
                        {t.title}
                      </DropdownItem>
                    ))}
                  </>
                );
              })()}

            {/* PROCESS CONTEXT MENU */}
            {dropdownTarget.kind === 'process' && (
              <>
                <DropdownItem
                  icon={<Square className="w-3 h-3" />}
                  variant="error"
                  onClick={() => {
                    handleKillProcess(dropdownTarget.sessionId, dropdownTarget.index);
                    closeDropdown();
                  }}
                >
                  {findProcess(dropdownTarget.sessionId, dropdownTarget.index)?.status === 'crashed'
                    ? 'Dismiss'
                    : 'Stop process'}
                </DropdownItem>
              </>
            )}

            {/* SESSION CONTEXT MENU */}
            {dropdownTarget.kind === 'session' && (
              <>

                {bySession[dropdownTarget.sessionId] ? (
                  <>
                    <DropdownItem
                      icon={<Unlink className="w-3 h-3" />}
                      onClick={() => {
                        removeTask(dropdownTarget.sessionId);
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
                        icon={ck(bySession[dropdownTarget.sessionId]?.status === k, <TaskIcon status={k} />)}
                        onClick={() => {
                          setTaskStatus(dropdownTarget.sessionId, k);
                          closeDropdown();
                        }}
                      >
                        {l}
                      </DropdownItem>
                    ))}
                  </>
                ) : (
                  <DropdownItem
                    icon={<Link2 className="w-3 h-3" />}
                    onClick={() => {
                      setDropdownTarget({
                        kind: 'assign-task',
                        sessionId: dropdownTarget.sessionId,
                        projectId: dropdownTarget.projectId,
                        pos: dropdownTarget.pos,
                      });
                    }}
                  >
                    Assign Task...
                  </DropdownItem>
                )}

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

      {/* ── Project Modals ── */}
      <OpenProjectModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />

      {/* ── Confirm Delete Project Modal ── */}
      <ConfirmDeleteProjectModal
        isOpen={!!confirmDeleteTarget}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={confirmRemoveProject}
        projectName={confirmDeleteTarget?.name ?? ''}
        projectPath={confirmDeleteTarget?.path}
      />

      <CreateBranchModal
        isOpen={!!createBranchProject}
        onClose={() => setCreateBranchProjectId(null)}
        projectPath={createBranchProject?.path ?? ''}
        projectName={createBranchProject?.name ?? ''}
        branches={(createBranchProject?.branches ?? []).map((b) => b.name)}
        defaultSource={createBranchProject?.defaultBranch}
        onCreated={(result) =>
          createBranchProject && handleBranchCreated(createBranchProject, result)
        }
      />

      <ConfirmDeleteBranchModal
        isOpen={!!confirmDeleteBranchTarget}
        onClose={() => setConfirmDeleteBranchTarget(null)}
        onConfirm={confirmDeleteBranch}
        branchName={confirmDeleteBranchTarget?.branchName ?? ''}
        projectName={confirmDeleteBranchTarget?.project.name ?? ''}
      />

      <ConfirmForceStartTaskModal
        isOpen={!!forceStart}
        taskTitle={forceStart?.title ?? ''}
        chain={forceStart?.chain ?? []}
        onClose={() => setForceStart(null)}
        onConfirm={() => {
          const pending = forceStart;
          if (!pending) return;
          void (async () => {
            try {
              for (const t of pending.chain) {
                await taskService.update(pending.path, t.id, { status: 'done' });
              }
              await pending.proceed();
            } catch (e: any) {
              alert(`Error updating tasks: ${e.message}`);
            }
          })();
        }}
      />
    </div>
  );
});

export default ProjectPanel;
