import { useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useCodeStore } from '../../../shared/stores/code.store';
import type { BranchInfo } from '../types/session.types';
import type { ProjectExtended } from '../types/project-panel.types';

interface UseProjectActionsArgs {
  projects: ProjectExtended[];
  setProjects: Dispatch<SetStateAction<ProjectExtended[]>>;
  patchProject: (id: string, fn: (p: ProjectExtended) => ProjectExtended) => void;
  pendingGroupAssign: { projectId: string; groupId: string } | null;
  setPendingGroupAssign: (v: { projectId: string; groupId: string } | null) => void;
}

export function useProjectActions({
  projects,
  setProjects,
  patchProject,
  pendingGroupAssign,
  setPendingGroupAssign,
}: UseProjectActionsArgs) {
  const updateProject = useCodeStore((s) => s.updateProject);

  const setBranchVisible = useCallback(
    (projectId: string, branchName: string, visible?: boolean) => {
      const storeProject = useCodeStore.getState().projects.find((p) => p.id === projectId);
      const apply = (branches: BranchInfo[]) =>
        branches.map((b) => (b.name === branchName ? { ...b, visible: visible ?? !b.visible } : b));
      if (storeProject) updateProject(projectId, { branches: apply(storeProject.branches ?? []) });
      patchProject(projectId, (p) => ({ ...p, branches: apply(p.branches) }));
    },
    [patchProject, updateProject],
  );

  const toggleBranchVisibility = useCallback(
    (projectId: string, branchName: string) => setBranchVisible(projectId, branchName),
    [setBranchVisible],
  );

  const moveProject = useCallback(
    (projectId: string, dir: -1 | 1) => {
      setProjects((prev) => {
        const i = prev.findIndex((p) => p.id === projectId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    [setProjects],
  );

  const toggleProjectHidden = useCallback(
    (projectId: string) => patchProject(projectId, (p) => ({ ...p, hidden: !p.hidden })),
    [patchProject],
  );

  const setProjectGroup = useCallback(
    (projectId: string, groupId: string | null) =>
      patchProject(projectId, (p) => ({ ...p, groupId })),
    [patchProject],
  );

  useEffect(() => {
    if (!pendingGroupAssign) return;
    if (!projects.some((p) => p.id === pendingGroupAssign.projectId)) return;
    setProjectGroup(pendingGroupAssign.projectId, pendingGroupAssign.groupId);
    setPendingGroupAssign(null);
  }, [pendingGroupAssign, projects, setProjectGroup]);

  return {
    setBranchVisible,
    toggleBranchVisibility,
    moveProject,
    toggleProjectHidden,
    setProjectGroup,
  };
}