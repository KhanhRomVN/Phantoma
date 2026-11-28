// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// ── Components ──
import { toBranchTargetId } from '../components/ProjectPanel/modals/ProjectConflictModal';

// ── Hooks ──
import { useBusyTargetIds } from '@renderer/hooks/useTargetLock';

// ── Services ──
import { codeApi } from '../../../shared/api/code.api';
import { toastService } from '@renderer/components/ui/Toast';

// ── Stores ──
import { useCodeStore } from '../../../shared/stores/code.store';
import { useBranchScopeStore, toScopeKey } from '../../../shared/stores/branch-scope.store';

// ── Utils ──
import { mkSum } from '../utils/session-summary.util';

// ── Types ──
import type { SessionInfo, BranchInfo } from '../types/session.types';
import type { ProjectExtended } from '../types/project-panel.types';

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProjectSelection(
  projects: ProjectExtended[],
  setProjects: Dispatch<SetStateAction<ProjectExtended[]>>,
) {
  // ── Store ──
  const updateProject = useCodeStore((s) => s.updateProject);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);
  const setExplorerRoot = useCodeStore((s) => s.setExplorerRoot);
  const setActiveWorkspaceSessionId = useCodeStore((s) => s.setActiveWorkspaceSessionId);
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);

  // ── State ──
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTaskManagerProjectId, setActiveTaskManagerProjectId] = useState<string | null>(null);
  const [activeGitProjectId, setActiveGitProjectId] = useState<string | null>(null);
  const [activePullRequestProjectId, setActivePullRequestProjectId] = useState<string | null>(null);
  const [gitRepoByProject, setGitRepoByProject] = useState<Record<string, boolean>>({});

  // ── Derived ──
  const busyTargetIds = useBusyTargetIds('code');

  // ── State ──
  const [blockedTarget, setBlockedTarget] = useState<{
    projectId: string;
    branchName: string;
  } | null>(null);

  // ── Callbacks ──
  const handleToggleProject = useCallback((projectId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const handleOpenProject = useCallback((projectId: string) => {
    setExpandedIds((prev) => (prev.has(projectId) ? prev : new Set(prev).add(projectId)));
  }, []);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      setSelectedSessionId(null);
      setActiveGitProjectId(null);
      setActivePullRequestProjectId(null);
      setActiveTaskManagerProjectId(null);
      setCurrentProject(projectId);

      // ASSUMED: project không có git không có branch/session → tự tạo 1 session mặc định để mở Workspace (empty state tạo tab)
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || gitRepoByProject[projectId] !== false) return;
      let sessionId = proj.branches.flatMap((b) => b.sessions)[0]?.id;
      if (!sessionId) {
        const fresh: SessionInfo = {
          id: `n${Date.now()}`,
          title: 'Workspace',
          status: 'idle',
          time: 'now',
          task: undefined,
          agents: [],
          procs: [],
          summary: mkSum(0, 0, 0, 0, 0, '—'),
        };
        sessionId = fresh.id;
        const newBranches: BranchInfo[] = [
          { name: 'no-git', visible: true, sessions: [fresh], path: proj.path },
        ];
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, branches: newBranches } : p)),
        );
        updateProject(projectId, { branches: newBranches });
        if (proj.path) {
          codeApi.sessions
            .create({ id: fresh.id, projectId, worktreePath: proj.path, title: fresh.title })
            .catch((err) => {
              console.error('[ProjectPanel] Failed to create session:', err);
              toastService.show({
                variant: 'error',
                title: 'Create session failed',
                description: String(err?.message ?? err).split('\n')[0],
              });
            });
        }
      }
      setSelectedSessionId(sessionId);
      setExplorerRoot(projectId, proj.path ?? null);
      setActiveWorkspaceSessionId(sessionId);
      setContentViewMode('workspace');
    },
    [
      projects,
      gitRepoByProject,
      updateProject,
      setCurrentProject,
      setExplorerRoot,
      setActiveWorkspaceSessionId,
      setContentViewMode,
      setProjects,
    ],
  );

  const handleSelectSession = useCallback(
    (sessionId: string, force = false) => {
      if (!sessionId) {
        setSelectedSessionId(null);
        setCurrentProject(undefined as unknown as string);
        return;
      }

      const parentProject = projects.find((p) =>
        p.branches.some((b) => b.sessions.some((s) => s.id === sessionId)),
      );

      if (!parentProject) {
        console.warn('[DEBUG_SELECT_SESSION] Session not found in any project', { sessionId });
        return;
      }

      // ASSUMED: branch đang mở ở cửa sổ khác thì không select, chỉ hiện modal xung đột
      const targetBranch = parentProject.branches.find((b) =>
        b.sessions.some((s) => s.id === sessionId),
      );
      if (
        !force &&
        targetBranch &&
        busyTargetIds.has(toBranchTargetId(parentProject.id, targetBranch.name))
      ) {
        setBlockedTarget({ projectId: parentProject.id, branchName: targetBranch.name });
        return;
      }

      if (targetBranch && parentProject.defaultBranch !== targetBranch.name) {
        const scoped =
          useBranchScopeStore.getState().scopes[toScopeKey(parentProject.id, targetBranch.name)];
        if (!scoped || scoped.length === 0) {
          const detail = {
            projectId: parentProject.id,
            branchName: targetBranch.name,
            handled: false,
            onSaved: () => handleSelectSession(sessionId, force),
          };
          window.dispatchEvent(new CustomEvent('phantoma:open-branch-scope', { detail }));
          if (detail.handled) return;
        }
      }

      setSelectedSessionId(sessionId);

      setCurrentProject(parentProject.id);
      const parentBranch = parentProject.branches.find((b) =>
        b.sessions.some((s) => s.id === sessionId),
      );
      setExplorerRoot(parentProject.id, parentBranch?.path ?? null);

      if (activeTaskManagerProjectId) {
        setActiveTaskManagerProjectId(null);
      }
      if (activeGitProjectId) {
        setActiveGitProjectId(null);
      }
      if (activePullRequestProjectId) {
        setActivePullRequestProjectId(null);
      }

      setActiveWorkspaceSessionId(sessionId);
      setContentViewMode('workspace');
    },
    [
      projects,
      setCurrentProject,
      setExplorerRoot,
      setActiveWorkspaceSessionId,
      setContentViewMode,
      activeTaskManagerProjectId,
      activeGitProjectId,
      activePullRequestProjectId,
      busyTargetIds,
    ],
  );

  const handleToggleGit = useCallback(
    (projectId: string) => {
      if (gitRepoByProject[projectId] === false) return;

      setSelectedSessionId(null);
      setActiveTaskManagerProjectId(null);

      if (activeGitProjectId === projectId) {
        setActiveGitProjectId(null);
        setContentViewMode('files');
      } else {
        setCurrentProject(projectId);
        setActiveGitProjectId(projectId);
        setActivePullRequestProjectId(null);
        setContentViewMode('git');
      }
    },
    [activeGitProjectId, setContentViewMode, setCurrentProject, gitRepoByProject],
  );

  const handleTogglePullRequest = useCallback(
    (projectId: string) => {
      if (gitRepoByProject[projectId] === false) return;

      setSelectedSessionId(null);
      setActiveTaskManagerProjectId(null);
      setActiveGitProjectId(null);

      if (activePullRequestProjectId === projectId) {
        setActivePullRequestProjectId(null);
        setContentViewMode('files');
      } else {
        setCurrentProject(projectId);
        setActivePullRequestProjectId(projectId);
        setContentViewMode('pullrequests');
      }
    },
    [activePullRequestProjectId, setContentViewMode, setCurrentProject, gitRepoByProject],
  );

  const handleToggleTaskManager = useCallback(
    (projectId: string) => {
      setSelectedSessionId(null);

      if (activeTaskManagerProjectId === projectId) {
        setActiveTaskManagerProjectId(null);
        setContentViewMode('files');
      } else {
        setActiveGitProjectId(null);
        setActivePullRequestProjectId(null);
        setCurrentProject(projectId);
        setActiveTaskManagerProjectId(projectId);
        setContentViewMode('tasks');
      }
    },
    [activeTaskManagerProjectId, setContentViewMode, setCurrentProject],
  );

  return {
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
  };
}