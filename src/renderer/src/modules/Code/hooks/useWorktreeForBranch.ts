import { useEffect, useState } from 'react';
import { codeApi } from '../services/code-api.service';

/**
 * Query worktreeId từ server dựa trên projectId + branchName.
 * ASSUMED: mỗi branch map 1-1 với 1 worktree (worktree.branch === branchName).
 * Returns undefined nếu chưa load hoặc không tìm thấy.
 */
export function useWorktreeForBranch(projectId: string | undefined, branchName: string | undefined): string | undefined {
  const [worktreeId, setWorktreeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!projectId || !branchName) {
      setWorktreeId(undefined);
      return;
    }

    let cancelled = false;

    codeApi.worktrees
      .list(projectId)
      .then((worktrees) => {
        if (cancelled) return;
        const found = worktrees.find((w) => w.branch === branchName);
        setWorktreeId(found?.id);
      })
      .catch((err) => {
        console.warn('[useWorktreeForBranch] Failed to query worktrees:', err);
        if (!cancelled) setWorktreeId(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, branchName]);

  return worktreeId;
}