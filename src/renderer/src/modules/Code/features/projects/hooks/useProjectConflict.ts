import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  fromBranchTargetId,
  toBranchTargetId,
  type ConflictProjectOption,
} from '../components/ProjectPanel/modals/ProjectConflictModal';
import {
  useTargetLock,
  useIsLateClaimant,
  forceReleaseTarget,
  focusTargetOwner,
} from '@renderer/hooks/useTargetLock';
import type { ProjectExtended } from '../types/project-panel.types';

interface UseProjectConflictArgs {
  projects: ProjectExtended[];
  rawProjects: ReadonlyArray<{ id: string; path?: string }>;
  currentProjectId: string | null | undefined;
  currentTargetId: string | null;
  busyTargetIds: ReadonlySet<string>;
  onUnselectProject: () => void;
}

export function useProjectConflict({
  projects,
  rawProjects,
  currentProjectId,
  currentTargetId,
  busyTargetIds,
  onUnselectProject,
}: UseProjectConflictArgs) {
  const [conflictOpen, setConflictOpen] = useState(false);
  // ASSUMED: cửa sổ đang hiện modal xung đột chưa thực sự giữ target nên không được claim
  useTargetLock('code', conflictOpen ? null : currentTargetId, onUnselectProject);

  const busyBranchesByProject = useMemo(() => {
    const map = new Map<string, Set<string>>();
    busyTargetIds.forEach((id) => {
      const { projectId, branchName } = fromBranchTargetId(id);
      const set = map.get(projectId) ?? new Set<string>();
      set.add(branchName);
      map.set(projectId, set);
    });
    return map;
  }, [busyTargetIds]);

  const handleReleaseElsewhere = useCallback((projectId: string, branchName: string) => {
    forceReleaseTarget('code', toBranchTargetId(projectId, branchName));
  }, []);

  const handleFocusElsewhere = useCallback((projectId: string, branchName: string) => {
    focusTargetOwner('code', toBranchTargetId(projectId, branchName));
  }, []);

  const isLateClaimant = useIsLateClaimant('code', currentTargetId);
  const conflictTriggered =
    !!currentTargetId && isLateClaimant && busyTargetIds.has(currentTargetId);
  useEffect(() => {
    if (conflictOpen && currentTargetId && !busyTargetIds.has(currentTargetId)) {
      setConflictOpen(false);
    }
  }, [conflictOpen, currentTargetId, busyTargetIds]);

  useEffect(() => {
    setConflictOpen(conflictTriggered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTargetId]);

  useEffect(() => {
    if (conflictTriggered) setConflictOpen(true);
  }, [conflictTriggered]);

  const conflictProject =
    conflictOpen && currentTargetId
      ? (projects.find((p) => p.id === currentProjectId) ?? null)
      : null;

  const conflictOptions = useMemo<ConflictProjectOption[]>(
    () =>
      projects
        .filter((p) => !p.hidden)
        .map((p) => ({
          id: p.id,
          name: p.name,
          path: rawProjects.find((r) => r.id === p.id)?.path ?? '',
          logoPath: p.logoPath,
          branches: p.branches
            .filter((b) => b.visible)
            .map((b) => ({
              name: b.name,
              busy: busyTargetIds.has(toBranchTargetId(p.id, b.name)),
            })),
        })),
    [projects, rawProjects, busyTargetIds],
  );

  return {
    conflictProject,
    conflictOptions,
    busyBranchesByProject,
    setConflictOpen,
    handleReleaseElsewhere,
    handleFocusElsewhere,
  };
}