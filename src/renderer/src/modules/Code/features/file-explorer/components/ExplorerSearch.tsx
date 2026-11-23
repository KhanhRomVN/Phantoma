import { memo, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { getFileIconPath } from '@renderer/utils/file-icon';
import { codeApi } from '../../../shared/api/code.api';
import { useCodeStore } from '../../../shared/stores/code.store';
import {
  useScopeBranchFilter,
  useScopeFilter,
  useScopeStats,
  useScopeStatsStore,
} from '../../../shared/stores/scope-stats.store';
import { isInScope, useBranchScopeStore } from '../../../shared/stores/branch-scope.store';
import { ScopeFilterTabs } from '../../../shared/components/ScopeFilterTabs';
import { SCOPE_DOT } from '../../../shared/utils/scope-badges.util';
import { EmptyState } from '../../../shared/components/EmptyState';


interface ExplorerSearchBarProps {
  projectId: string;
  root: string;
  scopeBranch: string;
  query: string;
  onQueryChange: (value: string) => void;
  showScope?: boolean;
}

export const ExplorerSearchBar = memo(function ExplorerSearchBar({
  projectId,
  root,
  scopeBranch,
  query,
  onQueryChange,
  showScope = true,
}: ExplorerSearchBarProps) {
  const stats = useScopeStats(projectId);
  const filter = useScopeFilter(projectId);
  const branchFilter = useScopeBranchFilter(projectId);
  const setFilter = useScopeStatsStore((s) => s.setFilter);
  const setBranchFilter = useScopeStatsStore((s) => s.setBranchFilter);
  const allScopes = useBranchScopeStore((s) => s.scopes);

  const byCategory = useMemo(
    () => ({ error: stats.error, diff: stats.diff, warn: stats.warn, primary: stats.primary }),
    [stats],
  );
  const total = stats.primary.length + stats.warn.length + stats.diff.length + stats.error.length;
  const branchScopes = useMemo(() => {
    const prefix = `${projectId}::`;
    return Object.entries(allScopes)
      .filter(([k, paths]) => k.startsWith(prefix) && paths.length > 0)
      .map(([k, paths]) => ({ branch: k.slice(prefix.length), paths }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId]);
  const branchChips = useMemo(() => {
    const prefix = `${root.replace(/\/+$/, '')}/`;
    const rel = (list: string[]) =>
      list.filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length));
    const outside = { warn: rel(stats.warn), diff: rel(stats.diff), error: rel(stats.error) };
    const all = [...rel(stats.primary), ...outside.warn, ...outside.diff, ...outside.error];
    return branchScopes
      .filter((o) => o.branch !== scopeBranch)
      .map((o) => ({
        branch: o.branch,
        count: all.filter((p) => isInScope(p, o.paths)).length,
        dots: (['warn', 'diff', 'error'] as const)
          .filter((id) => outside[id].some((p) => isInScope(p, o.paths)))
          .map((id) => SCOPE_DOT[id]),
      }))
      .filter((o) => o.count > 0);
  }, [branchScopes, scopeBranch, stats, root]);
  const unscopedCount = useMemo(() => {
    const prefix = `${root.replace(/\/+$/, '')}/`;
    const others = branchScopes.filter((o) => o.branch !== scopeBranch);
    return stats.diff.filter(
      (p) => p.startsWith(prefix) && !others.some((o) => isInScope(p.slice(prefix.length), o.paths)),
    ).length;
  }, [branchScopes, scopeBranch, stats.diff, root]);
  const cat = filter ?? 'all';
  const transferCount = useMemo(() => {
    const target = branchScopes.find((o) => o.branch === branchFilter);
    if (!target) return 0;
    const prefix = `${root.replace(/\/+$/, '')}/`;
    return stats.diff.filter(
      (p) => p.startsWith(prefix) && isInScope(p.slice(prefix.length), target.paths),
    ).length;
  }, [branchScopes, branchFilter, stats.diff, root]);

  return (
    <div className={'shrink-0 border-b border-border'}>
      <div className={'relative'}>
        <Search
          className={'absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'}
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={'Search files...'}
          className={'block w-full h-9 pl-9 pr-8 text-xs bg-input-background border-0 outline-none text-text-primary placeholder:text-text-secondary/50'}
        />
        {query && (
          <button
            type={'button'}
            title={'Clear'}
            onClick={() => onQueryChange('')}
            className={'absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-card-hover cursor-pointer'}
          >
            <X className={'w-3 h-3'} />
          </button>
        )}
      </div>

      {showScope && (total > 0 || filter !== null) && (
        <div className={'border-t border-border pb-2'}>
          <ScopeFilterTabs
            total={total}
            loaded={true}
            byCategory={byCategory}
            cat={cat}
            branchFilter={branchFilter}
            branchChips={branchChips}
            branchScopes={branchScopes}
            scopeBranch={scopeBranch}
            unscopedCount={unscopedCount}
            onSelectAll={() => setFilter(projectId, null)}
            onSelectOutside={() =>
              setFilter(projectId, cat === 'all' || cat === 'primary' ? 'outside' : null)
            }

            onSelectCategory={(id) =>
              setFilter(projectId, cat === id ? (id === 'primary' ? null : 'outside') : id)
            }
            onSelectBranch={(branch) =>
              branchFilter === branch ? setFilter(projectId, 'outside') : setBranchFilter(projectId, branch)
            }
          />
          {branchFilter && transferCount > 0 && (
            <div className={'px-3 pt-1'}>
              <button
                type={'button'}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('explorer:scope-transfer', {
                      detail: { path: root.replace(/\/+$/, ''), branch: branchFilter },
                    }),
                  )
                }
                className={'flex h-7 w-full cursor-pointer items-center justify-center rounded-md bg-transparent text-[11.5px] font-medium text-primary transition-colors hover:bg-text-secondary/10 active:bg-text-secondary/20'}
              >
                {`Compare to ${branchFilter}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface ExplorerSearchResultsProps {
  root: string;
  query: string;
}

export const ExplorerSearchResults = memo(function ExplorerSearchResults({
  root,
  query,
}: ExplorerSearchResultsProps) {
  const [items, setItems] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q || !root) {
      setItems(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      codeApi.fs
        .findFiles(root, `*${q}*`, { max: 200, exclude: ['node_modules', '.git'] })
        .then((res) => {
          if (!cancelled) setItems(Array.isArray(res) ? res.map((r) => r.path) : []);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [root, query]);

  const open = (path: string, name: string) => {
    const abs = path.startsWith('/') ? path : `${root}/${path}`;
    const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
    if (sessionId) useCodeStore.getState().requestOpenFile(sessionId, abs, name);
  };

  if (items === null || (loading && items.length === 0)) {
    return (
      <div className={'flex-1 flex justify-center py-6'}>
        <Loader2 className={'w-4 h-4 animate-spin text-text-secondary/60'} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={'flex-1 min-h-0'}>
        <EmptyState icon={Search} text={'No matching files'} desc={'Try a different file name.'} />
      </div>
    );
  }

  return (
    <div className={'flex-1 overflow-y-auto py-1'}>
      {items.map((p) => {
        const rel = p.startsWith(`${root}/`) ? p.slice(root.length + 1) : p;
        const idx = rel.lastIndexOf('/');
        const name = idx >= 0 ? rel.slice(idx + 1) : rel;
        const dir = idx >= 0 ? rel.slice(0, idx) : '';
        return (
          <div
            key={p}
            title={rel}
            onClick={() => open(p, name)}
            className={'flex items-center gap-2 px-3 h-7 cursor-pointer hover:bg-card-hover transition-colors'}
          >
            <img src={getFileIconPath(name)} alt={''} className={'w-4 h-4 shrink-0'} />
            <span className={'text-[12px] text-text-primary truncate shrink-0 max-w-[65%]'}>{name}</span>
            {dir && <span className={'flex-1 min-w-0 truncate text-[10.5px] text-text-secondary/50'}>{dir}</span>}
          </div>
        );
      })}
    </div>
  );
});