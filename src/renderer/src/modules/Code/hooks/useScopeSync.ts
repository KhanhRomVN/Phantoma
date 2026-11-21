import { useEffect, useRef } from 'react';
import { useBranchScopeStore, toScopeKey } from '../stores/useBranchScopeStore';
import { codeApi } from '../services/code-api.service';

const EMPTY_SCOPE: string[] = [];

/**
 * Sync scope từ localStorage sang DB server (worktree-based).
 * ASSUMED: projectId map 1-1 với server project, branchName map với worktree.branch.
 * Hook này chạy background, không block UI.
 */
export function useScopeSync(projectId: string, branchName: string, worktreeId: string | undefined) {
  const localScope = useBranchScopeStore((s) => s.scopes[toScopeKey(projectId, branchName)] ?? EMPTY_SCOPE);
  const lastSyncedRef = useRef<string>('');

  useEffect(() => {
    if (!worktreeId || !branchName) return;

    const current = JSON.stringify(localScope);
    if (current === lastSyncedRef.current) return;

    lastSyncedRef.current = current;

    // Push local scope to server (silent, no await)
    codeApi.scopes.set(worktreeId, localScope).catch((err) => {
      console.warn('[useScopeSync] Failed to sync scope to server:', err);
    });
  }, [worktreeId, branchName, localScope]);
}

/**
 * Load scope từ server về localStorage khi mount (1 lần).
 * ASSUMED: nếu localStorage rỗng mà server có data, ưu tiên server.
 */
export function useLoadScopeFromServer(projectId: string, branchName: string, worktreeId: string | undefined) {
  const setScope = useBranchScopeStore((s) => s.setScope);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!worktreeId || !branchName || loadedRef.current) return;
    loadedRef.current = true;

    codeApi.scopes
      .list(worktreeId)
      .then((scopes) => {
        if (scopes.length === 0) return;
        const paths = scopes.map((s) => s.path);
        setScope(projectId, branchName, paths);
      })
      .catch((err) => {
        console.warn('[useLoadScopeFromServer] Failed to load scope from server:', err);
      });
  }, [worktreeId, branchName, projectId, setScope]);
}