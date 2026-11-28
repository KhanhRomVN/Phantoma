// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// ── Services ──
import { gitIpc } from '../../../shared/ipc/git.ipc';
import { codeApi } from '../../../shared/api/code.api';
import { toastService } from '@renderer/components/ui/Toast';

// ── Stores ──
import { useCodeStore } from '../../../shared/stores/code.store';

// ── Utils ──
import type { CreatedBranchResult } from '../../git';
import { mkSum } from '../utils/session-summary.util';

// ── Types ──
import type { BranchInfo, SessionInfo, ProcessInfo } from '../types/session.types';
import type { ProjectExtended } from '../types/project-panel.types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UseBranchActionsArgs {
  projects: ProjectExtended[];
  setProjects: Dispatch<SetStateAction<ProjectExtended[]>>;
  patchProject: (id: string, fn: (p: ProjectExtended) => ProjectExtended) => void;
  showToast: (msg: string) => void;
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>;
  setBranchVisible: (projectId: string, branchName: string, visible?: boolean) => void;
  confirmDeleteBranchTarget: {
    project: ProjectExtended;
    branchName: string;
    branchPath: string;
  } | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useBranchActions({
  projects,
  setProjects,
  patchProject,
  showToast,
  setSelectedSessionId,
  setBranchVisible,
  confirmDeleteBranchTarget,
}: UseBranchActionsArgs) {
  // ── Store ──
  const updateProject = useCodeStore((s) => s.updateProject);

  // ── Callbacks ──
  const handleBranchCreated = useCallback(
    (project: ProjectExtended, result: CreatedBranchResult) => {
      const exists = project.branches.some((b) => b.name === result.branch);
      const newBranches: BranchInfo[] = exists
        ? project.branches.map((b) =>
            b.name === result.branch
              ? { ...b, path: result.path, visible: true, remote: undefined }
              : b,
          )
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

  const confirmDeleteBranch = useCallback(
    async ({ deleteRemote }: { deleteRemote: boolean }) => {
      if (!confirmDeleteBranchTarget) return {};
      const { project, branchName } = confirmDeleteBranchTarget;
      const res = await gitIpc.invoke(
        'git:delete-branch',
        project.path,
        branchName,
        deleteRemote,
        confirmDeleteBranchTarget.branchPath,
      );
      if (res?.error) return { error: res.error as string };
      const removed = project.branches.find((b) => b.name === branchName);
      const removedSessionIds = new Set((removed?.sessions ?? []).map((s) => s.id));
      const newBranches = project.branches.filter((b) => b.name !== branchName);
      patchProject(project.id, (p) => ({ ...p, branches: newBranches }));
      updateProject(project.id, { branches: newBranches } as any);
      setSelectedSessionId((id) => (id && removedSessionIds.has(id) ? null : id));
      showToast(
        res?.remoteError
          ? `Deleted folder of "${branchName}", but remote delete failed: ${res.remoteError}`
          : deleteRemote
            ? `Deleted folder and remote branch of "${branchName}"`
            : `Deleted folder of branch "${branchName}"`,
      );
      return {};
    },
    [confirmDeleteBranchTarget, patchProject, updateProject, showToast],
  );

  // ── State ──
  const [deleteBranchHasRemote, setDeleteBranchHasRemote] = useState(false);

  // ── Effects ──
  useEffect(() => {
    if (!confirmDeleteBranchTarget) {
      setDeleteBranchHasRemote(false);
      return;
    }
    let cancelled = false;
    gitIpc
      .invoke(
        'git:remote-branch-exists',
        confirmDeleteBranchTarget.project.path,
        confirmDeleteBranchTarget.branchName,
      )
      .then((res: { exists?: boolean }) => {
        if (!cancelled) setDeleteBranchHasRemote(!!res?.exists);
      })
      .catch(() => {
        if (!cancelled) setDeleteBranchHasRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [confirmDeleteBranchTarget]);

  // ── Callbacks ──
  const unlinkBranch = useCallback(
    (project: ProjectExtended, branchName: string) => {
      const removed = project.branches.find((b) => b.name === branchName);
      const removedSessionIds = new Set((removed?.sessions ?? []).map((s) => s.id));
      const newBranches = project.branches.filter((b) => b.name !== branchName);
      const unlinkedBranches = Array.from(
        new Set<string>([...((project as any).unlinkedBranches ?? []), branchName]),
      );
      patchProject(project.id, (p) => ({ ...p, branches: newBranches, unlinkedBranches }) as any);
      updateProject(project.id, { branches: newBranches, unlinkedBranches } as any);
      setSelectedSessionId((id) => (id && removedSessionIds.has(id) ? null : id));
      showToast(`Removed link to branch "${branchName}"`);
    },
    [patchProject, updateProject, showToast],
  );

  const moveBranch = useCallback(
    (projectId: string, branchName: string, dir: -1 | 1) => {
      const reorder = (branches: BranchInfo[]) => {
        const i = branches.findIndex((b) => b.name === branchName);
        if (i < 0) return branches;
        let j = i + dir;
        while (j >= 0 && j < branches.length && !branches[j].visible) j += dir;
        if (j < 0 || j >= branches.length) return branches;
        const next = [...branches];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      };
      const storeProject = useCodeStore.getState().projects.find((p) => p.id === projectId);
      if (storeProject)
        updateProject(projectId, { branches: reorder(storeProject.branches ?? []) });
      patchProject(projectId, (p) => ({ ...p, branches: reorder(p.branches) }));
    },
    [patchProject, updateProject],
  );

  const hideBranch = useCallback(
    (projectId: string, branchName: string) => setBranchVisible(projectId, branchName, false),
    [setBranchVisible],
  );

  const handleNewSession = useCallback(
    (projectId: string, branchName: string) => {
      const currentLocalProject = projects.find((p) => p.id === projectId);
      if (!currentLocalProject) {
        console.error('[DEBUG_SESSION_CREATE_FAIL] Project not found in local state', {
          projectId,
        });
        return;
      }

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
        return { ...b, sessions: [fresh] };
      });

      setProjects((prev) => {
        const updated = prev.map((p) => (p.id === projectId ? { ...p, branches: newBranches } : p));
        return updated;
      });

      updateProject(projectId, { branches: newBranches });

      const targetBranch = newBranches.find((b) => b.name === branchName);
      const created = targetBranch?.sessions[0];
      if (created && targetBranch?.path) {
        codeApi.sessions
          .create({
            id: created.id,
            projectId,
            worktreePath: targetBranch.path,
            title: created.title,
          })
          .catch((err) => {
            console.error('[ProjectPanel] Failed to create session:', err);
            toastService.show({
              variant: 'error',
              title: 'Create session failed',
              description: String(err?.message ?? err).split('\n')[0],
            });
          });
      }
    },
    [projects, updateProject],
  );

  // ASSUMED: "Remove Session" ở menu branch xóa toàn bộ session của branch đó (giữ nguyên hành vi cũ)
  const handleRemoveSession = useCallback(
    (projectId: string, branchName: string) => {
      setProjects((prev) => {
        const updatedProjects = prev.map((p) => {
          if (p.id !== projectId) return p;

          const newBranches = p.branches.map((b) => {
            if (b.name !== branchName) return b;
            b.sessions.forEach((s) => {
              codeApi.sessions.remove(s.id).catch(() => {});
            });
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

  return {
    handleBranchCreated,
    confirmDeleteBranch,
    deleteBranchHasRemote,
    unlinkBranch,
    moveBranch,
    hideBranch,
    handleNewSession,
    handleRemoveSession,
  };
}