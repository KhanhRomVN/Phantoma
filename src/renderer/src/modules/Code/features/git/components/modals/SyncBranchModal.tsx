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
  Upload,
  FileDiff,
  FileMinus2,
  FilePlus2,
  GitBranch,
  Loader2,
  Minus,
  Search,
  X,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { DiffBlock } from '@renderer/components/common/DiffBlock';
import { BranchScopeModal } from './BranchScopeModal';
import { parseGitStatusOutput } from '../../../../shared/utils/git-status-parser.util';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { Modal } from '@renderer/components/ui/Modal';
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit/ResizableSplit';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button/Button';
import { codeApi } from '../../../../shared/api/code.api';
import { Tooltip } from '@renderer/components/ui/Tooltip/Tooltip';
import { useBranchScope, useBranchScopeStore, isInScope } from '../../../../shared/stores/branch-scope.store';
import type { ScopeCategory } from '../../../../shared/stores/scope-stats.store';
import {
  SCOPE_BADGE_ORDER,
  SCOPE_BADGE_META,
  SCOPE_DOT,
  SCOPE_BADGE_ON,
  SCOPE_BADGE_OFF,
} from '../scope/scopeBadges';
import {
  ScopeDots,
  categoryCounts,
  scopeRootOwners,
  branchColors,
  groupScopeBlocks,
} from '../scope/scopeTree';

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

const BRANCH_PILL =
  'flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 text-left text-[14px] text-text-primary transition-colors hover:bg-text-secondary/10 disabled:cursor-default disabled:hover:bg-transparent';

const STATUS_META: Record<FileStatus, { icon: typeof FileDiff; cls: string; label: string }> = {
  added: { icon: FilePlus2, cls: 'text-success', label: 'Added' },
  modified: { icon: FileDiff, cls: 'text-warn', label: 'Modified' },
  deleted: { icon: FileMinus2, cls: 'text-error', label: 'Deleted' },
};

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

const WARNING_TONES = {
  primary: { badge: 'bg-primary/20 text-primary', title: 'text-primary', icon: FileDiff },
  warn: { badge: 'bg-warn/20 text-warn', title: 'text-warn', icon: AlertCircle },
  error: { badge: 'bg-error/20 text-error', title: 'text-error', icon: FileMinus2 },
};

function SyncDiffPanel({
  projectPath,
  sourceRef,
  sourcePath,
  filePath,
  file,
  paths,
  onNavigate,
}: {
  projectPath: string;
  sourceRef: string;
  sourcePath?: string;
  filePath: string | null;
  file: SyncFile | null;
  paths: string[];
  onNavigate: (path: string) => void;
}) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; diff: string }>({
    loading: true,
    error: null,
    diff: '',
  });

  useEffect(() => {
    if (!sourceRef || !filePath) return;
    let cancelled = false;
    setState({ loading: true, error: null, diff: '' });
    (window as any).api
      .invoke(
        sourcePath ? 'git:worktree-file-diff' : 'git:branch-sync-file-diff',
        projectPath,
        sourcePath ?? sourceRef,
        filePath,
      )
      .then((res: { diff?: string; error?: string }) => {
        if (cancelled) return;
        setState({ loading: false, error: res?.error ?? null, diff: res?.diff ?? '' });
      })
      .catch((e: any) => {
        if (!cancelled) setState({ loading: false, error: e?.message || String(e), diff: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, sourceRef, filePath]);

  if (!filePath) {
    return (
      <div className="flex h-full min-w-0 flex-1 items-center justify-center text-[13.5px] text-text-secondary">
        No file to preview
      </div>
    );
  }

  const index = paths.indexOf(filePath);
  const canNav = index >= 0 && paths.length > 1;
  const go = (delta: number) => onNavigate(paths[(index + delta + paths.length) % paths.length]);
  const name = filePath.split('/').pop() ?? filePath;
  const dir = filePath.slice(0, Math.max(0, filePath.length - name.length - 1));
  const meta = file ? STATUS_META[file.status] : null;
  const BTN =
    'grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary';

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-text-secondary/20 px-4">
        <img src={getFileIconPath(name)} alt="" className="h-5 w-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-mono text-[14px] font-medium text-text-primary">
            {name}
          </span>
          {dir && <span className="truncate font-mono text-[12px] text-text-secondary">{dir}</span>}
        </div>
        {meta && (
          <span
            className={cn('flex shrink-0 items-center gap-1 text-[12.5px] font-medium', meta.cls)}
          >
            <meta.icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        )}
        {file && <Counts added={file.added} deleted={file.deleted} />}
        {canNav && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" title="Previous file" onClick={() => go(-1)} className={BTN}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[12.5px] text-text-secondary">
              {index + 1} / {paths.length}
            </span>
            <button type="button" title="Next file" onClick={() => go(1)} className={BTN}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <ModalBody className="p-0">
        <DiffBlock
          diff={state.diff}
          loading={state.loading}
          error={state.error}
          rowClassName="text-[13.5px] leading-[22px]"
        />
      </ModalBody>
    </div>
  );
}

function WarningBox({
  title,
  desc,
  tone = 'warn',
}: {
  title: string;
  desc: string;
  tone?: keyof typeof WARNING_TONES;
}) {
  const t = WARNING_TONES[tone];
  return (
    <div className="flex shrink-0 items-center gap-2.5 p-2">
      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md', t.badge)}>
        <t.icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-[12.5px] font-semibold', t.title)}>{title}</span>
        <span className="text-[11.5px] leading-snug text-text-secondary">{desc}</span>
      </div>
    </div>
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

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [unpushedOnly, setUnpushedOnly] = useState(false);
  const [unpushed, setUnpushed] = useState<Set<string> | null>(null);
  const [unpushedLoading, setUnpushedLoading] = useState(false);
  const [active, setActive] = useState<ScopeCategory | 'all'>('all');
  const [scopeInfo, setScopeInfo] = useState<{
    diff: Set<string> | null;
    other: Set<string>;
  } | null>(null);

  const options = useMemo<SourceOption[]>(() => {
    const all = rawBranches ?? branches;
    const local = Array.from(
      new Set(all.filter((n) => !n.startsWith('origin/') && n !== 'origin' && n !== 'HEAD')),
    ).filter(
      (n) =>
        n &&
        n !== currentBranch &&
        (!defaultBranch || fixedSource || currentBranch === defaultBranch),
    );
    const remote = Array.from(
      new Set(
        all
          .filter((n) => n.startsWith('origin/'))
          .map(stripOrigin)
          .filter(
            (n) => n && n !== 'HEAD' && (!defaultBranch || fixedSource || n === defaultBranch),
          ),
      ),
    );
    return [
      ...local.map((name) => ({ name, kind: 'local' as const })),
      ...remote.map((name) => ({ name, kind: 'remote' as const })),
    ];
  }, [rawBranches, branches, currentBranch, defaultBranch, fixedSource]);

  const selected = picked ?? options[0] ?? null;
  const isRemote = !fixedSource && selected?.kind === 'remote';
  const branchRef = fixedSource?.ref ?? refOf(selected);
  const ref = branchRef;
  const refLabel = branchRef;
  const scope = useBranchScope(projectId ?? '', fixedSource ? '' : currentBranch);
  const setBranchScope = useBranchScopeStore((s) => s.setScope);
  const needsScope =
    !fixedSource &&
    !!projectId &&
    !!defaultBranch &&
    !!currentBranch &&
    currentBranch !== defaultBranch &&
    scope.length === 0;
  const allScopes = useBranchScopeStore((s) => s.scopes);
  const branchScopes = useMemo(() => {
    const prefix = `${projectId ?? ''}::`;
    return Object.entries(allScopes)
      .filter(([k, paths]) => k.startsWith(prefix) && paths.length > 0)
      .map(([k, paths]) => ({ branch: k.slice(prefix.length), paths }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [allScopes, projectId]);
  const otherScopes = useMemo(
    () => branchScopes.filter((o) => o.branch !== currentBranch),
    [branchScopes, currentBranch],
  );
  useEffect(() => {
    if (!isOpen) return;
  }, [isOpen, projectId, currentBranch, allScopes, otherScopes]);
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
    setQuery('');
    setActive('all');
    if (fixedSource) {
      setRawBranches([]);
      return;
    }
    setRawBranches(null);
    codeApi.git
      .pruneOrphanBranches(targetPath)
      .catch(() => null)
      .then(() => {
        return codeApi.git.branches(targetPath);
      })
      .then((res: any) => {
        setRawBranches(res?.branches ?? []);
      })
      .catch(() => {
        setRawBranches([]);
      });
  }, [isOpen]);

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
        // ASSUMED: mặc định untick file thuộc scope của các branch khác (trừ file nằm trong scope branch hiện tại)
        setExcluded(
          new Set<string>(
            (res?.error ? [] : (res?.files ?? []))
              .filter(
                (f: { path: string }) =>
                  !isInScope(f.path, scope) && otherScopes.some((o) => isInScope(f.path, o.paths)),
              )
              .map((f: { path: string }) => f.path),
          ),
        );
        setCollapsed(new Set());
        setActive('all');
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
  }, [isOpen, ref, targetPath, rawBranches === null, reloadKey]);

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
    () => new Map((files ?? []).map((f) => [f.path, f.status] as const)),
    [files],
  );
  const hiddenPaths = useMemo(() => {
    const s = new Set<string>();
    if (active === 'all') return s;
    const keep = new Set(byCategory[active]);
    (files ?? []).forEach((f) => {
      if (!keep.has(f.path)) s.add(f.path);
    });
    return s;
  }, [active, byCategory, files]);
  // ASSUMED: file ngoài scope mà local đã khác remote-default = nhóm 'diff' + 'error'
  const inScopeWarn = useMemo(
    () =>
      isRemote && scope.length > 0 && (active === 'all' || active === 'primary')
        ? byCategory.primary
        : [],
    [isRemote, scope, byCategory, active],
  );
  const outScopeWarn = useMemo(
    () =>
      isRemote && scope.length > 0
        ? [
            ...(active === 'all' || active === 'error' ? byCategory.error : []),
            ...(active === 'all' || active === 'diff' ? byCategory.diff : []),
          ]
        : [],
    [isRemote, scope, byCategory, active],
  );
  const visibleFiles = useMemo(
    () =>
      (files ?? []).filter(
        (f) => !hiddenPaths.has(f.path) && (!unpushedOnly || !!unpushed?.has(f.path)),
      ),
    [files, hiddenPaths, unpushedOnly, unpushed],
  );
  const isLocalSource = !fixedSource && selected?.kind === 'local';

  const [dirty, setDirty] = useState<Set<string>>(new Set());
  useEffect(() => {
    setDirty(new Set());
    if (!isOpen || !isRemote || !targetPath) return;
    let cancelled = false;
    codeApi.git
      .status(targetPath)
      .then((res: any) => {
        if (cancelled || res?.error) return;
        setDirty(new Set(parseGitStatusOutput(String(res?.output ?? '')).map((e: any) => e.path)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, isRemote, targetPath, ref, files]);

  useEffect(() => {
    setUnpushedOnly(false);
    setUnpushed(null);
  }, [ref]);
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
  const blocked = useMemo(
    () => (isRemote ? chosen.filter((f) => dirty.has(f.path)) : []),
    [isRemote, chosen, dirty],
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
    Promise.all([
      codeApi.git
        .diffVsDefault(targetPath)
        .then((res) => (res.files ? new Set<string>(res.files) : null))
        .catch(() => null),
      codeApi.git
        .changedInOtherBranches(targetPath)
        .then((res: any) => new Set<string>(Object.keys(res?.files ?? {})))
        .catch(() => new Set<string>()),
    ]).then(([diff, other]) => {
      if (!cancelled) setScopeInfo({ diff, other });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, files, targetPath, scope]);

  useEffect(() => {
    setDiffPath(null);
  }, [isOpen, ref, targetPath]);

  useEffect(() => {
    if (!isOpen) return;
    if (shown.length === 0) return;
    if (diffPath === null || !shown.some((f) => f.path === diffPath)) setDiffPath(shown[0].path);
  }, [isOpen, shown, diffPath]);

  useEffect(() => {
    if (!isOpen || confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      )
        return;
      const order = rows.filter((r) => !r.node.isDir && r.node.file).map((r) => r.node.file!.path);
      if (order.length === 0) return;
      const i = diffPath ? order.indexOf(diffPath) : -1;
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next =
        i < 0 ? (delta > 0 ? 0 : order.length - 1) : (i + delta + order.length) % order.length;
      e.preventDefault();
      setDiffPath(order[next]);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, confirmOpen, rows, diffPath]);

  useEffect(() => {
    if (!isOpen || !diffPath) return;
    const el = document.querySelector(`[data-sync-row="${CSS.escape(diffPath)}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [isOpen, diffPath]);

  const toggleCategory = (id: ScopeCategory | 'all') => {
    const next = id === 'all' || active === id ? 'all' : id;
    const keep = next === 'all' ? null : new Set(byCategory[next]);
    setActive(next);
    setExcluded(
      new Set(
        (files ?? [])
          .filter((f) => (keep && !keep.has(f.path)) || (unpushedOnly && !unpushed?.has(f.path)))
          .map((f) => f.path),
      ),
    );
  };
  const SEG =
    'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13.5px] font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50';

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

  useEffect(() => {
    if (!isOpen || confirmOpen || !diffPath) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.tagName === 'BUTTON' ||
          t.isContentEditable)
      )
        return;
      const row = rows.find((r) => !r.node.isDir && r.node.path === diffPath);
      if (!row) return;
      e.preventDefault();
      toggleNode(row.node);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, confirmOpen, rows, diffPath, excluded]);

  const selectAll = (on: boolean) => {
    const visible = new Set(visibleFiles.map((f) => f.path));
    setExcluded(
      new Set((files ?? []).filter((f) => !on || !visible.has(f.path)).map((f) => f.path)),
    );
  };

  const branchScopeFiles = (paths: string[]) =>
    (files ?? []).filter((f) => isInScope(f.path, paths)).map((f) => f.path);

  const toggleBranchScope = (paths: string[]) => {
    const ps = branchScopeFiles(paths);
    setExcluded((prev) => {
      const next = new Set(prev);
      if (ps.every((p) => next.has(p))) ps.forEach((p) => next.delete(p));
      else ps.forEach((p) => next.add(p));
      return next;
    });
  };

  const toggleUnpushed = async () => {
    if (unpushedLoading) return;
    if (unpushedOnly) {
      setUnpushedOnly(false);
      setExcluded((prev) => {
        const next = new Set(prev);
        (files ?? []).forEach((f) => {
          if (!hiddenPaths.has(f.path)) next.delete(f.path);
        });
        return next;
      });
      return;
    }
    if (!selected) return;
    setUnpushedLoading(true);
    try {
      const res = await (window as any).api.invoke('git:unpushed-files', targetPath, selected.name);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const set = new Set<string>(res?.files ?? []);
      setUnpushed(set);
      setUnpushedOnly(true);
      setExcluded((prev) => {
        const next = new Set(prev);
        (files ?? []).forEach((f) => {
          if (!set.has(f.path)) next.add(f.path);
        });
        return next;
      });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setUnpushedLoading(false);
    }
  };

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
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setApplying(false);
      setConfirmOpen(false);
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

  if (needsScope && isOpen) {
    return (
      <BranchScopeModal
        projectRoot={targetPath}
        branchName={currentBranch}
        initial={scope}
        otherScopes={otherScopes}
        onSave={(paths) => {
          setBranchScope(projectId!, currentBranch, paths);
        }}
        onClose={onClose}
        closable
      />
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-[97vw] max-w-[2000px] h-[94vh] min-h-[70vh] max-h-[96vh]"
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-text-secondary/20 px-4">
        <span className="shrink-0 text-[15px] font-semibold text-text-primary">
          {fixedSource ? 'Apply commit to branch' : 'Sync From Branch'}
        </span>
        <span className="h-5 w-px shrink-0 bg-text-secondary/20" />
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {fixedSource ? (
            <div className="flex h-9 min-w-0 max-w-[360px] items-center gap-2 px-2">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
              <span className="truncate font-mono text-[14px] text-text-primary">
                {fixedSource.label}
              </span>
            </div>
          ) : (
            <div className="min-w-0 max-w-[360px]">
              <Dropdown align="start" sideOffset={4} className="min-w-0" searchable>
                <DropdownTrigger>
                  <button type="button" disabled={options.length <= 1} className={BRANCH_PILL}>
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                      <span className="truncate font-mono">
                        {selected?.name || 'Select branch'}
                      </span>
                      {isDefaultSource && <DefaultBadge />}
                      {isRemote && <RemoteBadge />}
                    </span>
                    {options.length > 1 && (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    )}
                  </button>
                </DropdownTrigger>
                <DropdownContent className="max-h-[220px] min-w-[220px] overflow-y-auto">
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
                        onClick={() => setPicked(o)}
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
            <div className="min-w-0 max-w-[360px]">
              <Dropdown align="start" sideOffset={4} className="min-w-0" searchable>
                <DropdownTrigger>
                  <button type="button" disabled={targets.length <= 1} className={BRANCH_PILL}>
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate font-mono">{currentBranch || 'Select branch'}</span>
                    </span>
                    {targets.length > 1 && (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    )}
                  </button>
                </DropdownTrigger>
                <DropdownContent className="max-h-[220px] min-w-[220px] overflow-y-auto">
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
            <div className="flex h-9 min-w-0 max-w-[360px] items-center gap-2 px-2">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-mono text-[14px] text-text-primary">
                {currentBranch || '—'}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1" />
        <Button
          onClick={handleClose}
          disabled={applying}
          className="h-8 cursor-pointer rounded-lg bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          className="h-8 gap-1.5 font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80"
          onClick={() => setConfirmOpen(true)}
          disabled={chosen.length === 0 || loading || applying}
        >
          <Download className="h-3.5 w-3.5" />
          {`Sync ${chosen.length} file${chosen.length === 1 ? '' : 's'}`}
        </Button>
        <button
          type="button"
          title="Close"
          onClick={handleClose}
          disabled={applying}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ResizableSplit direction="horizontal" initialSize={26} minSize={18} maxSize={50}>
          <div className="flex h-full w-full min-w-0 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-3 border-b border-text-secondary/20 px-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                <FileDiff className="h-3.5 w-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold leading-tight text-text-primary">
                  Review changes
                  {(fetchingRemote || loading) && (
                    <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />
                  )}
                </span>
                <span className="truncate text-[12px] leading-tight text-text-secondary">
                  {files && files.length > 0
                    ? `${chosen.length} of ${visibleFiles.length} selected`
                    : 'No changes to review'}
                </span>
              </div>
              {files && files.length > 0 && (
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-text-secondary/20">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${visibleFiles.length ? Math.round((chosen.length / visibleFiles.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-9 text-right font-mono text-[12px] text-text-secondary">
                    {visibleFiles.length
                      ? Math.round((chosen.length / visibleFiles.length) * 100)
                      : 0}
                    %
                  </span>
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 pb-3 pt-3">
              {files && files.length > 0 && (scope.length > 0 || isLocalSource) && (
                <div className="flex shrink-0 items-center gap-2">
                  {scope.length > 0 && (
                    <button
                      type="button"
                      disabled={!scopeInfo}
                      onClick={() => toggleCategory('all')}
                      className={cn(
                        'flex h-6 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
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
                  )}
                  {scope.length > 0 &&
                    SCOPE_BADGE_ORDER.map((id) => {
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
                                  : `Click to show and tick only the ${ps.length} file${ps.length === 1 ? '' : 's'} in this group.`}
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
                  {scope.length > 0 &&
                    otherScopes.map((o) => {
                      const ps = branchScopeFiles(o.paths);
                      if (ps.length === 0) return null;
                      const off = ps.every((p) => excluded.has(p));
                      return (
                        <Tooltip
                          key={`scope-chip-${o.branch}`}
                          side="top"
                          align="start"
                          content={`${off ? 'Tick' : 'Untick'} the ${ps.length} file${ps.length === 1 ? '' : 's'} in the scope of ${o.branch}.`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleBranchScope(o.paths)}
                            className={cn(
                              'flex h-6 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-medium outline-none transition-colors',
                              branchColors(o.branch, treeScopes, currentBranch).badge,
                              off && 'opacity-50 line-through',
                            )}
                          >
                            {o.branch}
                            <span className="font-mono text-[11px] text-text-secondary">
                              {ps.length}
                            </span>
                          </button>
                        </Tooltip>
                      );
                    })}
                  {scope.length > 0 &&
                    otherScopes.length > 0 &&
                    (() => {
                      const ps = byCategory.diff.filter(
                        (p) => !otherScopes.some((o) => isInScope(p, o.paths)),
                      );
                      if (ps.length === 0) return null;
                      const off = ps.every((p) => excluded.has(p));
                      return (
                        <Tooltip
                          side="top"
                          align="start"
                          content={`${off ? 'Tick' : 'Untick'} the ${ps.length} Drift file${ps.length === 1 ? '' : 's'} not in the scope of any other branch.`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExcluded((prev) => {
                                const next = new Set(prev);
                                if (ps.every((p) => next.has(p))) ps.forEach((p) => next.delete(p));
                                else ps.forEach((p) => next.add(p));
                                return next;
                              })
                            }
                            className={cn(
                              'flex h-6 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-medium outline-none transition-colors',
                              SCOPE_BADGE_ON.diff,
                              off && 'opacity-50 line-through',
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SCOPE_DOT.diff)} />
                            Unscoped
                            <span className="font-mono text-[11px] text-text-secondary">{ps.length}</span>
                          </button>
                        </Tooltip>
                      );
                    })()}
                  {isLocalSource && (
                    <>
                      <span className="flex-1" />
                      <Tooltip
                        side="top"
                        align="end"
                        content="Only list files not yet added, committed or pushed on this branch."
                      >
                        <button
                          type="button"
                          disabled={unpushedLoading}
                          onClick={() => void toggleUnpushed()}
                          className={cn(
                            SEG,
                            'whitespace-nowrap',
                            unpushedOnly ? SCOPE_BADGE_ON.primary : SCOPE_BADGE_OFF,
                          )}
                        >
                          {unpushedLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Unpushed only
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              )}

              {files && files.length > 0 && (
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
                  {inScopeWarn.length + outScopeWarn.length + blocked.length > 0 && (
                    <Tooltip
                      side="bottom"
                      align="end"
                      contentClassName="!max-w-[340px] !bg-card-background !p-1 shadow-xl"
                      content={
                        <div className="flex w-[320px] max-w-[80vw] flex-col gap-0.5">
                          {inScopeWarn.length > 0 && (
                            <WarningBox
                              tone="primary"
                              title={`${inScopeWarn.length} file${inScopeWarn.length === 1 ? '' : 's'} inside scope`}
                              desc={`Changed on ${refLabel} and fall inside the scope of ${currentBranch}.`}
                            />
                          )}
                          {outScopeWarn.length > 0 && (
                            <WarningBox
                              title={`${outScopeWarn.length} file${outScopeWarn.length === 1 ? '' : 's'} outside scope`}
                              desc={`Outside the scope of ${currentBranch} and also have local changes.`}
                            />
                          )}
                          {blocked.length > 0 && (
                            <WarningBox
                              tone="error"
                              title={`${blocked.length} file${blocked.length === 1 ? '' : 's'} will be overwritten`}
                              desc="These files have local uncommitted changes."
                            />
                          )}
                        </div>
                      }
                    >
                      <button
                        type="button"
                        className={cn(
                          'relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md bg-card-background outline-none transition-colors hover:bg-card-hover',
                          blocked.length > 0 ? 'text-error' : 'text-warn',
                        )}
                      >
                        <AlertCircle className="h-4 w-4 animate-pulse" />
                        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                          <span
                            className={cn(
                              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                              blocked.length > 0 ? 'bg-error' : 'bg-warn',
                            )}
                          />
                          <span
                            className={cn(
                              'relative inline-flex h-2 w-2 rounded-full',
                              blocked.length > 0 ? 'bg-error' : 'bg-warn',
                            )}
                          />
                        </span>
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-dashed border-text-secondary/20">
                <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-text-secondary/20 px-3">
                  {files && files.length > 0 ? (
                    <>
                      <Checkbox state={allState} onClick={() => selectAll(allState !== 'all')} />
                      <span className="text-[13.5px] font-medium text-text-primary">
                        {chosen.length}
                        <span className="font-normal text-text-secondary">
                          {' '}
                          / {visibleFiles.length} files
                        </span>
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
                    <div className="flex animate-pulse flex-col gap-0.5" aria-busy="true">
                      {[
                        [0, 'w-16'],
                        [1, 'w-24'],
                        [2, 'w-40'],
                        [2, 'w-32'],
                        [2, 'w-44'],
                        [1, 'w-20'],
                        [2, 'w-36'],
                        [2, 'w-28'],
                        [0, 'w-14'],
                        [1, 'w-32'],
                        [2, 'w-40'],
                      ].map(([depth, w], i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-1 pr-2"
                          style={{ paddingLeft: 6 + (depth as number) * 16 }}
                        >
                          <div className="h-3.5 w-3.5 shrink-0 rounded bg-text-secondary/10" />
                          <div className="h-4 w-4 shrink-0 rounded bg-text-secondary/10" />
                          <div className={cn('h-3.5 rounded bg-text-secondary/10', w as string)} />
                          <span className="flex-1" />
                          {depth === 2 && (
                            <div className="h-3 w-10 shrink-0 rounded bg-text-secondary/10" />
                          )}
                          <div className="h-4 w-4 shrink-0 rounded-[4px] bg-text-secondary/10" />
                        </div>
                      ))}
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
                        differences from{' '}
                        <span className="font-mono">{refLabel || 'the source'}</span>.
                      </span>
                    </div>
                  )}

                  {!loading && files !== null && files.length > 0 && shown.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                      <Search className="h-5 w-5 text-text-secondary" />
                      <span className="text-[14px] font-medium text-text-primary">
                        No matching files
                      </span>
                      <span className="text-[13.5px] leading-relaxed text-text-secondary">
                        Nothing matches <span className="font-mono">{query.trim()}</span>.
                      </span>
                    </div>
                  )}

                  {!loading &&
                    groupScopeBlocks(
                      rows,
                      rows.map(({ node, depth }, rowIndex) => {
                        const st = stateOf(node);
                        const isOpenDir = node.isDir && !collapsed.has(node.path);
                        const iconSrc = node.isDir
                          ? getFolderIconPath(node.name, isOpenDir)
                          : getFileIconPath(node.name);
                        const dim = st === 'none';
                        const meta = node.file ? STATUS_META[node.file.status] : null;
                        const owners = scopeRootOwners(
                          rows,
                          rowIndex,
                          treeScopes,
                          currentBranch,
                          true,
                        );
                        const dotPaths = pathsOf(node);
                        const dotCounts =
                          scope.length > 0 && active === 'all'
                            ? categoryCounts(dotPaths, categoryOf)
                            : {};
                        const dotDeleted =
                          dotPaths.length > 0 &&
                          dotPaths.every((p) => statusOf.get(p) === 'deleted');
                        return (
                          <div
                            key={node.path}
                            data-sync-row={node.path}
                            onClick={() =>
                              node.isDir
                                ? toggleCollapse(node.path)
                                : setDiffPath(node.file?.path ?? null)
                            }
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleNode(node);
                            }}
                            className={cn(
                              'group flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 transition-colors hover:bg-card-hover',
                              !node.isDir &&
                                node.path === diffPath &&
                                'rounded-l-none bg-primary/30 hover:bg-primary/35 shadow-[inset_3px_0_0_0_currentColor] text-primary',
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
                                className={cn(
                                  'shrink-0 font-mono text-[13.5px] font-semibold',
                                  meta.cls,
                                )}
                              >
                                {node.file.status === 'added'
                                  ? '(+)'
                                  : node.file.status === 'deleted'
                                    ? '(-)'
                                    : '(~)'}
                              </span>
                            )}
                            <span className="flex-1" />

                            {owners.map((b) => (
                              <span
                                key={b}
                                className={cn(
                                  'shrink-0 rounded px-1.5 py-[2px] font-mono text-[10.5px]',
                                  branchColors(b, treeScopes, currentBranch).badge,
                                )}
                              >
                                {b}
                              </span>
                            ))}
                            <ScopeDots counts={dotCounts} deleted={dotDeleted} />
                            <Checkbox
                              state={st}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(node);
                              }}
                            />
                          </div>
                        );
                      }),
                      treeScopes,
                      currentBranch,
                    )}
                </div>
              </div>

              {error && (
                <div className="flex shrink-0 items-start gap-2 rounded-md border border-error/30 px-3 py-2 text-[14px] text-error">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}
            </div>
          </div>
          <SyncDiffPanel
            projectPath={targetPath}
            sourceRef={ref}

            filePath={diffPath}
            file={(files ?? []).find((f) => f.path === diffPath) ?? null}
            paths={shown.map((f) => f.path)}
            onNavigate={setDiffPath}
          />
        </ResizableSplit>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => !applying && setConfirmOpen(false)}
        closeOnBackdropClick={false}
        className="max-w-[420px]"
      >
        <ModalBody className="px-5 py-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Download className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-semibold leading-snug text-text-primary">
              {`Sync ${chosen.length} file${chosen.length === 1 ? '' : 's'}?`}
            </h3>
            <p className="max-w-[320px] text-xs leading-relaxed text-text-secondary">
              {`Files from ${refLabel} will be copied into ${currentBranch || projectName}.`}
              {blocked.length > 0 &&
                ` ${blocked.length} file${blocked.length === 1 ? '' : 's'} with local uncommitted changes will be overwritten.`}
            </p>
          </div>
        </ModalBody>
        <ModalFooter className="gap-0 border-t border-border p-0">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={applying}
            className="h-[42px] flex-1 cursor-pointer border-r border-border text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.06] disabled:opacity-50"
          >
            {applying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {applying ? 'Syncing…' : 'Sync'}
          </button>
        </ModalFooter>
      </Modal>
    </Modal>
  );
}

export { SyncDiffPanel, buildTree, flatten, Checkbox, Counts, STATUS_META, BRANCH_PILL };
export type { SyncFile, TreeNode, FileStatus };

export default SyncBranchModal;
