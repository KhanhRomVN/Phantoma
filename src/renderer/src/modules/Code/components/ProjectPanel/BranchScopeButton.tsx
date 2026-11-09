import { memo, useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { useCodeStore } from '../../hooks/useCodeStore';
import { useBranchScope, useBranchScopeStore } from '../../stores/useBranchScopeStore';
import { BranchScopeModal } from './BranchScopeModal';

const gitRepoCache = new Map<string, boolean>();

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
  const allScopes = useBranchScopeStore((s) => s.scopes);
  const otherScopes = useMemo(() => {
    const prefix = `${projectId}::`;
    return Object.entries(allScopes)
      .filter(([key, paths]) => key.startsWith(prefix) && paths.length > 0)
      .map(([key, paths]) => ({ branch: key.slice(prefix.length), paths }))
      .filter((o) => o.branch !== branchName)
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId, branchName]);
  const [open, setOpen] = useState(false);
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
        const res = await window.api.invoke('git:is-repo', root);
        const ok = res === true || !!res?.isRepo;
        gitRepoCache.set(root, ok);
        if (!cancelled) setIsRepo(ok);
      } catch (err) {
        gitRepoCache.set(root, false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [root]);

  useEffect(() => {
    if (!isRepo) return;
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ projectId: string; branchName: string }>).detail;
      if (d?.projectId === projectId && d?.branchName === branchName) setOpen(true);
    };
    window.addEventListener('phantoma:open-branch-scope', onOpen);
    return () => window.removeEventListener('phantoma:open-branch-scope', onOpen);
  }, [isRepo, projectId, branchName]);

  if (!isRepo) {
    return null;
  }

  const unset = scope.length === 0;

  return (
    <>
      {unset && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
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
            }}
            onClose={() => setOpen(false)}
          />
        </span>
      )}
    </>
  );
});
