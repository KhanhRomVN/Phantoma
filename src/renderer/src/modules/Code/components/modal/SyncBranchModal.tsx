import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FileDiff,
  FileMinus2,
  FilePlus2,
  GitBranch,
  GitCommit,
  Loader2,
  Minus,
  Search,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button/Button';
import { Tooltip } from '@renderer/components/ui/Tooltip/Tooltip';
import { useBranchScope, useBranchScopeStore, isInScope } from '../../stores/useBranchScopeStore';
import { SCOPE_CATEGORIES, type ScopeCategory } from '../../stores/useScopeStatsStore';

type FileStatus = 'added' | 'modified' | 'deleted';
type SourceKind = 'local' | 'remote';

interface SourceOption {
  name: string;
  kind: SourceKind;
}

interface SyncFile {
  path: string;
  status: FileStatus;
  added: number;
  deleted: number;
}

interface RemoteCommit {
  hash: string;
  subject: string;
  author: string;
  date: number;
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

interface SyncBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPath: string;
  projectName: string;
  currentBranch: string;
  branches: string[];
  onApplied: (count: number, source: string) => void;
  fixedSource?: { ref: string; label: string };
  targets?: { name: string; path: string }[];
  projectId?: string;
  defaultBranch?: string;
}

const FIELD =
  'w-full h-9 rounded-md bg-transparent border border-text-secondary/20 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 hover:border-text-secondary/40 focus:border-primary';

const STATUS_META: Record<FileStatus, { icon: typeof FileDiff; cls: string; label: string }> = {
  added: { icon: FilePlus2, cls: 'text-success', label: 'Added' },
  modified: { icon: FileDiff, cls: 'text-warn', label: 'Modified' },
  deleted: { icon: FileMinus2, cls: 'text-error', label: 'Deleted' },
};

const SCOPE_BADGE_ORDER: ScopeCategory[] = ['error', 'diff', 'warn', 'primary'];

const SCOPE_BADGE_META: Record<ScopeCategory, { label: string; hint: string }> = {
  error: {
    label: 'Conflict risk',
    hint: 'Outside this branch scope, differs from the default branch and is also changed in another branch.',
  },
  diff: {
    label: 'Diverged',
    hint: 'Outside this branch scope and differs from the default branch.',
  },
  warn: {
    label: 'Outside scope',
    hint: 'Outside this branch scope but identical to the default branch.',
  },
  primary: {
    label: 'In scope',
    hint: 'Inside the scope this branch is allowed to modify.',
  },
};

const SCOPE_DOT = Object.fromEntries(SCOPE_CATEGORIES.map((c) => [c.id, c.dot])) as Record<
  ScopeCategory,
  string
>;

const SCOPE_BADGE_ON: Record<ScopeCategory, string> = {
  error: 'bg-error/10 text-error hover:bg-error/20 active:bg-error/30',
  diff: 'bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 active:bg-[#f97316]/30',
  warn: 'bg-warn/10 text-warn hover:bg-warn/20 active:bg-warn/30',
  primary: 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30',
};

const BRANCH_BADGE_PALETTE = [
  'bg-warn/15 text-warn',
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-error/15 text-error',
  'bg-primary/15 text-primary',
  'bg-[#f97316]/15 text-[#f97316]',
];

const SCOPE_BADGE_OFF =
  'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30';

const stripOrigin = (n: string) => n.replace(/^origin\//, '');

const refOf = (o: SourceOption | null) =>
  !o ? '' : o.kind === 'remote' ? `origin/${o.name}` : o.name;

function RemoteBadge() {
  return (
    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-[3px] text-[10.5px] font-semibold leading-none tracking-wide text-primary">
      REMOTE
    </span>
  );
}

function DefaultBadge() {
  return (
    <span className="shrink-0 rounded bg-success/15 px-1.5 py-[3px] text-[10.5px] font-semibold leading-none tracking-wide text-success">
      DEFAULT
    </span>
  );
}

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

function Checkbox({
  state,
  onClick,
}: {
  state: 'all' | 'some' | 'none';
  onClick: (e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'some' ? 'mixed' : state === 'all'}
      onClick={onClick}
      className={cn(
        'grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-[4px] border outline-none transition-all duration-100 active:scale-90',
        state === 'none'
          ? 'border-text-secondary/40 bg-transparent hover:border-primary'
          : 'border-primary bg-primary text-white',
      )}
    >
      {state === 'all' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      {state === 'some' && <Minus className="h-2.5 w-2.5" strokeWidth={3} />}
    </button>
  );
}

function Counts({ added, deleted }: { added: number; deleted: number }) {
  if (!added && !deleted) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px]">
      {added > 0 && <span className="text-success">+{added}</span>}
      {deleted > 0 && <span className="text-error">-{deleted}</span>}
    </span>
  );
}

export function SyncBranchModal({
  isOpen,
  onClose,
  targetPath: baseTargetPath,
  projectName,
  currentBranch: baseBranch,
  branches,
  onApplied,
  fixedSource,
  targets,
  projectId,
  defaultBranch,
}: SyncBranchModalProps) {
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const activeTarget = targets?.find((t) => t.path === pickedTarget) ?? targets?.[0] ?? null;
  const targetPath = activeTarget?.path ?? baseTargetPath;
  const currentBranch = activeTarget?.name ?? baseBranch;
  const [picked, setPicked] = useState<SourceOption | null>(null);
  const [rawBranches, setRawBranches] = useState<string[] | null>(null);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [rawFiles, setFiles] = useState<SyncFile[] | null>(null);
  const [commits, setCommits] = useState<RemoteCommit[] | null>(null);
  const [pickedCommit, setPickedCommit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<ScopeCategory>>(new Set());
  const [scopeInfo, setScopeInfo] = useState<{
    diff: Set<string> | null;
    other: Set<string>;
  } | null>(null);

  const options = useMemo<SourceOption[]>(() => {
    const all = rawBranches ?? branches;
    const local = Array.from(
      new Set(all.filter((n) => !n.startsWith('origin/') && n !== 'origin' && n !== 'HEAD')),
    ).filter((n) => n && n !== currentBranch);
    const remote = Array.from(
      new Set(
        all
          .filter((n) => n.startsWith('origin/'))
          .map(stripOrigin)
          .filter((n) => n && n !== 'HEAD'),
      ),
    );
    return [
      ...local.map((name) => ({ name, kind: 'local' as const })),
      ...remote.map((name) => ({ name, kind: 'remote' as const })),
    ];
  }, [rawBranches, branches, currentBranch]);

  const selected = picked ?? options[0] ?? null;
  const isRemote = !fixedSource && selected?.kind === 'remote';
  const branchRef = fixedSource?.ref ?? refOf(selected);
  const ref = isRemote && pickedCommit ? pickedCommit : branchRef;
  const refLabel =
    isRemote && pickedCommit ? `${branchRef}@${pickedCommit.slice(0, 7)}` : branchRef;
  const pickedCommitInfo = commits?.find((c) => c.hash === pickedCommit) ?? null;
  const targetScope = useBranchScope(projectId ?? '', currentBranch);
  const sourceScope = useBranchScope(
    projectId ?? '',
    !fixedSource && selected?.kind === 'local' ? selected.name : '',
  );
  const scope = targetScope.length > 0 ? targetScope : sourceScope;
  const allScopes = useBranchScopeStore((s) => s.scopes);
  const otherScopes = useMemo(() => {
    const prefix = `${projectId ?? ''}::`;
    return Object.entries(allScopes)
      .filter(([k, paths]) => k.startsWith(prefix) && paths.length > 0)
      .map(([k, paths]) => ({ branch: k.slice(prefix.length), paths }))
      .filter((o) => o.branch !== currentBranch)
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId, currentBranch]);
  const ownerColor = (b: string) =>
    BRANCH_BADGE_PALETTE[
      Math.max(
        0,
        otherScopes.findIndex((o) => o.branch === b),
      ) % BRANCH_BADGE_PALETTE.length
    ];
  useEffect(() => {
    if (!isOpen) return;
  }, [isOpen, projectId, currentBranch, allScopes, otherScopes]);
  const ownersOf = (n: TreeNode) =>
    otherScopes
      .filter((o) =>
        o.paths.some(
          (p) =>
            isInScope(n.path, [p]) ||
            (n.isDir && (p.startsWith(`${n.path}/`) || n.files.some((f) => isInScope(f, [p])))),
        ),
      )
      .map((o) => o.branch);
  const isDefaultSource =
    !!defaultBranch &&
    !fixedSource &&
    selected?.kind === 'remote' &&
    selected.name === defaultBranch;
  const scoped = isDefaultSource && scope.length > 0;
  const files = rawFiles;

  useEffect(() => {
    if (!isOpen) return;
    setPicked(null);
    setFiles(null);
    setError('');
    setExcluded(new Set());
    setCollapsed(new Set());
    setApplying(false);
    setPickedTarget(null);
    setCommits(null);
    setPickedCommit(null);
    setQuery('');
    setHidden(new Set());
    if (fixedSource) {
      setRawBranches([]);
      return;
    }
    setRawBranches(null);
    (window as any).api
      .invoke('git:prune-orphan-branches', targetPath)
      .catch(() => null)
      .then(() => {
        return (window as any).api.invoke('git:list-branches', targetPath);
      })
      .then((res: any) => {
        setRawBranches(res?.branches ?? []);
      })
      .catch(() => {
        setRawBranches([]);
      });
  }, [isOpen]);

  useEffect(() => {
    setCommits(null);
    if (!isOpen || !isRemote || !branchRef) return;
    let cancelled = false;
    (window as any).api
      .invoke('git:log', targetPath, 100, branchRef)
      .then((res: any) => {
        if (!cancelled) setCommits(res?.commits ?? []);
      })
      .catch(() => {
        if (!cancelled) setCommits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isRemote, branchRef, targetPath]);

  useEffect(() => {
    if (!isOpen || rawBranches === null || !ref) {
      setFiles(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setFiles(null);
    const run = async () => {
      if (isRemote) {
        setFetchingRemote(true);
        try {
        } catch (e) {
        } finally {
          setFetchingRemote(false);
        }
      }
      if (cancelled) return;
      return (window as any).api.invoke('git:branch-sync-preview', targetPath, ref);
    };
    run()
      .then((res: any) => {
        if (cancelled) return;
        if (res?.error) {
          setError(res.error);
          setFiles([]);
        } else {
          setFiles(res?.files ?? []);
        }
        setExcluded(new Set());
        setCollapsed(new Set());
        setHidden(new Set());
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || String(e));
        setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, ref, targetPath, rawBranches === null]);

  const byCategory = useMemo(() => {
    const out: Record<ScopeCategory, string[]> = { error: [], diff: [], warn: [], primary: [] };
    if (!scopeInfo) return out;
    const base = targetPath.replace(/\/+$/, '');
    for (const f of files ?? []) {
      const abs = `${base}/${f.path}`;
      if (isInScope(f.path, scope)) out.primary.push(f.path);
      else if (scopeInfo.diff === null || scopeInfo.diff.has(abs))
        (scopeInfo.other.has(abs) ? out.error : out.diff).push(f.path);
      else out.warn.push(f.path);
    }
    return out;
  }, [scopeInfo, files, targetPath, scope]);
  const hiddenPaths = useMemo(() => {
    const s = new Set<string>();
    hidden.forEach((id) => byCategory[id].forEach((p) => s.add(p)));
    return s;
  }, [hidden, byCategory]);
  const visibleFiles = useMemo(
    () => (files ?? []).filter((f) => !hiddenPaths.has(f.path)),
    [files, hiddenPaths],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? visibleFiles.filter((f) => f.path.toLowerCase().includes(q)) : visibleFiles;
  }, [visibleFiles, query]);
  const tree = useMemo(() => buildTree(shown), [shown]);
  const rows = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  const chosen = useMemo(
    () => (files ?? []).filter((f) => !excluded.has(f.path)),
    [files, excluded],
  );
  const totals = useMemo(
    () =>
      chosen.reduce(
        (acc, f) => ({ added: acc.added + f.added, deleted: acc.deleted + f.deleted }),
        { added: 0, deleted: 0 },
      ),
    [chosen],
  );
  const statusCount = useMemo(() => {
    const c: Record<FileStatus, number> = { added: 0, modified: 0, deleted: 0 };
    chosen.forEach((f) => c[f.status]++);
    return c;
  }, [chosen]);

  useEffect(() => {
    setScopeInfo(null);
    if (!isOpen || !files || files.length === 0) return;
    let cancelled = false;
    const base = targetPath.replace(/\/+$/, '');
    const outside = files.filter((f) => !isInScope(f.path, scope)).map((f) => `${base}/${f.path}`);
    Promise.all([
      (window as any).api
        .invoke('git:diff-vs-remote', targetPath, outside)
        .then((res: any) => (res && Array.isArray(res.files) ? new Set<string>(res.files) : null))
        .catch(() => null),
      (window as any).api
        .invoke('git:changed-in-other-branches', targetPath)
        .then((res: any) => new Set<string>(Object.keys(res?.files ?? {})))
        .catch(() => new Set<string>()),
    ]).then(([diff, other]) => {
      if (!cancelled) setScopeInfo({ diff, other });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, files, targetPath, scope]);

  const toggleCategory = (id: ScopeCategory) => {
    const ps = byCategory[id];
    const willHide = !hidden.has(id);
    setHidden((prev) => {
      const next = new Set(prev);
      if (willHide) next.add(id);
      else next.delete(id);
      return next;
    });
    setExcluded((prev) => {
      const next = new Set(prev);
      if (willHide) ps.forEach((p) => next.add(p));
      else ps.forEach((p) => next.delete(p));
      return next;
    });
  };
  const SEG =
    'flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13.5px] font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  const pathsOf = (n: TreeNode) => (n.isDir ? n.files : [n.path]);

  const stateOf = (n: TreeNode): 'all' | 'some' | 'none' => {
    const ps = pathsOf(n);
    const sel = ps.filter((p) => !excluded.has(p)).length;
    return sel === 0 ? 'none' : sel === ps.length ? 'all' : 'some';
  };

  const toggleNode = (n: TreeNode) => {
    const ps = pathsOf(n);
    setExcluded((prev) => {
      const next = new Set(prev);
      if (stateOf(n) === 'all') ps.forEach((p) => next.add(p));
      else ps.forEach((p) => next.delete(p));
      return next;
    });
  };

  const toggleCollapse = (p: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const selectAll = (on: boolean) =>
    setExcluded(on ? new Set(hiddenPaths) : new Set((files ?? []).map((f) => f.path)));

  const handleApply = async () => {
    if (!ref || chosen.length === 0 || applying) return;
    setApplying(true);
    setError('');
    try {
      const res = await (window as any).api.invoke(
        'git:branch-sync-apply',
        targetPath,
        ref,
        chosen.map((f) => f.path),
      );

      if (res?.error) {
        setError(res.error);
        return;
      }
      onApplied(res?.applied ?? chosen.length, refLabel);
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    if (!applying) onClose();
  };

  const allState = !visibleFiles.length
    ? 'none'
    : chosen.length === visibleFiles.length
      ? 'all'
      : chosen.length === 0
        ? 'none'
        : 'some';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-[680px] max-w-[calc(100vw-2rem)] min-h-[50vh] max-h-[70vh]"
    >
      <ModalHeader
        title={fixedSource ? 'Apply commit to branch' : 'Sync From Branch'}
        description={
          fixedSource
            ? `Bring files from ${fixedSource.label} into the selected local branch. Gitignored paths are skipped.`
            : `Bring files from another branch into ${currentBranch || projectName}. Gitignored paths are skipped.`
        }
        onClose={handleClose}
        className="px-5 py-4"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-1 pt-4">
        <div className="flex shrink-0 items-center gap-2">
          {fixedSource ? (
            <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-text-secondary/20 px-3">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
              <span className="truncate font-mono text-[14px] text-text-primary">
                {fixedSource.label}
              </span>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <Dropdown align="start" sideOffset={4} className="w-full" searchable>
                <DropdownTrigger>
                  <button
                    type="button"
                    className={cn(
                      FIELD,
                      'flex cursor-pointer items-center justify-between gap-2 px-3 text-left',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                      <span className="truncate">{selected?.name || 'Select branch'}</span>
                      {isDefaultSource && <DefaultBadge />}
                      {isRemote && <RemoteBadge />}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                  </button>
                </DropdownTrigger>
                <DropdownContent className="max-h-[220px] overflow-y-auto">
                  {options.map((o) => {
                    const active = selected?.name === o.name && selected?.kind === o.kind;
                    return (
                      <DropdownItem
                        key={`${o.kind}:${o.name}`}
                        icon={
                          <Check
                            className={cn('h-3.5 w-3.5 text-primary', !active && 'invisible')}
                          />
                        }
                        onClick={() => {
                          setPicked(o);
                          setPickedCommit(null);
                        }}
                      >
                        <span className="truncate">{o.name}</span>
                        {o.kind === 'remote' && o.name === defaultBranch && <DefaultBadge />}
                        {o.kind === 'remote' && <RemoteBadge />}
                      </DropdownItem>
                    );
                  })}
                </DropdownContent>
              </Dropdown>
            </div>
          )}

          <ArrowRight className="h-4 w-4 shrink-0 text-text-secondary" />

          {targets && targets.length > 0 ? (
            <div className="min-w-0 flex-1">
              <Dropdown align="start" sideOffset={4} className="w-full" searchable>
                <DropdownTrigger>
                  <button
                    type="button"
                    className={cn(
                      FIELD,
                      'flex cursor-pointer items-center justify-between gap-2 px-3 text-left',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate">{currentBranch || 'Select branch'}</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                  </button>
                </DropdownTrigger>
                <DropdownContent className="max-h-[220px] overflow-y-auto">
                  {targets.map((t) => (
                    <DropdownItem
                      key={t.path}
                      icon={
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 text-primary',
                            activeTarget?.path !== t.path && 'invisible',
                          )}
                        />
                      }
                      onClick={() => setPickedTarget(t.path)}
                    >
                      <span className="truncate">{t.name}</span>
                    </DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            </div>
          ) : (
            <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-text-secondary/20 px-3">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-mono text-[14px] text-text-primary">
                {currentBranch || '—'}
              </span>
            </div>
          )}
        </div>

        {files && files.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {SCOPE_BADGE_ORDER.map((id) => {
              const meta = SCOPE_BADGE_META[id];
              const ps = byCategory[id];
              const on = !hidden.has(id);
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
                        {on ? 'Click to hide and untick' : 'Click to show and tick'} all {ps.length}{' '}
                        file{ps.length === 1 ? '' : 's'} in this group.
                      </span>
                    </div>
                  }
                >
                  <button
                    type="button"
                    disabled={!scopeInfo || ps.length === 0}
                    onClick={() => toggleCategory(id)}
                    className={cn(SEG, on ? SCOPE_BADGE_ON[id] : SCOPE_BADGE_OFF)}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', SCOPE_DOT[id])} />
                    {meta.label}
                    <span className="font-mono text-[12px] text-text-secondary">
                      {scopeInfo ? ps.length : '…'}
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}

        {isRemote && (
          <Dropdown align="start" sideOffset={4} className="w-full" searchable>
            <DropdownTrigger>
              <button
                type="button"
                className={cn(
                  FIELD,
                  'flex shrink-0 cursor-pointer items-center justify-between gap-2 px-3 text-left',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <GitCommit className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                  {pickedCommitInfo ? (
                    <>
                      <span className="shrink-0 font-mono text-primary">
                        {pickedCommitInfo.hash.slice(0, 7)}
                      </span>
                      <span className="truncate">{pickedCommitInfo.subject}</span>
                    </>
                  ) : (
                    <span className="truncate">Latest commit</span>
                  )}
                </span>
                {commits === null ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-text-secondary" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                )}
              </button>
            </DropdownTrigger>
            <DropdownContent className="max-h-[220px] overflow-y-auto">
              <DropdownItem
                icon={
                  <Check className={cn('h-3.5 w-3.5 text-primary', pickedCommit && 'invisible')} />
                }
                onClick={() => setPickedCommit(null)}
              >
                <span className="truncate">Latest commit</span>
              </DropdownItem>
              {(commits ?? []).map((c) => (
                <DropdownItem
                  key={c.hash}
                  icon={
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 text-primary',
                        pickedCommit !== c.hash && 'invisible',
                      )}
                    />
                  }
                  onClick={() => setPickedCommit(c.hash)}
                >
                  <span className="shrink-0 font-mono text-primary">{c.hash.slice(0, 7)}</span>
                  <span className="truncate">{c.subject}</span>
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>
        )}

        {files && files.length > 0 && (
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              spellCheck={false}
              className={cn(FIELD, 'pl-9 pr-3 font-mono')}
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-text-secondary/20">
          <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-text-secondary/20 px-3">
            {files && files.length > 0 ? (
              <>
                <Checkbox state={allState} onClick={() => selectAll(allState !== 'all')} />
                <span className="text-[13.5px] font-medium text-text-primary">
                  {chosen.length}
                  <span className="font-normal text-text-secondary"> / {visibleFiles.length} files</span>
                </span>
                <span className="flex items-center gap-2.5 text-[12px] text-text-secondary">
                  {(Object.keys(STATUS_META) as FileStatus[]).map((s) => {
                    const M = STATUS_META[s];
                    return (
                      <span key={s} title={M.label} className="flex items-center gap-1">
                        <M.icon className={cn('h-3 w-3', M.cls)} />
                        {statusCount[s]}
                      </span>
                    );
                  })}
                </span>
                <span className="flex-1" />
                <Counts added={totals.added} deleted={totals.deleted} />
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
              </>
            ) : (
              <span className="flex items-center gap-2 text-[13.5px] text-text-secondary">
                Changes
                {fetchingRemote && <Loader2 className="h-3 w-3 animate-spin" />}
              </span>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
            {(loading || (files === null && !error)) && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
                <span className="text-[14px] font-medium text-text-primary">
                  {fetchingRemote ? 'Fetching remote' : 'Scanning changes'}
                </span>
                <span className="text-[13.5px] leading-relaxed text-text-secondary">
                  {fetchingRemote ? (
                    <>
                      Syncing <span className="font-mono">origin</span> to get the latest commits.
                    </>
                  ) : (
                    <>
                      Comparing <span className="font-mono">{currentBranch || projectName}</span>{' '}
                      with <span className="font-mono">{refLabel || 'the source'}</span>.
                    </>
                  )}
                </span>
              </div>
            )}

            {!loading && files !== null && files.length === 0 && !error && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <Check className="h-5 w-5 text-success" />
                <span className="text-[14px] font-medium text-text-primary">
                  Already up to date
                </span>
                <span className="text-[13.5px] leading-relaxed text-text-secondary">
                  <span className="font-mono">{currentBranch || projectName}</span> has no
                  differences from <span className="font-mono">{refLabel || 'the source'}</span>.
                </span>
              </div>
            )}

            {!loading && files !== null && files.length > 0 && shown.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <Search className="h-5 w-5 text-text-secondary" />
                <span className="text-[14px] font-medium text-text-primary">No matching files</span>
                <span className="text-[13.5px] leading-relaxed text-text-secondary">
                  Nothing matches <span className="font-mono">{query.trim()}</span>.
                </span>
              </div>
            )}

            {!loading &&
              rows.map(({ node, depth }) => {
                const st = stateOf(node);
                const isOpenDir = node.isDir && !collapsed.has(node.path);
                const iconSrc = node.isDir
                  ? getFolderIconPath(node.name, isOpenDir)
                  : getFileIconPath(node.name);
                const dim = st === 'none';
                const meta = node.file ? STATUS_META[node.file.status] : null;
                return (
                  <div
                    key={node.path}
                    onClick={() => (node.isDir ? toggleCollapse(node.path) : toggleNode(node))}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleNode(node);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 transition-colors hover:bg-card-hover"
                    style={{ paddingLeft: 6 + depth * 16 }}
                    title={node.path}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform',
                        isOpenDir && 'rotate-90',
                        !node.isDir && 'invisible',
                      )}
                    />
                    <img
                      src={iconSrc}
                      alt=""
                      draggable={false}
                      className={cn('h-4 w-4 shrink-0', dim && 'opacity-40')}
                    />
                    <span
                      className={cn(
                        'min-w-0 truncate font-mono text-[13.5px]',
                        dim
                          ? 'text-text-secondary/50'
                          : scoped && node.file && !isInScope(node.file.path, scope)
                            ? 'text-error'
                            : 'text-text-primary',
                        node.file?.status === 'deleted' && 'text-error line-through',
                      )}
                    >
                      {node.name}
                    </span>
                    {meta && node.file && (
                      <span
                        title={meta.label}
                        className={cn('shrink-0 font-mono text-[13.5px] font-semibold', meta.cls)}
                      >
                        {node.file.status === 'added'
                          ? '(+)'
                          : node.file.status === 'deleted'
                            ? '(-)'
                            : '(~)'}
                      </span>
                    )}
                    <span className="flex-1" />
                    {(!node.isDir || !isOpenDir) &&
                      ownersOf(node).map((b) => (
                        <span
                          key={b}
                          className={cn(
                            'shrink-0 rounded px-1.5 py-[2px] font-mono text-[10.5px]',
                            ownerColor(b),
                          )}
                        >
                          {b}
                        </span>
                      ))}
                    <Counts added={node.added} deleted={node.deleted} />
                    <Checkbox
                      state={st}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(node);
                      }}
                    />
                  </div>
                );
              })}
          </div>
        </div>

        {error && (
          <div className="flex shrink-0 items-start gap-2 rounded-md border border-error/30 px-3 py-2 text-[14px] text-error">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 px-5 py-4">
        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={handleClose}
            disabled={applying}
            className="h-8 cursor-pointer rounded-lg bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            className="h-8 gap-1.5 font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80"
            onClick={handleApply}
            disabled={chosen.length === 0 || loading || applying}
          >
            {applying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {applying ? 'Pulling…' : `Pull ${chosen.length} file${chosen.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SyncBranchModal;
