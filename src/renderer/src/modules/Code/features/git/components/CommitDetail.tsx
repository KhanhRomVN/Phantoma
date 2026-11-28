// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo, useEffect, useMemo, useState } from 'react';

// ── UI ──
import {
  Files,
  FolderTree,
  GitBranch,
  GitCommit,
  List,
  Loader2,
  Minus,
  Plus,
  Search,
  ShieldAlert,
} from 'lucide-react';

// ── Components ──
import { BranchScopeModal } from './modals/BranchScopeModal';
import { Avatar } from './Avatar';
import {
  ChangesTabs,
  LocalCommitBox,
  LocalStageBar,
  UnpushedList,
  type ChangesTab,
} from './LocalCommitBar';
import { ScopeFilterTabs, UNSCOPED_BRANCH } from './ScopeFilterTabs';
import { ChangedFiles, type FileActions, type FileSelection, type FilesView } from './ChangedFiles';
import { RefPill } from './GraphCell';

// ── Services ──
import { codeApi } from '../../../shared/api/code.api';

// ── Stores ──
import { useCodeStore } from '../../../shared/stores/code.store';
import {
  useBranchScope,
  useBranchScopeStore,
  isInScope,
} from '../../../shared/stores/branch-scope.store';
import { useScopeStats } from '../../../shared/stores/scope-stats.store';
import type { ScopeCategory } from '../../../shared/stores/scope-stats.store';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { formatRelative, parseRefs, type Commit, type CommitFile } from '../utils/graph.util';
import { SCOPE_DOT } from './scope/scopeBadges';

// ─── Constants ───────────────────────────────────────────────────────────────
const MIN_WIDTH = 400;
const DEFAULT_WIDTH = 440;
const MAX_WIDTH = 800;

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface CommitDetailProps {
  commit: Commit | null;
  files: CommitFile[];
  loading: boolean;
  selectedFile?: string | null;
  projectPath: string;
  onSelectFile?: (path: string) => void;
  localBranch?: string | null;
  defaultBranch?: string;
  fileActions?: FileActions;
  unpushedCommits?: Commit[];
  unpushedRoot?: string;
  onPush?: () => void | Promise<void>;
  pushing?: boolean;
  localCommit?: {
    busy: boolean;
    onStage: (paths: string[]) => Promise<void>;
    onCommit: (message: string) => Promise<boolean>;
    onNotice: (message: string) => void;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export const CommitDetail = memo(function CommitDetail({
  commit,
  files,
  loading,
  selectedFile = null,
  projectPath,
  onSelectFile,
  localBranch = null,
  defaultBranch = '',
  fileActions,
  unpushedCommits,
  unpushedRoot,
  onPush,
  pushing,
  localCommit,
}: CommitDetailProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [view, setView] = useState<FilesView>('tree');
  const [showAll, setShowAll] = useState(false);
  const [treePaths, setTreePaths] = useState<string[] | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();

    // ── Derived ──
    const startX = e.clientX;
    const startW = width;

    // ── Handlers ──
    const onMove = (ev: MouseEvent) =>
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (startX - ev.clientX))));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const commitHash = commit?.hash;
  useEffect(() => {
    setExpanded(false);
    setBody(null);
  }, [commitHash]);

  useEffect(() => {
    if (!commitHash || body !== null) return;
    let cancelled = false;
    codeApi.git
      .commitBody(projectPath, commitHash)
      .then((res: { message?: string }) => {
        if (!cancelled) setBody(res?.message ?? '');
      })
      .catch(() => {
        if (!cancelled) setBody('');
      });

    // ── Render ──
    return () => {
      cancelled = true;
    };
  }, [commitHash, body, projectPath]);

  const rest = body ? body.split('\n').slice(1).join('\n').trim() : '';

  const projectId = useCodeStore((s) => s.currentProjectId) ?? '';
  const scopeBranch =
    localBranch ??
    (commit ? parseRefs(commit.refs).find((c) => c.kind === 'head')?.label : undefined) ??
    '';
  const scope = useBranchScope(projectId, scopeBranch);
  const setScope = useBranchScopeStore((s) => s.setScope);
  const scopeRoot = useCodeStore((s) => {
    // ── Derived ──
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.explorerRoot ?? p?.path ?? '';
  });
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  useEffect(() => {
    if (projectId) void useBranchScopeStore.getState().refreshFromServer(projectId);
  }, [projectId, commitHash, localBranch]);
  // ASSUMED: scope chỉ áp dụng cho local changes của branch không phải default branch
  const scopeActive =
    !!localBranch &&
    localBranch !== defaultBranch &&
    localBranch !== 'no-branch' &&
    localBranch !== 'no-git';
  const allScopes = useBranchScopeStore((s) => s.scopes);
  const branchScopes = useMemo(() => {
    const prefix = `${projectId}::`;
    return Object.entries(allScopes)
      .filter(([k, paths]) => k.startsWith(prefix) && paths.length > 0)
      .map(([k, paths]) => ({ branch: k.slice(prefix.length), paths }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId]);
  const otherScopes = useMemo(
    () => branchScopes.filter((o) => o.branch !== scopeBranch),
    [branchScopes, scopeBranch],
  );
  const [scopeInfo, setScopeInfo] = useState<{
    diff: Set<string> | null;
    other: Set<string>;
  } | null>(null);
  const [cat, setCat] = useState<ScopeCategory | 'outside' | 'all'>('all');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  useEffect(() => {
    setCat('all');
    setBranchFilter(null);
  }, [commitHash, localBranch]);

  const filesKey = useMemo(() => files.map((f) => f.path).join('\n'), [files]);
  useEffect(() => {
    setScopeInfo(null);
    if (!scopeActive || scope.length === 0 || files.length === 0) return;
    let cancelled = false;
    codeApi.git
      .explorerState(unpushedRoot || scopeRoot || projectPath, scope, true)
      .then((res) => {
        if (cancelled) return;
        const s = res.stats;
        setScopeInfo({ diff: new Set([...s.diff, ...s.error]), other: new Set(s.error) });
      })
      .catch(() => {
        if (!cancelled) setScopeInfo({ diff: null, other: new Set() });
      });

    // ── Render ──
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey, projectPath, scopeRoot, unpushedRoot, scope]);

  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExcluded(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey]);
  const selection = useMemo<FileSelection>(
    () => ({
      isChecked: (p) => !excluded.has(p),
      toggle: (paths) =>
        setExcluded((prev) => {
          const next = new Set(prev);
          const allOn = paths.every((p) => !next.has(p));
          paths.forEach((p) => (allOn ? next.add(p) : next.delete(p)));
          return next;
        }),
    }),
    [excluded],
  );

  const isLocalView = !!(localBranch && localCommit);
  const stats = useScopeStats(projectId);
  const byCategory = useMemo(() => {
    // ── Derived ──
    const out: Record<ScopeCategory, string[]> = { error: [], diff: [], warn: [], primary: [] };
    const bases = [
      ...new Set(
        [projectPath, scopeRoot, unpushedRoot ?? '']
          .filter(Boolean)
          .map((b) => b.replace(/\/+$/, '')),
      ),
    ];
    const has = (set: Set<string>, p: string) => bases.some((b) => set.has(`${b}/${p}`));
    const sets = {
      error: new Set(stats.error),
      diff: new Set(stats.diff),
      warn: new Set(stats.warn),
    };
    for (const f of files) {
      if (isLocalView && !f.unstaged && !f.untracked) continue;
      else if (isInScope(f.path, scope)) out.primary.push(f.path);
      else if (!f.staged && !f.unstaged && !f.untracked) continue;
      else if (has(sets.error, f.path)) out.error.push(f.path);
      else if (has(sets.diff, f.path)) out.diff.push(f.path);
      else if (has(sets.warn, f.path)) out.warn.push(f.path);
      else if (!scopeInfo) continue;
      else if (scopeInfo.diff === null || has(scopeInfo.diff, f.path))
        (has(scopeInfo.other, f.path) ? out.error : out.diff).push(f.path);
      else out.warn.push(f.path);
    }

    return out;
  }, [scopeInfo, files, isLocalView, projectPath, scopeRoot, unpushedRoot, scope, stats]);

  const unscopedPaths = useMemo(
    () => new Set(byCategory.diff.filter((p) => !otherScopes.some((o) => isInScope(p, o.paths)))),
    [byCategory.diff, otherScopes],
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const catSet =
      cat === 'all'
        ? null
        : new Set(
            cat === 'outside'
              ? [...byCategory.warn, ...byCategory.diff, ...byCategory.error]
              : byCategory[cat],
          );
    const unscoped = branchFilter === UNSCOPED_BRANCH;
    const branchPaths =
      branchFilter && !unscoped
        ? (otherScopes.find((o) => o.branch === branchFilter)?.paths ?? [])
        : null;
    return files.filter(
      (f) =>
        (!q || f.path.toLowerCase().includes(q)) &&
        (!catSet || catSet.has(f.path)) &&
        (!unscoped || unscopedPaths.has(f.path)) &&
        (!branchPaths || isInScope(f.path, branchPaths)),
    );
  }, [files, q, cat, byCategory, branchFilter, otherScopes, unscopedPaths]);

  useEffect(() => {
    if (!showAll || !commitHash || !projectPath) {
      setTreePaths(null);
      return;
    }
    let cancelled = false;
    setTreePaths(null);
    codeApi.git
      .commitTree(projectPath, commitHash)
      .then((res: { paths?: string[] }) => {
        if (!cancelled) setTreePaths(res?.paths ?? []);
      })
      .catch(() => {
        if (!cancelled) setTreePaths([]);
      });

    // ── Render ──
    return () => {
      cancelled = true;
    };
  }, [showAll, commitHash, projectPath]);

  const sourceFiles = useMemo(() => {
    if (!showAll || !treePaths) return null;

    // ── Derived ──
    const changed = new Map(files.map((f) => [f.path, f]));
    const inTree = new Set(treePaths);
    const all: CommitFile[] = [
      ...treePaths.map((p) => changed.get(p) ?? { path: p, added: 0, deleted: 0, unchanged: true }),
      ...files.filter((f) => !inTree.has(f.path)),
    ];
    return all.filter((f) => !q || f.path.toLowerCase().includes(q));
  }, [showAll, treePaths, files, q]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, f) => ({ added: acc.added + f.added, deleted: acc.deleted + f.deleted }),
        { added: 0, deleted: 0 },
      ),
    [visible],
  );

  const [tab, setTab] = useState<ChangesTab>('changes');
  const staged = useMemo(() => files.filter((f) => f.staged), [files]);
  const changes = useMemo(() => files.filter((f) => f.unstaged || f.untracked), [files]);
  const stagedVisible = useMemo(
    () => files.filter((f) => f.staged && (!q || f.path.toLowerCase().includes(q))),
    [files, q],
  );
  const changesVisible = useMemo(() => visible.filter((f) => f.unstaged || f.untracked), [visible]);
  const checkedChanges = useMemo(
    () => changesVisible.filter((f) => !excluded.has(f.path)),
    [changesVisible, excluded],
  );

  if (!commit && !localBranch) {
    // ── Render ──
    return (
      <aside
        style={{ width }}
        className={
          'relative shrink-0 border-l border-border flex flex-col items-center justify-center gap-2 text-text-secondary/40'
        }
      >
        <div
          onMouseDown={startResize}
          className={
            'absolute left-0 top-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-info/60 transition-colors'
          }
        />
        <GitCommit className={'w-8 h-8'} strokeWidth={1.2} />
        <span className={'text-xs'}>Select a commit to see details</span>
      </aside>
    );
  }

  const chips = commit ? parseRefs(commit.refs) : [];

  return (
    <aside
      style={{ width }}
      className={
        'relative shrink-0 border-l border-border flex flex-col min-h-0 bg-panel-background/40'
      }
    >
      <div
        onMouseDown={startResize}
        className={
          'absolute left-0 top-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize hover:bg-info/60 transition-colors'
        }
      />
      {commit && (
        <div className={'p-4 border-b border-border'}>
          <div className={'flex items-start gap-2.5'}>
            <Avatar author={commit.author} email={commit.email} size={36} />
            <div className={'min-w-0'}>
              <div className={'text-[12.5px] font-semibold text-text-primary truncate'}>
                {commit.author}
              </div>
              <div className={'text-[11px] text-text-secondary/70 truncate'}>{commit.email}</div>
              <div className={'text-[11px] text-text-secondary/60'}>
                {`${formatRelative(commit.date)} · ${new Date(commit.date).toLocaleString()}`}
              </div>
            </div>
          </div>

          <div
            onClick={() => rest && setExpanded((v) => !v)}
            className={cn('mt-3 rounded-md', rest && 'cursor-pointer')}
          >
            <div className={'text-[14px] leading-snug font-semibold text-text-primary break-words'}>
              {commit.subject}
            </div>
            {expanded && rest && (
              <div
                className={
                  'mt-2 text-[11.5px] leading-relaxed text-text-secondary whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto'
                }
              >
                {rest}
              </div>
            )}
            {rest && (
              <div
                className={
                  'mt-2 mx-auto w-fit px-2.5 h-[20px] rounded-full flex items-center text-[10.5px] text-text-secondary bg-card-background shadow-md hover:text-text-primary transition-colors'
                }
              >
                {expanded ? 'Click to collapse' : 'Click to expand'}
              </div>
            )}
          </div>

          <div className={'mt-3 flex flex-wrap gap-1.5'}>
            <span
              title={commit.hash}
              className={
                'inline-flex items-center h-[20px] px-1.5 rounded font-mono text-[11px] bg-card-background border border-border text-text-secondary'
              }
            >
              {commit.hash.slice(0, 7)}
            </span>
            {chips.map((c) => (
              <RefPill key={c.kind + c.label} chip={c} />
            ))}
          </div>
        </div>
      )}

      <div
        className={
          'h-11 shrink-0 px-4 border-b border-border flex items-center gap-2 text-[11.5px]'
        }
      >
        {localBranch ? (
          <>
            <span className={'shrink-0 font-semibold text-text-primary'}>Local changes</span>
            <span
              title={localBranch}
              className={
                'min-w-0 inline-flex items-center gap-1 h-6 px-2 rounded-md border border-dashed border-text-secondary/40 font-mono text-[11.5px] text-text-primary'
              }
            >
              <GitBranch className={'w-3 h-3 shrink-0'} />
              <span className={'truncate'}>{localBranch}</span>
            </span>
          </>
        ) : (
          <span className={'font-semibold text-text-primary'}>Changed files</span>
        )}
        <span className={'ml-auto shrink-0 inline-flex items-center gap-1 font-mono text-green'}>
          <Plus className={'w-3 h-3'} />
          {totals.added}
        </span>
        <span className={'shrink-0 inline-flex items-center gap-1 font-mono text-red'}>
          <Minus className={'w-3 h-3'} />
          {totals.deleted}
        </span>
      </div>

      {scopeActive && scope.length === 0 && (
        <div
          className={
            'mx-3 mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 bg-error/5 outline-dashed outline-1 -outline-offset-1 outline-error/50'
          }
        >
          <ShieldAlert className={'w-4 h-4 shrink-0 text-error'} />
          <div className={'min-w-0 flex-1 text-[11.5px] leading-snug text-text-secondary'}>
            <span className={'font-semibold text-error'}>Scope not set</span>
            {` · "${localBranch}" cannot classify changed files yet`}
          </div>
          <button
            type={'button'}
            onClick={() =>
              void useBranchScopeStore
                .getState()
                .refreshFromServer(projectId)
                .finally(() => setScopeModalOpen(true))
            }
            className={
              'h-6 shrink-0 cursor-pointer rounded-md px-2.5 text-[11.5px] font-medium bg-error/10 text-error hover:bg-error/20 active:bg-error/30 transition-colors'
            }
          >
            Set scope
          </button>
        </div>
      )}

      {localBranch && localCommit && (
        <ChangesTabs
          tab={tab}
          stagedCount={stagedVisible.length}
          changesCount={changesVisible.length}
          unpushedCount={unpushedCommits?.length}
          onChange={setTab}
        />
      )}

      <div className={'px-3 py-2 flex items-center gap-2'}>
        <div className={'relative flex-1'}>
          <Search
            className={
              'absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'
            }
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'Filter files...'}
            className={
              'w-full pl-7 pr-2 h-9 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none'
            }
          />
        </div>
        <div
          className={
            'h-9 p-0.5 rounded-md border border-border bg-card-background flex items-center gap-0.5'
          }
        >
          {(
            [
              ['path', List, 'Path view'],
              ['tree', FolderTree, 'Tree view'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              title={label}
              className={cn(
                'w-[22px] h-full rounded flex items-center justify-center transition-colors cursor-pointer',
                view === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-card-hover',
              )}
            >
              <Icon className={'w-3.5 h-3.5'} />
            </button>
          ))}
        </div>
        {!(localBranch && localCommit) && (
          <button
            onClick={() => setShowAll((v) => !v)}
            title={showAll ? 'Show changed files only' : 'Show all source files at this commit'}
            className={cn(
              'h-9 w-9 rounded-md border border-border flex items-center justify-center transition-colors cursor-pointer',
              showAll
                ? 'bg-primary/15 text-primary'
                : 'bg-card-background text-text-secondary hover:text-text-primary hover:bg-card-hover',
            )}
          >
            <Files className={'w-3.5 h-3.5'} />
          </button>
        )}
      </div>

      {scopeActive &&
        scope.length > 0 &&
        files.length > 0 &&
        (!(localBranch && localCommit) || tab === 'changes') && (
          <ScopeFilterTabs
            total={files.filter((f) => !isLocalView || f.unstaged || f.untracked).length}
            loaded={!!scopeInfo}
            byCategory={byCategory}
            cat={cat}
            branchFilter={branchFilter}
            branchChips={otherScopes
              .map((o) => ({
                branch: o.branch,
                count: files.filter(
                  (f) =>
                    (!isLocalView || f.unstaged || f.untracked) &&
                    isInScope(f.path, o.paths),
                ).length,
                dots: (['warn', 'diff', 'error'] as const)
                  .filter((id) => byCategory[id].some((p) => isInScope(p, o.paths)))
                  .map((id) => SCOPE_DOT[id]),
              }))
              .filter((o) => o.count > 0)}
            branchScopes={branchScopes}
            scopeBranch={scopeBranch}
            unscopedCount={unscopedPaths.size}
            onSelectAll={() => {
              setCat('all');
              setBranchFilter(null);
            }}
            onSelectOutside={() => {
              setBranchFilter(null);
              setCat(cat === 'all' || cat === 'primary' ? 'outside' : 'all');
            }}

            onSelectCategory={(id) => {
              setBranchFilter(null);
              setCat(cat === id ? (id === 'primary' ? 'all' : 'outside') : id);
            }}
            onSelectBranch={(branch) => {
              setCat('outside');
              setBranchFilter(branchFilter === branch ? null : branch);
            }}
          />
        )}

      <div className={'flex-1 overflow-y-auto pb-2'}>
        {loading ? (
          <div className={'flex justify-center py-6'}>
            <Loader2 className={'w-4 h-4 animate-spin text-text-secondary/60'} />
          </div>
        ) : localBranch && localCommit ? (
          <>
            {tab === 'unpushed' && unpushedCommits ? (
              <UnpushedList
                commits={unpushedCommits}
                root={unpushedRoot ?? projectPath}
                view={view}
                onPush={onPush}
                pushing={pushing}
              />
            ) : tab === 'staged' ? (
              <>
                <LocalCommitBox
                  staged={staged}
                  projectPath={projectPath}
                  busy={localCommit.busy}
                  onCommit={localCommit.onCommit}
                  onNotice={localCommit.onNotice}
                />
                <ChangedFiles
                  files={stagedVisible}
                  view={view}
                  selectedPath={selectedFile}
                  onSelect={onSelectFile}
                  actions={{ onUnstage: fileActions?.onUnstage }}
                />
              </>
            ) : (
              <>
                <LocalStageBar
                  unstagedCount={changes.length}
                  checkedUnstaged={checkedChanges}
                  busy={localCommit.busy}
                  onStage={localCommit.onStage}
                />
                <ChangedFiles
                  files={changesVisible}
                  view={view}
                  selectedPath={selectedFile}
                  onSelect={onSelectFile}
                  actions={fileActions}
                  selection={selection}
                />
              </>
            )}
          </>
        ) : (
          <ChangedFiles
            files={sourceFiles ?? visible}
            view={view}
            selectedPath={selectedFile}
            onSelect={onSelectFile}
            actions={fileActions}
            selection={unpushedCommits?.some((c) => c.hash === commitHash) ? selection : undefined}
          />
        )}
      </div>
      {scopeModalOpen && scopeActive && (
        <BranchScopeModal
          projectRoot={scopeRoot}
          branchName={scopeBranch}
          initial={scope}
          otherScopes={otherScopes}
          onSave={(paths) => {
            setScope(projectId, scopeBranch, paths);
            setScopeModalOpen(false);
          }}
          onClose={() => setScopeModalOpen(false)}
        />
      )}
    </aside>
  );
});
