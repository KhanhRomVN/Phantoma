import { useMemo } from 'react';
import { useCodeStore } from '../../../shared/stores/code.store';
import { useBranchScope, isInScope } from '../../../shared/stores/branch-scope.store';

export function useActiveBranchName(projectId: string): string {
  return useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === projectId);
    return (
      p?.branches?.find((b) => b.sessions.some((ss) => ss.id === s.activeWorkspaceSessionId))
        ?.name ?? ''
    );
  });
}

export const NO_SCOPES: number[] = [];

export function useScopesBelow(
  projectId: string,
  nodePath: string | undefined,
  isFolder: boolean,
): number[] {
  const branchName = useActiveBranchName(projectId);
  const scope = useBranchScope(projectId, branchName);
  const root = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === projectId);
    return (p?.explorerRoot ?? p?.path ?? '').replace(/\/+$/, '');
  });
  return useMemo(() => {
    if (!isFolder || !nodePath || !root || !nodePath.startsWith(`${root}/`)) return NO_SCOPES;
    const rel = nodePath.slice(root.length + 1);
    if (isInScope(rel, scope)) return NO_SCOPES;
    return scope.flatMap((p, i) => (p.startsWith(`${rel}/`) ? [i + 1] : []));
  }, [isFolder, nodePath, root, scope]);
}
