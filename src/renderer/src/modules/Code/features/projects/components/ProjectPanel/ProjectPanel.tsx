import { terminalIpc } from '../../../../shared/ipc/terminal.ipc';
import { fsIpc } from '../../../../shared/ipc/fs.ipc';
import { shellIpc } from '../../../../shared/ipc/shell.ipc';
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
// ── Icons ──
import {
  ChevronRight,
  Plus,
  Eye,
  ArrowUp,
  ArrowDown,
  Trash2,
  Folder,
  FolderPlus,
  Pencil,
  X,
  Unlink,
  Link2,
  GitBranch,
  Square,
  Download as DownloadIcon,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { codeApi } from '../../../../shared/api/code.api';
import { Settings as SettingsIcon } from 'lucide-react';
// ── Hooks & Store ──
import { useCodeStore } from '../../../../shared/stores/code.store';
import { useBranchScopeStore, toScopeKey } from '../../../../shared/stores/branch-scope.store';
import { taskService } from '../../../../shared/services/task.service';
import { toBranchTargetId } from './modals/ProjectConflictModal';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ── Shared UI components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
} from '@renderer/components/ui/Dropdown';

// ── Local modals ──
import type { MergeCandidate } from '../modals/ConfirmLinkProjectModal';

// ── Group Picker Form ──
import { GROUP_ICONS } from './GroupPickerForm';

// ── Shared definitions ──
import { StatusDot, TaskIcon } from '../SessionCard/SessionBadges';
import { STATUS_ORDER, STATUS_LABELS, TASK_STATUSES } from '../../constants/session.constants';
import {
  type SessionInfo,
  type BranchInfo,
  type ProcessInteractHandler,
  type MenuPosition,
} from '../../types/session.types';

import { mkSum } from '../../utils/session-summary.util';
import { useProjectSelection } from '../../hooks/useProjectSelection';
import { useProjectActions } from '../../hooks/useProjectActions';
import { useBranchActions } from '../../hooks/useBranchActions';
import { useProjectDnd } from '../../hooks/useProjectDnd';
import { useProjectTaskActions } from '../../hooks/useProjectTaskActions';
import { useProjectDialogs } from '../../hooks/useProjectDialogs';
import { useProjectMutations } from '../../hooks/useProjectMutations';
import { useProjectListView } from '../../hooks/useProjectListView';
import { useProjectGroups } from '../../hooks/useProjectGroups';
import { useProjectConflict } from '../../hooks/useProjectConflict';
import type {
  ProjectExtended,
  SortMode,
  DropdownTarget,
} from '../../types/project-panel.types';


// ── Project Card Component ──
import { ProjectCard } from '../ProjectCard/ProjectCard';
import { ScrollToSessionButton } from './ScrollToSessionButton';
import { ProjectToolbar } from './ProjectToolbar';
import { ProjectList } from './ProjectList';
import { ProjectDialogs } from './ProjectDialogs';

import { MenuLabel, ck } from './menu-helpers';
// ─── Local Types ────────────────────────────────────────────────────────

const SORTS: [SortMode, string][] = [
  ['manual', 'Manual'],
  ['name', 'Name A → Z'],
  ['status', 'Status priority'],
  ['tokens', 'Token usage'],
];


// ─── Constants & Helpers ────────────────────────────────────────────────


/** Fetches real git branches for a project via IPC and maps them to BranchInfo[] */
async function fetchRealBranches(projectPath: string): Promise<BranchInfo[]> {
  try {
    // ASSUMED: prune ref remote đã xóa trên GitHub; bỏ qua lỗi khi offline
    await codeApi.git.fetch(projectPath).catch(() => null);
    const res = await codeApi.git.branches(projectPath);

    if (res?.error) {
      console.warn('[ProjectPanel] Failed to list branches', res.error);
      return [];
    }

    const rawBranches: string[] = res.branches || [];
    const worktreePaths: Record<string, string> = res.worktreePaths || {};
    const status = await codeApi.git.status(projectPath).catch(() => null);
    const currentBranch: string = status?.branch ?? '';

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

    const remoteOnly = Array.from(
      new Set(
        rawBranches
          .filter((n) => typeof n === 'string' && n.startsWith('origin/') && !n.endsWith('/HEAD'))
          .map((n) => n.slice('origin/'.length)),
      ),
    ).filter((n) => n && !uniqueBranches.includes(n));

    return [
      ...uniqueBranches.map((name) => ({
        name,
        visible: !currentBranch || name === currentBranch,
        sessions: [],
        path: worktreePaths[name],
      })),
      ...remoteOnly.map((name) => ({ name, visible: false, sessions: [], remote: true })),
    ];
  } catch (e) {
    console.error('[ProjectPanel] Exception fetching branches', e);
    return [];
  }
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

  const { projects, setProjects, patchProject, patchSession } = useProjectMutations();

  const {
    groups,
    setGroups,
    renamingGroupId,
    setRenamingGroupId,
    groupFormOpen,
    setGroupFormOpen,
    editingGroupId,
    setEditingGroupId,
    ungroupedOpen,
    setUngroupedOpen,
    ungroupIndex,
    setUngroupIndex,
  } = useProjectGroups();


  // ── UI state ──
  const {
    selectedSessionId,
    setSelectedSessionId,
    expandedIds,
    setExpandedIds,
    activeTaskManagerProjectId,
    setActiveTaskManagerProjectId,
    activeGitProjectId,
    setActiveGitProjectId,
    activePullRequestProjectId,
    setActivePullRequestProjectId,
    gitRepoByProject,
    setGitRepoByProject,
    busyTargetIds,
    blockedTarget,
    setBlockedTarget,
    handleToggleProject,
    handleOpenProject,
    handleSelectProject,
    handleSelectSession,
    handleToggleGit,
    handleTogglePullRequest,
    handleToggleTaskManager,
  } = useProjectSelection(projects, setProjects);
  const {
    query,
    setQuery,
    sortMode,
    setSortMode,
    filterStatus,
    setFilterStatus,
    shownProjects,
  } = useProjectListView(projects);
  const [treeOpen, setTreeOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [dropdownTarget, setDropdownTarget] = useState<DropdownTarget | null>(null);
  const isSettingsOpen = useCodeStore((s) => s.contentViewMode === 'settings');
  const dialogs = useProjectDialogs();
  const {
    setAddModalOpen,
    setAddToGroupId,
    pendingGroupAssign,
    setPendingGroupAssign,
    confirmDeleteTarget,
    setConfirmDeleteTarget,
    createBranchProjectId,
    setCreateBranchProjectId,
    settingsProjectId,
    setSettingsProjectId,
    mergeTarget,
    setMergeTarget,
    existingBranchTarget,
    setExistingBranchTarget,
    setSyncBranchTarget,
    confirmDeleteBranchTarget,
    setConfirmDeleteBranchTarget,
    setConfirmUnlinkBranchTarget,
    setAssignTaskTarget,
    setConfirmUnassign,
  } = dialogs;
  const [toast, setToast] = useState<{ msg: string; on: boolean }>({ msg: '', on: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);


  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, on: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 1600);
  }, []);


  // Track which project IDs have already been fetched to prevent infinite loops/re-fetching
  const fetchedBranchesRef = useRef<Set<string>>(new Set());

  // Tự xóa project khỏi panel khi folder nguồn không còn tồn tại trên ổ đĩa.
  // Chạy lúc mount và mỗi khi cửa sổ được focus lại (bắt trường hợp xóa folder khi app đang mở).
  const validateAndPrune = useCallback(async () => {
    const all = useCodeStore.getState().projects.filter((p) => p.path);
    if (all.length === 0) return;

    // Tập hợp mọi path cần kiểm tra: path project + path của các branch đã link (worktree)
    const pathSet = new Set<string>();
    for (const p of all) {
      if (p.path) pathSet.add(p.path);
      for (const b of p.branches ?? []) {
        if ((b as any).path) pathSet.add((b as any).path as string);
      }
    }
    if (pathSet.size === 0) return;

    let invalid: string[] = [];
    try {
      const res = await fsIpc.validatePaths(Array.from(pathSet));
      invalid = res?.invalidPaths ?? [];
    } catch {
      return;
    }
    if (invalid.length === 0) return;
    const gone = new Set(invalid);
    const state = useCodeStore.getState();

    for (const p of all) {
      if (p.path && gone.has(p.path)) {
        state.removeProject(p.id);
        continue;
      }
      // Prune các branch link có worktree path đã bị xóa
      const staleBranches = (p.branches ?? []).filter((b) => {
        const bp = (b as any).path as string | undefined;
        return bp ? gone.has(bp) : false;
      });
      if (staleBranches.length === 0) continue;
      const staleNames = new Set(staleBranches.map((b) => b.name));
      const newBranches = (p.branches ?? []).filter((b) => !staleNames.has(b.name));
      const unlinked = new Set<string>((p as any).unlinkedBranches ?? []);
      staleNames.forEach((n) => unlinked.add(n));
      state.updateProject(p.id, {
        branches: newBranches,
        unlinkedBranches: Array.from(unlinked),
      } as any);
    }
  }, []);

  useEffect(() => {
    validateAndPrune();
    const onFocus = () => validateAndPrune();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [validateAndPrune]);

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

              const unlinked = new Set<string>((p as any).unlinkedBranches ?? []);
              const visibleGitBranches = realBranches.filter((b) => !unlinked.has(b.name));
              const mergedBranches = visibleGitBranches.map((gitBranch) => {
                const existing = existingBranchMap.get(gitBranch.name);
                if (existing) {
                  // Keep existing sessions and visibility settings
                  const linkedPath = gitBranch.path ?? existing.path;
                  return {
                    ...gitBranch,
                    sessions: existing.sessions,
                    visible: existing.visible,
                    path: linkedPath,
                    remote: linkedPath ? undefined : gitBranch.remote,
                  };
                }
                // New branch from Git, start with empty sessions
                return gitBranch;
              });

              // Branch đã link (có path) nhưng bị loại khỏi git list của project gốc (vd: worktree branch)
              // vẫn phải được giữ lại — so khớp theo name + path, không chỉ name.
              const linkedOnly = p.branches.filter(
                (b) => b.path && !mergedBranches.some((m) => m.name === b.name),
              );
              const orderOf = (name: string) => {
                const idx = p.branches.findIndex((b) => b.name === name);
                return idx < 0 ? p.branches.length : idx;
              };
              const finalBranches = [...mergedBranches, ...linkedOnly].sort(
                (a, b) => orderOf(a.name) - orderOf(b.name),
              );

              updateProject(proj.id, { branches: finalBranches });

              return { ...p, branches: finalBranches };
            });
          } else {
            // ASSUMED: có .git nhưng chưa có commit → branch tạm 'no-branch'; project không có git do seedNoGit xử lý ('no-git')
            const repoRes = await codeApi.git
              .isRepo(proj.path)
              .catch(() => false);
            if (repoRes) {
              patchProject(proj.id, (p) => {
                if (p.branches.length > 0) return p;
                const newBranches: BranchInfo[] = [
                  { name: 'no-branch', visible: true, sessions: [], path: p.path },
                ];
                updateProject(proj.id, { branches: newBranches });
                return { ...p, branches: newBranches };
              });
            }
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

  const {
    setBranchVisible,
    toggleBranchVisibility,
    moveProject,
    toggleProjectHidden,
    setProjectGroup,
  } = useProjectActions({
    projects,
    setProjects,
    patchProject,
    pendingGroupAssign,
    setPendingGroupAssign,
  });

  // Removed unused createGroupFromProject as logic shifted to GroupPickerForm + Drag/Drop

  const removeProjectFromStore = useCodeStore((s) => s.removeProject);
  const branchScopes = useBranchScopeStore((s) => s.scopes);

  const handleRemoveProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      setConfirmDeleteTarget(target);
    },
    [projects],
  );

  const detectSameRepo = useCallback(async (newId: string) => {
    const all = useCodeStore.getState().projects;
    const added = all.find((p) => p.id === newId);
    if (!added?.path || (added.branches?.length ?? 0) > 0) return;
    const mine = await codeApi.git.repoIdentity(added.path).catch(() => null);
    if (!mine) return;
    const candidates: MergeCandidate[] = [];
    for (const p of all) {
      if (p.id === newId || !p.path) continue;
      const other = await codeApi.git.repoIdentity(p.path).catch(() => null);
      if (
        other &&
        (other.commonDir === mine.commonDir ||
          (mine.remoteUrl !== '' && other.remoteUrl === mine.remoteUrl))
      ) {
        candidates.push({
          id: p.id,
          name: p.name,
          hasBranch: (p.branches ?? []).some((b) => b.name === mine.branch),
        });
      }
    }
    if (candidates.length > 0) {
      setMergeTarget({
        newProjectId: newId,
        newProjectName: added.name,
        newPath: added.path,
        branch: mine.branch,
        candidates,
      });
    }
  }, []);

  const confirmMergeProject = useCallback(
    (targetId: string) => {
      if (!mergeTarget) return;
      const target = projects.find((p) => p.id === targetId);
      if (!target) return;
      const { branch, newPath, newProjectId } = mergeTarget;
      const exists = target.branches.some((b) => b.name === branch);
      const newBranches: BranchInfo[] = exists
        ? target.branches.map((b) =>
            b.name === branch ? { ...b, path: newPath, visible: true } : b,
          )
        : [...target.branches, { name: branch, visible: true, sessions: [], path: newPath }];
      const unlinkedBranches = ((target as any).unlinkedBranches ?? []).filter(
        (n: string) => n !== branch,
      );
      patchProject(targetId, (p) => ({ ...p, branches: newBranches, unlinkedBranches }) as any);
      updateProject(targetId, { branches: newBranches, unlinkedBranches } as any);
      removeProjectFromStore(newProjectId);
      showToast(`Linked to "${target.name}"`);
      setMergeTarget(null);
    },
    [mergeTarget, projects, patchProject, updateProject, removeProjectFromStore, showToast],
  );

  const confirmRemoveProject = useCallback(() => {
    if (!confirmDeleteTarget) return;
    removeProjectFromStore(confirmDeleteTarget.id);
    showToast(`Removed "${confirmDeleteTarget.name}"`);
    setConfirmDeleteTarget(null);
  }, [confirmDeleteTarget, removeProjectFromStore, showToast]);

  const settingsProject = useMemo(
    () => projects.find((p) => p.id === settingsProjectId) ?? null,
    [projects, settingsProjectId],
  );
  const createBranchProject = useMemo(
    () => projects.find((p) => p.id === createBranchProjectId) ?? null,
    [projects, createBranchProjectId],
  );

  const existingBranchProject = useMemo(
    () => projects.find((p) => p.id === existingBranchTarget?.projectId) ?? null,
    [projects, existingBranchTarget],
  );

  const {
    handleBranchCreated,
    confirmDeleteBranch,
    deleteBranchHasRemote,
    unlinkBranch,
    moveBranch,
    hideBranch,
    handleNewSession,
    handleRemoveSession,
  } = useBranchActions({
    projects,
    setProjects,
    patchProject,
    showToast,
    setSelectedSessionId,
    setBranchVisible,
    confirmDeleteBranchTarget,
  });

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
        terminalIpc.killForeground(target.terminalId).catch(() => {});
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

  const {
    bySession,
    tasksByPath,
    forceStart,
    setForceStart,
    setTaskStatus,
    removeTask,
  } = useProjectTaskActions(projects);

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

  const {
    dragRef,
    isGlobalDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  } = useProjectDnd({
    projects,
    shownProjects,
    groups,
    setGroups,
    setProjects,
    patchProject,
    showToast,
    ungroupIndex,
    setUngroupIndex,
  });

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
    dropdownTarget?.kind === 'task' ? (bySession[dropdownTarget.sessionId] ?? null) : null;
  const activeProjectIndex = activeProject
    ? projects.findIndex((p) => p.id === activeProject.id)
    : -1;

  // Load git repo status for ALL projects so each card can show a "No git" badge
  // (previously only the active project was checked, leaving other cards unknown).
  useEffect(() => {
    let cancelled = false;
    const seedNoGit = (p: ProjectExtended) => {
      if (p.branches.some((b) => b.sessions.length > 0)) return;
      const fresh: SessionInfo = {
        id: `n${Date.now()}-${p.id}`,
        title: 'Workspace',
        status: 'idle',
        time: 'now',
        task: undefined,
        agents: [],
        procs: [],
        summary: mkSum(0, 0, 0, 0, 0, '—'),
      };
      const newBranches: BranchInfo[] = [
        { name: 'no-git', visible: true, sessions: [fresh], path: p.path },
      ];
      setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, branches: newBranches } : x)));
      updateProject(p.id, { branches: newBranches });
      if (p.path) {
        codeApi.sessions
          .create({ id: fresh.id, projectId: p.id, worktreePath: p.path, title: fresh.title })
          .catch((err) => console.error('[ProjectPanel] Failed to create session:', err));
      }
    };
    for (const p of projects) {
      if (!p.path || gitRepoByProject[p.id] !== undefined) continue;
      codeApi.git
        .isRepo(p.path)
        .then((ok: boolean) => {
          if (cancelled) return;
          setGitRepoByProject((prev) => ({ ...prev, [p.id]: !!ok }));
          if (!ok) seedNoGit(p);
        })
        .catch(() => {
          if (cancelled) return;
          setGitRepoByProject((prev) => ({ ...prev, [p.id]: false }));
          seedNoGit(p);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.map((p) => p.id + ':' + p.path).join('|')]);

  // ── Target lock (multi-window) ──
  // ASSUMED: target = branch of the project that owns the active workspace session (id: `${projectId}::${branchName}`)
  const activeWorkspaceSessionId = useCodeStore((s) => s.activeWorkspaceSessionId);

  const currentBranchName = useMemo(() => {
    if (!currentProjectId || !activeWorkspaceSessionId) return null;
    const owner = projects
      .find((p) => p.id === currentProjectId)
      ?.branches.find((b) => b.sessions.some((s) => s.id === activeWorkspaceSessionId));
    return owner?.name ?? null;
  }, [projects, currentProjectId, activeWorkspaceSessionId]);

  const currentTargetId =
    currentProjectId && currentBranchName
      ? toBranchTargetId(currentProjectId, currentBranchName)
      : null;

  const handleUnselectProject = useCallback(() => {
    setSelectedSessionId(null);
    setActiveGitProjectId(null);
    setActivePullRequestProjectId(null);
    setActiveTaskManagerProjectId(null);
    setCurrentProject(undefined as unknown as string);
    setActiveWorkspaceSessionId(null);
    setContentViewMode('files');
  }, [setCurrentProject, setActiveWorkspaceSessionId, setContentViewMode]);

  const {
    conflictProject,
    conflictOptions,
    busyBranchesByProject,
    setConflictOpen,
    handleReleaseElsewhere,
    handleFocusElsewhere,
  } = useProjectConflict({
    projects,
    rawProjects,
    currentProjectId,
    currentTargetId,
    busyTargetIds,
    onUnselectProject: handleUnselectProject,
  });

  const handleSwitchBranch = useCallback(
    (projectId: string, branchName: string, force = false) => {
      const branch = projects
        .find((p) => p.id === projectId)
        ?.branches.find((b) => b.name === branchName);
      if (!branch) return;
      if (!force && busyTargetIds.has(toBranchTargetId(projectId, branchName))) {
        setBlockedTarget({ projectId, branchName });
        return;
      }
      const sessionId = branch.sessions[0]?.id;
      if (sessionId) handleSelectSession(sessionId, force);
      else {
        setCurrentProject(projectId);
        handleNewSession(projectId, branchName);
      }
    },
    [projects, busyTargetIds, handleSelectSession, handleNewSession, setCurrentProject],
  );

  const handleConflictSelectProject = useCallback(
    (projectId: string) => {
      const visible =
        projects.find((p) => p.id === projectId)?.branches.filter((b) => b.visible) ?? [];
      if (visible.length === 1) {
        handleSwitchBranch(projectId, visible[0].name);
        return;
      }
      setActiveWorkspaceSessionId(null);
      handleSelectProject(projectId);
      setContentViewMode('workspace');
    },
    [
      projects,
      handleSwitchBranch,
      handleSelectProject,
      setActiveWorkspaceSessionId,
      setContentViewMode,
    ],
  );

  // ASSUMED: expand project đang collapse → tự chọn branch rảnh đầu tiên (từ trên xuống); không có thì giữ hành vi cũ
  const handleCardSelectProject = useCallback(
    (projectId: string) => {
      if (expandedIds.has(projectId) || gitRepoByProject[projectId] === false) {
        handleSelectProject(projectId);
        return;
      }
      const freeBranch = projects
        .find((p) => p.id === projectId)
        ?.branches.find(
          (b) => b.visible && !busyTargetIds.has(toBranchTargetId(projectId, b.name)),
        );
      if (freeBranch) handleSwitchBranch(projectId, freeBranch.name);
      else handleSelectProject(projectId);
    },
    [
      expandedIds,
      gitRepoByProject,
      projects,
      busyTargetIds,
      handleSelectProject,
      handleSwitchBranch,
    ],
  );

  useEffect(() => {
    const onSelectBranch = (e: Event) => {
      const { projectId, branchName, sessionId } = (e as CustomEvent).detail ?? {};
      if (sessionId) handleSelectSession(sessionId);
      else if (projectId && branchName) handleSwitchBranch(projectId, branchName);
    };
    window.addEventListener('phantoma:select-branch', onSelectBranch);
    return () => window.removeEventListener('phantoma:select-branch', onSelectBranch);
  }, [handleSelectSession, handleSwitchBranch]);

  // ── Render helpers ──
  const renderCard = (project: ProjectExtended) => (
    <ProjectCard
      key={project.id}
      project={project}
      isSelected={expandedIds.has(project.id)}
      isProjectSelected={currentProjectId === project.id}
      busyBranchNames={busyBranchesByProject.get(project.id)}
      onReleaseElsewhere={handleReleaseElsewhere}
      onFocusElsewhere={handleFocusElsewhere}
      onSelectProject={handleCardSelectProject}
      selectedSessionId={selectedSessionId}
      isTaskManagerActive={activeTaskManagerProjectId === project.id}
      isGitActive={activeGitProjectId === project.id}
      hasGit={gitRepoByProject[project.id]}
      onToggleGit={handleToggleGit}
      isPullRequestActive={activePullRequestProjectId === project.id}
      onTogglePullRequest={handleTogglePullRequest}
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
    (name: string, projectIds: string[]) => {
      const id = `g${Date.now()}`;
      setGroups((prev) => [...prev, { id, name, open: true, iconId: 'folder' }]);
      if (projectIds.length > 0) {
        setProjects((prev) =>
          prev.map((p) => (projectIds.includes(p.id) ? { ...p, groupId: id } : p)),
        );
      }
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

  const draggingGroup = isGlobalDragging && dragRef.current?.type === 'group';
  const ungroupPos = Math.min(Math.max(ungroupIndex, 0), groups.length);

  // ── Render ──
  return (
    <div className="flex flex-col h-full w-[340px] shrink-0 min-h-0 bg-panel-background border-r border-border overflow-hidden">
      <ProjectToolbar
        shownCount={shownProjects.length}
        projects={projects}
        groups={groups}
        treeOpen={treeOpen}
        setTreeOpen={setTreeOpen}
        closeTree={() => setTreeOpen(false)}
        onToggleProjectHidden={toggleProjectHidden}
        onCreateGroup={() => {
          setGroupFormOpen(true);
          setEditingGroupId(null);
        }}
        anyOpen={anyOpen}
        onToggleExpandAll={toggleExpandAll}
        isDirty={isDirty}
        onOpenFilterMenu={(pos) => setDropdownTarget({ kind: 'header-config', pos })}
        onAddProject={() => setAddModalOpen(true)}
        isSettingsOpen={isSettingsOpen}
        onOpenSettings={() => useCodeStore.getState().setContentViewMode('settings')}
        query={query}
        setQuery={setQuery}
      />

      {/* Project list */}
      <ProjectList
        scrollContainerRef={scrollContainerRef}
        projects={projects}
        shownProjects={shownProjects}
        groups={groups}
        groupFormOpen={groupFormOpen}
        editingGroupId={editingGroupId}
        renamingGroupId={renamingGroupId}
        ungroupedOpen={ungroupedOpen}
        ungroupPos={ungroupPos}
        draggingGroup={draggingGroup}
        dragGroupId={dragRef.current?.groupId}
        renderCard={renderCard}
        onCreateGroup={handleCreateGroup}
        onCancelCreateGroup={() => setGroupFormOpen(false)}
        onUpdateGroup={handleUpdateGroup}
        onCancelEditGroup={() => setEditingGroupId(null)}
        onEditGroup={(id) => setEditingGroupId(id)}
        onToggleGroup={toggleGroup}
        onToggleUngrouped={() => setUngroupedOpen((o) => !o)}
        onOpenGroupMenu={(groupId, pos) => setDropdownTarget({ kind: 'group', groupId, pos })}
        onFinishRename={finishRename}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

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
                {(() => {
                  const MAX_INLINE_BRANCHES = 5;
                  const all = activeProject.branches;
                  const renderBranchItem = (b: BranchInfo) => (
                    <DropdownItem
                      key={b.name}
                      icon={ck(b.visible)}
                      closeOnSelect={false}
                      onClick={() => {
                        if (b.visible || b.path || b.name === activeProject.defaultBranch) {
                          toggleBranchVisibility(activeProject.id, b.name);
                          return;
                        }
                        setExistingBranchTarget({
                          projectId: activeProject.id,
                          branchName: b.name,
                        });
                        closeDropdown();
                      }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className={cn('truncate', !b.visible && 'text-text-secondary/60')}>
                          {b.name}
                        </span>
                        {b.name === activeProject.defaultBranch && (
                          <span className="inline-flex items-center h-[16px] px-1.5 rounded-[5px] shrink-0 text-[9.5px] font-medium text-primary bg-primary/10">
                            default
                          </span>
                        )}
                      </span>
                    </DropdownItem>
                  );
                  return (
                    <>
                      {all.slice(0, MAX_INLINE_BRANCHES).map(renderBranchItem)}
                      {all.length > MAX_INLINE_BRANCHES && (
                        <DropdownSub side="right" sideOffset={4}>
                          <DropdownSubTrigger icon={<GitBranch className="w-3.5 h-3.5" />}>
                            Xem thêm ({all.length - MAX_INLINE_BRANCHES})
                          </DropdownSubTrigger>
                          <DropdownSubContent className="min-w-[200px] max-h-[240px] overflow-y-auto">
                            {all.map(renderBranchItem)}
                          </DropdownSubContent>
                        </DropdownSub>
                      )}
                    </>
                  );
                })()}

                <DropdownSeparator />

                <DropdownItem
                  icon={<GitBranch className="w-3.5 h-3.5" />}
                  disabled={gitRepoByProject[activeProject.id] !== true}
                  onClick={() => {
                    setCreateBranchProjectId(activeProject.id);
                    closeDropdown();
                  }}
                >
                  Create branch...
                  {gitRepoByProject[activeProject.id] === false && (
                    <span className="ml-2 text-[10px] text-text-secondary/60">
                      No git repository
                    </span>
                  )}
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
                <DropdownItem
                  icon={<SettingsIcon className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSettingsProjectId(activeProject.id);
                    closeDropdown();
                  }}
                >
                  Setting
                </DropdownItem>
                <DropdownItem
                  icon={<Folder className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    const projectId = activeProject.id;
                    closeDropdown();
                    try {
                      const home = await fsIpc.getHomedir();
                      const err = await shellIpc.openPath(`${home}/.phantoma/code/${projectId}`,
                      );
                      if (err) showToast(`Cannot open folder: ${err}`);
                    } catch (e) {
                      console.error('[DEBUG] open-data-folder invoke failed', e);
                    }
                  }}
                >
                  Open data folder
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
                      const err = await shellIpc.openPath(target);
                      if (err) showToast(`Cannot open folder: ${err}`);
                    } catch (e) {
                      console.error('[DEBUG] open-folder invoke failed', e);
                    }
                  }}
                >
                  Open Folder
                </DropdownItem>
                {activeBranch.name !== activeProject.defaultBranch && (
                  <DropdownItem
                    icon={<DownloadIcon className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSyncBranchTarget({
                        project: activeProject,
                        branchName: activeBranch.name,
                        branchPath: activeBranch.path ?? activeProject.path,
                      });
                      closeDropdown();
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">Sync from {activeProject.defaultBranch}</span>
                      <span className="shrink-0 rounded bg-success/15 px-1.5 py-[3px] text-[10.5px] font-semibold leading-none tracking-wide text-success">
                        DEFAULT
                      </span>
                    </span>
                  </DropdownItem>
                )}
                {activeBranch.name !== activeProject.defaultBranch &&
                  (() => {
                    const scopeUnset =
                      (branchScopes[toScopeKey(activeProject.id, activeBranch.name)] ?? [])
                        .length === 0;
                    return (
                      <DropdownItem
                        icon={
                          scopeUnset ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )
                        }
                        variant={scopeUnset ? 'error' : undefined}
                        onClick={() => {
                          const detail = {
                            projectId: activeProject.id,
                            branchName: activeBranch.name,
                          };
                          closeDropdown();
                          window.dispatchEvent(
                            new CustomEvent('phantoma:open-branch-scope', { detail }),
                          );
                        }}
                      >
                        Set scope
                      </DropdownItem>
                    );
                  })()}

                {(() => {
                  const path = activeProject.path;
                  const assigned = (tasksByPath[path] ?? []).find(
                    (t) => !t.archived && t.branchName === activeBranch.name,
                  );
                  return assigned ? (
                    <DropdownItem
                      icon={<Unlink className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setConfirmUnassign({
                          title: assigned.title,
                          run: () => {
                            void taskService.update(path, assigned.id, {
                              sessionId: null,
                              branchName: null,
                              ...(assigned.status === 'progress'
                                ? { status: 'todo' as const }
                                : {}),
                            });
                          },
                        });
                        closeDropdown();
                      }}
                    >
                      Unassign task
                    </DropdownItem>
                  ) : (
                    <DropdownItem
                      icon={<Link2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setAssignTaskTarget({
                          projectId: activeProject.id,
                          sessionId: null,
                          branchName: activeBranch.name,
                        });
                        closeDropdown();
                      }}
                    >
                      Assign task...
                    </DropdownItem>
                  );
                })()}

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
                      icon={<Unlink className="w-3.5 h-3.5" />}
                      variant="error"
                      onClick={() => {
                        setConfirmUnlinkBranchTarget({
                          project: activeProject,
                          branchName: activeBranch.name,
                          branchPath: activeBranch.path ?? activeProject.path,
                        });
                        closeDropdown();
                      }}
                    >
                      Remove link
                    </DropdownItem>
                    {activeBranch.path && (
                      <DropdownItem
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        variant="error"
                        onClick={() => {
                          setConfirmDeleteBranchTarget({
                            project: activeProject,
                            branchName: activeBranch.name,
                            branchPath: activeBranch.path!,
                          });
                          closeDropdown();
                        }}
                      >
                        Delete folder
                      </DropdownItem>
                    )}
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
                  icon={<FolderPlus className="w-3 h-3" />}
                  onClick={() => {
                    setAddToGroupId(activeGroup.id);
                    setAddModalOpen(true);
                    closeDropdown();
                  }}
                >
                  Add project
                </DropdownItem>
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
                        const sessionId = dropdownTarget.sessionId;
                        setConfirmUnassign({
                          title: bySession[sessionId]?.title ?? '',
                          run: () => removeTask(sessionId),
                        });
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
                        icon={ck(
                          bySession[dropdownTarget.sessionId]?.status === k,
                          <TaskIcon status={k} />,
                        )}
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
                      setAssignTaskTarget({
                        projectId: dropdownTarget.projectId,
                        sessionId: dropdownTarget.sessionId,
                        branchName: null,
                      });
                      closeDropdown();
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
                    codeApi.sessions
                      .remove(sessionId)
                      .catch((err) =>
                        console.error('[ProjectPanel] Failed to delete session:', err),
                      );
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

      <ProjectDialogs
        dialogs={dialogs}
        projects={projects}
        groups={groups}
        settingsProject={settingsProject}
        createBranchProject={createBranchProject}
        existingBranchProject={existingBranchProject}
        deleteBranchHasRemote={deleteBranchHasRemote}
        tasksByPath={tasksByPath}
        forceStart={forceStart}
        setForceStart={setForceStart}
        blockedTarget={blockedTarget}
        setBlockedTarget={setBlockedTarget}
        conflictProject={conflictProject}
        conflictOptions={conflictOptions}
        currentBranchName={currentBranchName}
        currentTargetId={currentTargetId}
        setConflictOpen={setConflictOpen}
        patchProject={patchProject}
        updateProject={updateProject}
        showToast={showToast}
        detectSameRepo={detectSameRepo}
        confirmMergeProject={confirmMergeProject}
        confirmRemoveProject={confirmRemoveProject}
        confirmDeleteBranch={confirmDeleteBranch}
        handleBranchCreated={handleBranchCreated}
        unlinkBranch={unlinkBranch}
        handleConflictSelectProject={handleConflictSelectProject}
        handleSwitchBranch={handleSwitchBranch}
        handleUnselectProject={handleUnselectProject}
      />

      {/* Scroll to selected session button */}
      <ScrollToSessionButton
        selectedSessionId={selectedSessionId}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
});

export default ProjectPanel;
