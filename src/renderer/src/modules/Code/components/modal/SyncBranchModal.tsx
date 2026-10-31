import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Download,
  FileDiff,
  FileMinus2,
  FilePlus2,
  GitBranch,
  HardDrive,
  Loader2,
  Minus,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button/Button';

type FileStatus = 'added' | 'modified' | 'deleted';
type SourceMode = 'local' | 'remote';

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
}

const FIELD =
  'w-full h-9 rounded-md bg-input-background border border-border text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-primary';

const STATUS_META: Record<FileStatus, { icon: typeof FileDiff; cls: string; label: string }> = {
  added: { icon: FilePlus2, cls: 'text-success', label: 'Added' },
  modified: { icon: FileDiff, cls: 'text-warn', label: 'Modified' },
  deleted: { icon: FileMinus2, cls: 'text-error', label: 'Deleted' },
};

const stripOrigin = (n: string) => n.replace(/^origin\//, '');

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
      onClick={onClick}
      className={cn(
        'grid h-4 w-4 shrink-0 place-items-center rounded border outline-none transition-colors',
        state === 'none'
          ? 'border-border bg-input-background hover:border-primary'
          : 'border-primary bg-primary text-button-solid-text',
      )}
    >
      {state === 'all' && <Check className="h-3 w-3" strokeWidth={3} />}
      {state === 'some' && <Minus className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}

function Counts({ added, deleted }: { added: number; deleted: number }) {
  if (!added && !deleted) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11.5px]">
      {added > 0 && <span className="text-success">+{added}</span>}
      {deleted > 0 && <span className="text-error">-{deleted}</span>}
    </span>
  );
}

export function SyncBranchModal({
  isOpen,
  onClose,
  targetPath,
  projectName,
  currentBranch,
  branches,
  onApplied,
}: SyncBranchModalProps) {
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<SourceMode>('local');
  const [remotePick, setRemotePick] = useState('');
  const [rawBranches, setRawBranches] = useState<string[] | null>(null);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [files, setFiles] = useState<SyncFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const candidates = useMemo(
    () =>
      Array.from(new Set(branches.map(stripOrigin))).filter(
        (b) => b && b !== 'HEAD' && b !== currentBranch,
      ),
    [branches, currentBranch],
  );

  const rawLocal = useMemo(
    () => (rawBranches ?? []).filter((n) => !n.startsWith('origin/') && n !== 'origin'),
    [rawBranches],
  );
  const remoteNames = useMemo(
    () =>
      (rawBranches ?? [])
        .filter((n) => n.startsWith('origin/'))
        .map(stripOrigin)
        .filter((n) => n && n !== 'HEAD'),
    [rawBranches],
  );

  const hasLocal = rawLocal.includes(source);
  const hasRemote = remoteNames.includes(source);
  const effectiveMode: SourceMode =
    hasLocal && hasRemote ? mode : hasLocal ? 'local' : 'remote';
  const remoteBranch = remotePick || (hasRemote ? source : (remoteNames[0] ?? ''));
  const ref = !source
    ? ''
    : effectiveMode === 'remote'
      ? remoteBranch
        ? `origin/${remoteBranch}`
        : ''
      : source;

  useEffect(() => {
    if (!isOpen) return;
    setSource(candidates[0] ?? '');
    setMode('local');
    setRemotePick('');
    setFiles(null);
    setError('');
    setExcluded(new Set());
    setCollapsed(new Set());
    setApplying(false);
    setRawBranches(null);
    (window as any).api
      .invoke('git:list-branches', targetPath)
      .then((res: any) => setRawBranches(res?.branches ?? []))
      .catch(() => setRawBranches([]));
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
      if (effectiveMode === 'remote') {
        setFetchingRemote(true);
        try {
          await (window as any).api.invoke('git:fetch', targetPath);
        } catch {
          /* ignore fetch failure — still diff against last known origin ref */
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
  }, [isOpen, ref, rawBranches === null]);

  const tree = useMemo(() => buildTree(files ?? []), [files]);
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
    setExcluded(on ? new Set() : new Set((files ?? []).map((f) => f.path)));

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
      onApplied(res?.applied ?? chosen.length, ref);
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

  const allState = !files?.length ? 'none' : chosen.length === files.length ? 'all' : chosen.length === 0 ? 'none' : 'some';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-[46vw] min-w-[520px] max-w-[860px] max-h-[88vh]"
    >
      <ModalHeader
        title="Pull from branch"
        description={`Bring files from another branch into ${currentBranch || projectName}. Gitignored paths are skipped.`}
        onClose={handleClose}
        className="px-6 py-4"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5">
        <div className="mb-1.5 text-[12px] text-text-secondary">Source</div>
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
            <div className="min-w-0">
              <Dropdown align="start" sideOffset={4} className="w-full">
              <DropdownTrigger>
                <button
                  type="button"
                  className={cn(FIELD, 'flex items-center justify-between gap-2 px-3 text-left')}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    <span className="truncate">{source || 'Select branch'}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                </button>
              </DropdownTrigger>
              <DropdownContent className="max-h-[220px] overflow-y-auto">
                {candidates.map((b) => (
                  <DropdownItem
                    key={b}
                    icon={
                      <Check className={cn('h-3.5 w-3.5 text-primary', b !== source && 'invisible')} />
                    }
                    onClick={() => {
                      setSource(b);
                      setRemotePick('');
                    }}
                  >
                    <span className="truncate">{b}</span>
                  </DropdownItem>
                ))}
              </DropdownContent>
              </Dropdown>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-md bg-input-background px-3">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-mono text-[13px] text-text-primary">
                {currentBranch || '—'}
              </span>
            </div>
          </div>
        </div>

        {source && rawBranches !== null && (hasLocal || hasRemote) && (
          <div className="mt-4 flex items-center gap-2">
            {hasLocal && hasRemote ? (
              <div className="flex h-9 shrink-0 items-center gap-1 rounded-md bg-input-background p-1">
                {(['local', 'remote'] as SourceMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded px-3 text-[12.5px] font-medium outline-none transition-colors',
                      effectiveMode === m
                        ? 'bg-button-soft-background text-primary'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {m === 'local' ? (
                      <HardDrive className="h-3.5 w-3.5" />
                    ) : (
                      <Cloud className="h-3.5 w-3.5" />
                    )}
                    {m === 'local' ? 'Local' : 'Remote'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-input-background px-3 text-[12.5px] text-text-secondary">
                {effectiveMode === 'local' ? (
                  <HardDrive className="h-3.5 w-3.5" />
                ) : (
                  <Cloud className="h-3.5 w-3.5" />
                )}
                {effectiveMode === 'local' ? 'Local only' : 'Remote only'}
              </div>
            )}
            <span className="flex-1 truncate font-mono text-[12.5px] text-text-secondary">
              {effectiveMode === 'remote' ? `origin/${remoteBranch || '…'}` : source}
            </span>
            {fetchingRemote && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-secondary" />}
          </div>
        )}

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-[12px] text-text-secondary">Changes</span>
            {files && files.length > 0 && (
              <span className="flex items-center gap-3 text-[11.5px] text-text-secondary">
                {(Object.keys(STATUS_META) as FileStatus[]).map((s) => {
                  const M = STATUS_META[s];
                  return (
                    <span key={s} className="flex items-center gap-1">
                      <M.icon className={cn('h-3 w-3', M.cls)} />
                      {statusCount[s]}
                    </span>
                  );
                })}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-divider bg-input-background/40">
            {files && files.length > 0 && (
              <div className="flex h-9 items-center gap-2 border-b border-divider px-3">
                <Checkbox state={allState} onClick={() => selectAll(allState !== 'all')} />
                <span className="text-[12.5px] text-text-secondary">
                  {chosen.length} of {files.length} selected
                </span>
                <span className="flex-1" />
                <Counts added={totals.added} deleted={totals.deleted} />
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed(
                      collapsed.size > 0
                        ? new Set()
                        : new Set(flatten(tree, new Set()).filter((r) => r.node.isDir).map((r) => r.node.path)),
                    )
                  }
                  className="text-[12px] text-text-secondary outline-none transition-colors hover:text-text-primary"
                >
                  {collapsed.size > 0 ? 'Expand all' : 'Collapse all'}
                </button>
              </div>
            )}

            <div className="max-h-[340px] overflow-y-auto p-1.5">
              {(loading || (files === null && !error)) && (
                <div className="flex h-24 items-center justify-center gap-2 text-[13px] text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning changes…
                </div>
              )}

              {!loading && files !== null && files.length === 0 && !error && (
                <div className="flex h-24 flex-col items-center justify-center gap-1 text-[13px] text-text-secondary">
                  <Check className="h-4 w-4 text-success" />
                  Already in sync with {ref || 'the source'}
                </div>
              )}

              {!loading &&
                rows.map(({ node, depth }) => {
                  const st = stateOf(node);
                  const isOpenDir = node.isDir && !collapsed.has(node.path);
                  const meta = node.file ? STATUS_META[node.file.status] : null;
                  const iconSrc = node.isDir
                    ? getFolderIconPath(node.name, isOpenDir)
                    : getFileIconPath(node.name);
                  const StatusIcon = meta?.icon;
                  const dim = st === 'none';
                  return (
                    <div
                      key={node.path}
                      onClick={() => (node.isDir ? toggleCollapse(node.path) : toggleNode(node))}
                      className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md pr-2 transition-colors hover:bg-white/[0.05]"
                      style={{ paddingLeft: 6 + depth * 16 }}
                      title={node.path}
                    >
                      {node.isDir ? (
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform',
                            isOpenDir && 'rotate-90',
                          )}
                        />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <Checkbox
                        state={st}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNode(node);
                        }}
                      />
                      <img
                        src={iconSrc}
                        alt=""
                        className={cn('h-3.5 w-3.5 shrink-0', dim && 'opacity-40')}
                      />
                      {!node.isDir && StatusIcon && (
                        <StatusIcon className={cn('h-3 w-3 shrink-0', meta!.cls, dim && 'opacity-40')} />
                      )}
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate font-mono text-[12.5px]',
                          dim ? 'text-text-secondary/50' : 'text-text-primary',
                          node.file?.status === 'deleted' && 'text-error line-through',
                        )}
                      >
                        {node.name}
                      </span>
                      {node.isDir && (
                        <span className="shrink-0 text-[11px] text-text-secondary/70">
                          {node.files.length}
                        </span>
                      )}
                      <Counts added={node.added} deleted={node.deleted} />
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {chosen.length > 0 && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">
            Selected files are overwritten in the working tree of {currentBranch || projectName}
            {statusCount.deleted > 0 ? ` and ${statusCount.deleted} will be deleted` : ''}. Nothing is
            committed.
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-divider px-6 py-4">
        <button
          type="button"
          onClick={handleClose}
          disabled={applying}
          className="h-8 rounded-lg bg-button-soft-background px-3 text-[13px] font-medium text-text-secondary outline-none transition-colors hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:opacity-50 disabled:hover:bg-button-soft-background"
        >
          Cancel
        </button>
        <Button
          variant="soft"
          size="sm"
          className="h-8 gap-1.5 font-semibold"
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
    </Modal>
  );
}

export default SyncBranchModal;