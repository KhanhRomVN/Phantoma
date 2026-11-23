import { memo, useEffect, useState, useMemo, useRef } from 'react';
import { useCodeStore } from '../../../../shared/stores/code.store';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { BranchScopeModal } from '../../../git';
import { useBranchScope, useBranchScopeStore } from '../../../../shared/stores/branch-scope.store';
import { useScopeStatsStore } from '../../../../shared/stores/scope-stats.store';
import { codeApi } from '../../../../shared/api/code.api';

/** Badge: branch là default của repo */
export const gitRepoCache = new Map<string, boolean>();

export const BranchScopeButton = memo(function BranchScopeButton({
  projectId,
  branchName,
}: {
  projectId: string;
  branchName: string;
}) {
  const project = useCodeStore((s) => s.projects.find((p) => p.id === projectId));
  const root = project?.explorerRoot ?? project?.path ?? '';
  const scope = useBranchScope(projectId, branchName);
  const setScope = useBranchScopeStore((s) => s.setScope);
  const isDefaultBranch = useScopeStatsStore(
    (s) => !!branchName && s.defaultBranchByProject[projectId] === branchName,
  );
  const allScopes = useBranchScopeStore((s) => s.scopes);
  const otherScopes = useMemo(() => {
    const prefix = `${projectId}::`;
    return Object.entries(allScopes)
      .filter(([key, paths]) => key.startsWith(prefix) && paths.length > 0)
      .map(([key, paths]) => ({ branch: key.slice(prefix.length), paths }))
      .filter((o) => o.branch !== branchName)
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId, branchName]);
  const loaded = useBranchScopeStore((s) => !!s.loaded[projectId]);
  const [open, setOpen] = useState(false);
  const onSavedRef = useRef<(() => void) | null>(null);
  const [isRepo, setIsRepo] = useState<boolean>(gitRepoCache.get(root) ?? false);

  useEffect(() => {
    if (!root) return;
    const cached = gitRepoCache.get(root);
    if (cached !== undefined) {
      setIsRepo(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ok = await codeApi.git.isRepo(root);
        gitRepoCache.set(root, ok);
        if (!cancelled) setIsRepo(ok);
      } catch {
        gitRepoCache.set(root, false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [root]);

  useEffect(() => {
    if (isRepo && !loaded) void useBranchScopeStore.getState().refreshFromServer(projectId);
  }, [isRepo, loaded, projectId]);

  useEffect(() => {
    if (!isRepo) return;
    const onOpen = (e: Event) => {
      const d = (
        e as CustomEvent<{
          projectId: string;
          branchName: string;
          handled?: boolean;
          onSaved?: () => void;
        }>
      ).detail;
      if (d?.projectId === projectId && d?.branchName === branchName) {
        onSavedRef.current = d.onSaved ?? null;
        d.handled = !!d.onSaved;
        void useBranchScopeStore
          .getState()
          .refreshFromServer(projectId)
          .finally(() => setOpen(true));
      }
    };
    window.addEventListener('phantoma:open-branch-scope', onOpen);
    return () => window.removeEventListener('phantoma:open-branch-scope', onOpen);
  }, [isRepo, projectId, branchName]);

  // ASSUMED: branch tạm ('no-branch' / 'no-git') không phải git branch thật nên không cần scope
  if (!isRepo || isDefaultBranch || branchName === 'no-branch' || branchName === 'no-git') {
    return null;
  }

  const unset = loaded && scope.length === 0;

  return (
    <>
      {unset && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void useBranchScopeStore
              .getState()
              .refreshFromServer(projectId)
              .finally(() => setOpen(true));
          }}
          className={cn(
            'relative h-5 w-5 shrink-0 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer',
            'text-error bg-error/10 hover:bg-error/20',
          )}
          title="Set the scope this branch can modify"
        >
          <span className="absolute inset-0 rounded-[5px] bg-error/20 animate-ping" />
          <ShieldAlert className="relative w-3 h-3 animate-pulse" />
        </button>
      )}
      {open && (
        <span onClick={(e) => e.stopPropagation()}>
          <BranchScopeModal
            projectRoot={root}
            branchName={branchName}
            initial={scope}
            otherScopes={otherScopes}
            onSave={(paths) => {
              setScope(projectId, branchName, paths);
              setOpen(false);
              const onSaved = onSavedRef.current;
              onSavedRef.current = null;
              onSaved?.();
            }}
            onClose={() => {
              onSavedRef.current = null;
              setOpen(false);
            }}
          />
        </span>
      )}
    </>
  );
});
