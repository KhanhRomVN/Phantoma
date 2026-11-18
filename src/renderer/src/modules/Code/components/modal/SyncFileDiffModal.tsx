/**
 * ------------------------------------------------------------------
 * Sync File Diff Modal
 * ------------------------------------------------------------------
 * Modal xem diff của 1 file mà SyncBranchModal sắp pull từ branch nguồn
 * về branch hiện tại. Phần hiển thị diff dùng DiffBlock dùng chung.
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search } from 'lucide-react';
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit/ResizableSplit';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { DiffBlock } from '@renderer/components/common/DiffBlock';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip/Tooltip';
import { useBranchScope, useBranchScopeStore, isInScope } from '../../stores/useBranchScopeStore';
import type { ScopeCategory } from '../../stores/useScopeStatsStore';
import {
  SCOPE_BADGE_ORDER,
  SCOPE_BADGE_META,
  SCOPE_DOT,
  SCOPE_BADGE_ON,
  SCOPE_BADGE_OFF,
} from './scopeBadges';
import {
  ScopeDots,
  categoryCounts,
  scopeRootOwners,
  branchColors,
  groupScopeBlocks,
} from './scopeTree';

interface SyncFileDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  sourceRef: string;
  sourceLabel: string;
  filePath: string | null;
  files?: string[];
  syncFiles?: SyncFile[];
  onNavigate?: (path: string) => void;
  projectId?: string;
  currentBranch?: string;
  activeScope?: ScopeCategory | 'all';
  onActiveScopeChange?: (next: ScopeCategory | 'all') => void;
}

interface PanelState {
  loading: boolean;
  error: string | null;
  diff: string;
}

type FileStatus = 'added' | 'modified' | 'deleted';

interface SyncFile {
  path: string;
  status: FileStatus;
  added: number;
  deleted: number;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: SyncFile;
  added: number;
  deleted: number;
  files: string[];
}

const STATUS_META: Record<FileStatus, { cls: string; label: string; mark: string }> = {
  added: { cls: 'text-success', label: 'Added', mark: '(+)' },
  modified: { cls: 'text-warn', label: 'Modified', mark: '(~)' },
  deleted: { cls: 'text-error', label: 'Deleted', mark: '(-)' },
};

function buildTree(files: SyncFile[]): TreeNode[] {
  const root: TreeNode = {
    name: '',
    path: '',
    isDir: true,
    children: [],
    added: 0,
    deleted: 0,
    files: [],
  };
  for (const f of files) {
    const parts = f.path.split('/');
    let node = root;
    parts.forEach((seg, i) => {
      const last = i === parts.length - 1;
      const p = parts.slice(0, i + 1).join('/');
      let child = node.children.find((c) => c.name === seg && c.isDir === !last);
      if (!child) {
        child = { name: seg, path: p, isDir: !last, children: [], added: 0, deleted: 0, files: [] };
        node.children.push(child);
      }
      if (last) {
        child.file = f;
        child.added = f.added;
        child.deleted = f.deleted;
      } else {
        child.added += f.added;
        child.deleted += f.deleted;
        child.files.push(f.path);
      }
      node = child;
    });
  }
  const finalize = (n: TreeNode): TreeNode => {
    n.children.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
    );
    n.children = n.children.map(finalize);
    if (n.isDir && n.name && n.children.length === 1 && n.children[0].isDir) {
      const only = n.children[0];
      return { ...only, name: `${n.name}/${only.name}` };
    }
    return n;
  };
  return finalize(root).children;
}

function flatten(
  nodes: TreeNode[],
  collapsed: Set<string>,
  depth = 0,
  out: { node: TreeNode; depth: number }[] = [],
) {
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.isDir && !collapsed.has(n.path)) flatten(n.children, collapsed, depth + 1, out);
  }
  return out;
}

export function SyncFileDiffModal({
  isOpen,
  onClose,
  projectPath,
  sourceRef,
  sourceLabel,
  filePath,
  files = [],
  syncFiles,
  onNavigate,
  projectId,
  currentBranch,
  activeScope,
  onActiveScopeChange,
}: SyncFileDiffModalProps) {
  const [panel, setPanel] = useState<PanelState>({ loading: false, error: null, diff: '' });
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scope = useBranchScope(projectId ?? '', currentBranch ?? '');
  const allScopes = useBranchScopeStore((s) => s.scopes);
  const branchScopes = useMemo(() => {
    const prefix = `${projectId ?? ''}::`;
    return Object.entries(allScopes)
      .filter(([k, paths]) => k.startsWith(prefix) && paths.length > 0)
      .map(([k, paths]) => ({ branch: k.slice(prefix.length), paths }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId]);

  const [localActive, setLocalActive] = useState<ScopeCategory | 'all'>('all');
  const active = activeScope ?? localActive;
  const setActive = onActiveScopeChange ?? setLocalActive;
  const [scopeInfo, setScopeInfo] = useState<{
    diff: Set<string> | null;
    other: Set<string>;
  } | null>(null);
  const filesKey = files.join('\n');

  useEffect(() => {
    setScopeInfo(null);
    if (!isOpen || scope.length === 0 || files.length === 0) return;
    let cancelled = false;
    const base = projectPath.replace(/\/+$/, '');
    const outside = files.filter((p) => !isInScope(p, scope)).map((p) => `${base}/${p}`);
    Promise.all([
      (window as any).api
        .invoke('git:diff-vs-remote', projectPath, outside)
        .then((res: any) => (res && Array.isArray(res.files) ? new Set<string>(res.files) : null))
        .catch(() => null),
      (window as any).api
        .invoke('git:changed-in-other-branches', projectPath)
        .then((res: any) => new Set<string>(Object.keys(res?.files ?? {})))
        .catch(() => new Set<string>()),
    ]).then(([diff, other]) => {
      if (!cancelled) setScopeInfo({ diff, other });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, filesKey, projectPath, scope]);

  const byCategory = useMemo(() => {
    const out: Record<ScopeCategory, string[]> = { error: [], diff: [], warn: [], primary: [] };
    if (!scopeInfo) return out;
    const base = projectPath.replace(/\/+$/, '');
    for (const p of files) {
      const abs = `${base}/${p}`;
      if (isInScope(p, scope)) out.primary.push(p);
      else if (scopeInfo.diff === null || scopeInfo.diff.has(abs))
        (scopeInfo.other.has(abs) ? out.error : out.diff).push(p);
      else out.warn.push(p);
    }
    return out;
  }, [scopeInfo, filesKey, projectPath, scope]);
  const hiddenPaths = useMemo(() => {
    const s = new Set<string>();
    if (active === 'all') return s;
    const keep = new Set(byCategory[active]);
    for (const p of files) if (!keep.has(p)) s.add(p);
    return s;
  }, [active, byCategory, filesKey]);
  const treeScopes = useMemo(
    () =>
      active === 'primary' ? branchScopes.filter((o) => o.branch !== currentBranch) : branchScopes,
    [active, branchScopes, currentBranch],
  );
  const categoryOf = useMemo(() => {
    const m = new Map<string, ScopeCategory>();
    (Object.keys(byCategory) as ScopeCategory[]).forEach((id) =>
      byCategory[id].forEach((p) => m.set(p, id)),
    );
    return m;
  }, [byCategory]);
  const statusOf = useMemo(
    () => new Map((syncFiles ?? []).map((f) => [f.path, f.status] as const)),
    [syncFiles],
  );
  const navFiles = useMemo(() => files.filter((p) => !hiddenPaths.has(p)), [filesKey, hiddenPaths]);
  const toggleCategory = (id: ScopeCategory) => setActive(active === id ? 'all' : id);
  const tree = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: SyncFile[] = (
      syncFiles ??
      files.map((p) => ({ path: p, status: 'modified' as const, added: 0, deleted: 0 }))
    ).filter((f) => typeof f?.path === 'string');
    return buildTree(
      list.filter((f) => !hiddenPaths.has(f.path) && (!q || f.path.toLowerCase().includes(q))),
    );
  }, [files, syncFiles, query, hiddenPaths]);
  const rows = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  const toggleCollapse = (p: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  const listRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen || !filePath) return;
    setCollapsed((prev) => {
      const next = new Set([...prev].filter((p) => !filePath.startsWith(p + '/')));
      return next.size === prev.size ? prev : next;
    });
  }, [isOpen, filePath]);

  useEffect(() => {
    if (!isOpen || !filePath) return;
    const el = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[title]') ?? []).find(
      (e) => e.title === filePath,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, filePath, collapsed]);

  const index = filePath ? navFiles.indexOf(filePath) : -1;
  const canNav = !!onNavigate && index >= 0 && navFiles.length > 1;
  const go = (delta: number) => {
    if (!canNav) return;
    onNavigate!(navFiles[(index + delta + navFiles.length) % navFiles.length]);
  };

  useEffect(() => {
    if (!isOpen || !canNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, canNav, index, navFiles, onNavigate]);

  useEffect(() => {
    if (!isOpen || !filePath || !sourceRef) return;
    let cancelled = false;
    setPanel({ loading: true, error: null, diff: '' });
    (window as any).api
      .invoke('git:branch-sync-file-diff', projectPath, sourceRef, filePath)
      .then((res: { diff?: string; error?: string }) => {
        if (cancelled) return;
        setPanel({ loading: false, error: res?.error ?? null, diff: res?.diff ?? '' });
      })
      .catch((e: any) => {
        if (!cancelled) setPanel({ loading: false, error: e?.message || String(e), diff: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectPath, sourceRef, filePath]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[94vw] max-w-[1560px] h-[80vh]">
      <ModalHeader
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <img
              src={getFileIconPath(filePath?.split('/').pop() ?? '')}
              alt=""
              className="h-5 w-5 shrink-0"
            />
            <span className="truncate">{filePath ?? ''}</span>
          </span>
        }
        description={`Changes pulling from ${sourceLabel || 'the source'}`}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ResizableSplit direction="horizontal" initialSize={30} minSize={24} maxSize={60}>
          {files.length > 0 ? (
            <aside ref={listRef} className="flex h-full w-full flex-col gap-2 p-2">
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files"
                    spellCheck={false}
                    className="h-9 w-full rounded-md border-none bg-card-background pl-9 pr-3 font-mono text-[14px] text-text-primary outline-none placeholder:text-text-secondary/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed(
                      collapsed.size > 0
                        ? new Set()
                        : new Set(
                            flatten(tree, new Set())
                              .filter((r) => r.node.isDir)
                              .map((r) => r.node.path),
                          ),
                    )
                  }
                  title={collapsed.size > 0 ? 'Expand all' : 'Collapse all'}
                  className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary"
                >
                  {collapsed.size > 0 ? (
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {scope.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActive('all')}
                    className={cn(
                      'flex h-6 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-medium transition-colors',
                      active === 'all'
                        ? 'bg-text-secondary/20 text-text-primary outline-dashed outline-1 -outline-offset-1 outline-current'
                        : cn('outline-none', SCOPE_BADGE_OFF),
                    )}
                  >
                    All
                    <span className="font-mono text-[11px] text-text-secondary">
                      {files.length}
                    </span>
                  </button>
                  {SCOPE_BADGE_ORDER.map((id) => {
                    const meta = SCOPE_BADGE_META[id];
                    const ps = byCategory[id];
                    const on = active === id;
                    return (
                      <Tooltip
                        key={id}
                        side="top"
                        align="start"
                        content={
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{meta.label}</span>
                            <span className="text-text-secondary">{meta.hint}</span>
                            <span>
                              {on
                                ? 'Click to show all files again.'
                                : `Click to show only the ${ps.length} file${ps.length === 1 ? '' : 's'} in this group.`}
                            </span>
                          </div>
                        }
                      >
                        <button
                          type="button"
                          disabled={!scopeInfo || ps.length === 0}
                          onClick={() => toggleCategory(id)}
                          className={cn(
                            'flex h-6 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                            on
                              ? 'outline-dashed outline-1 -outline-offset-1 outline-current'
                              : 'outline-none',
                            SCOPE_BADGE_ON[id],
                          )}
                        >
                          <span
                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SCOPE_DOT[id])}
                          />
                          {meta.label}
                          <span className="font-mono text-[11px] text-text-secondary">
                            {scopeInfo ? ps.length : '…'}
                          </span>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {rows.length === 0 && (
                  <span className="px-2 py-4 text-center text-[13.5px] text-text-secondary">
                    No matching files
                  </span>
                )}
                {groupScopeBlocks(
                  rows,
                  rows.map(({ node, depth }, rowIndex) => {
                    const isOpenDir = node.isDir && !collapsed.has(node.path);
                    const iconSrc = node.isDir
                      ? getFolderIconPath(node.name, isOpenDir)
                      : getFileIconPath(node.name);
                    const owners = scopeRootOwners(
                      rows,
                      rowIndex,
                      treeScopes,
                      currentBranch ?? '',
                      true,
                    );
                    const dotPaths = node.isDir ? node.files : [node.path];
                    const dotCounts =
                      scope.length > 0 && active === 'all'
                        ? categoryCounts(dotPaths, categoryOf)
                        : {};
                    const dotDeleted =
                      dotPaths.length > 0 && dotPaths.every((p) => statusOf.get(p) === 'deleted');
                    return (
                      <div
                        key={node.path}
                        onClick={() =>
                          node.isDir ? toggleCollapse(node.path) : onNavigate?.(node.path)
                        }
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 transition-colors hover:bg-card-hover',
                          !node.isDir && node.path === filePath && 'bg-primary/10',
                        )}
                        style={{ paddingLeft: 6 + depth * 16 }}
                        title={
                          owners.length > 0
                            ? `${node.path}\nScope: ${owners.join(', ')}`
                            : node.path
                        }
                      >
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform',
                            isOpenDir && 'rotate-90',
                            !node.isDir && 'invisible',
                          )}
                        />
                        <img src={iconSrc} alt="" draggable={false} className="h-4 w-4 shrink-0" />
                        <span
                          className={cn(
                            'min-w-0 truncate font-mono text-[13.5px]',
                            !node.isDir && node.path === filePath
                              ? 'text-primary'
                              : 'text-text-primary',
                            node.file?.status === 'deleted' && 'text-error line-through',
                          )}
                        >
                          {node.name}
                        </span>
                        {node.file && (
                          <span
                            title={STATUS_META[node.file.status].label}
                            className={cn(
                              'shrink-0 font-mono text-[13.5px] font-semibold',
                              STATUS_META[node.file.status].cls,
                            )}
                          >
                            {STATUS_META[node.file.status].mark}
                          </span>
                        )}
                        <span className="flex-1" />
                        {owners.map((b) => (
                          <span
                            key={b}
                            className={cn(
                              'shrink-0 rounded px-1.5 py-[2px] font-mono text-[10.5px]',
                              branchColors(b, treeScopes, currentBranch ?? '').badge,
                            )}
                          >
                            {b}
                          </span>
                        ))}
                        <ScopeDots counts={dotCounts} deleted={dotDeleted} />
                      </div>
                    );
                  }),
                  treeScopes,
                  currentBranch ?? '',
                )}
              </div>
            </aside>
          ) : (
            <div />
          )}
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            {canNav && (
              <div className="flex shrink-0 items-center gap-2 border-b border-text-secondary/20 px-4 py-1.5">
                <button
                  type="button"
                  title="Previous file (←)"
                  onClick={() => go(-1)}
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono text-[12.5px] text-text-secondary">
                  {index + 1} / {navFiles.length}
                </span>
                <button
                  type="button"
                  title="Next file (→)"
                  onClick={() => go(1)}
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <ModalBody className="p-0">
              <DiffBlock
                diff={panel.diff}
                loading={panel.loading}
                error={panel.error}
                rowClassName="text-[13.5px] leading-[22px]"
              />
            </ModalBody>
          </div>
        </ResizableSplit>
      </div>
    </Modal>
  );
}

export default SyncFileDiffModal;
