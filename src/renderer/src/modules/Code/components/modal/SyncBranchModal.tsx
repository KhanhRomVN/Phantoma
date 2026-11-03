import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileDiff,
  FileMinus2,
  FilePlus2,
  GitBranch,
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
}

const FIELD =
  'w-full h-9 rounded-md bg-input-background border border-border text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-primary';

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
    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-[3px] text-[10px] font-semibold leading-none tracking-wide text-primary">
      REMOTE
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
  targetPath: baseTargetPath,
  projectName,
  currentBranch: baseBranch,
  branches,
  onApplied,
  fixedSource,
  targets,
}: SyncBranchModalProps) {
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const activeTarget = targets?.find((t) => t.path === pickedTarget) ?? targets?.[0] ?? null;
  const targetPath = activeTarget?.path ?? baseTargetPath;
  const currentBranch = activeTarget?.name ?? baseBranch;
  const [picked, setPicked] = useState<SourceOption | null>(null);
  const [rawBranches, setRawBranches] = useState<string[] | null>(null);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [files, setFiles] = useState<SyncFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
  const ref = fixedSource?.ref ?? refOf(selected);
  const isRemote = !fixedSource && selected?.kind === 'remote';

  useEffect(() => {
    if (!isOpen) return;
    setPicked(null);
    setFiles(null);
    setError('');
    setExcluded(new Set());
    setCollapsed(new Set());
    setApplying(false);
    setPickedTarget(null);
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

  const allState = !files?.length
    ? 'none'
    : chosen.length === files.length
      ? 'all'
      : chosen.length === 0
        ? 'none'
        : 'some';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-[46vw] min-w-[520px] max-w-[860px] h-[70vh] max-h-[70vh]"
    >
      <ModalHeader
        title={fixedSource ? 'Apply commit to branch' : 'Pull from branch'}
        description={
          fixedSource
            ? `Bring files from ${fixedSource.label} into the selected local branch. Gitignored paths are skipped.`
            : `Bring files from another branch into ${currentBranch || projectName}. Gitignored paths are skipped.`
        }
        onClose={handleClose}
        className="px-6 py-4"
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
        <div className="mb-1.5 text-[12px] text-text-secondary">Source</div>
        <div className="grid grid-cols-2 gap-3">
          {fixedSource ? (
            <div className="flex h-9 min-w-0 items-center gap-2 rounded-md bg-input-background px-3">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
              <span className="truncate font-mono text-[13px] text-text-primary">
                {fixedSource.label}
              </span>
            </div>
          ) : (
          <div className="min-w-0">
            <Dropdown align="start" sideOffset={4} className="w-full" searchable>
              <DropdownTrigger>
                <button
                  type="button"
                  className={cn(FIELD, 'flex items-center justify-between gap-2 px-3 text-left')}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    <span className="truncate">{selected?.name || 'Select branch'}</span>
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
                        <Check className={cn('h-3.5 w-3.5 text-primary', !active && 'invisible')} />
                      }
                      onClick={() => setPicked(o)}
                    >
                      <span className="truncate">{o.name}</span>
                      {o.kind === 'remote' && <RemoteBadge />}
                    </DropdownItem>
                  );
                })}
              </DropdownContent>
            </Dropdown>
          </div>
          )}

          {targets && targets.length > 0 ? (
            <div className="min-w-0">
              <Dropdown align="start" sideOffset={4} className="w-full" searchable>
                <DropdownTrigger>
                  <button
                    type="button"
                    className={cn(FIELD, 'flex items-center justify-between gap-2 px-3 text-left')}
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
            <div className="flex h-9 min-w-0 items-center gap-2 rounded-md bg-input-background px-3">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-mono text-[13px] text-text-primary">
                {currentBranch || '—'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[12px] text-text-secondary">
              Changes
              {fetchingRemote && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-divider bg-input-background/40">
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
                        : new Set(
                            flatten(tree, new Set())
                              .filter((r) => r.node.isDir)
                              .map((r) => r.node.path),
                          ),
                    )
                  }
                  className="text-[12px] text-text-secondary outline-none transition-colors hover:text-text-primary"
                >
                  {collapsed.size > 0 ? 'Expand all' : 'Collapse all'}
                </button>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
              {(loading || (files === null && !error)) && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-text-secondary/10">
                    <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                  </span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {fetchingRemote ? 'Fetching remote' : 'Scanning changes'}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-text-secondary">
                    {fetchingRemote ? (
                      <>
                        Syncing <span className="font-mono">origin</span> to get the latest commits.
                      </>
                    ) : (
                      <>
                        Comparing <span className="font-mono">{currentBranch || projectName}</span>{' '}
                        with <span className="font-mono">{ref || 'the source'}</span>.
                      </>
                    )}
                  </span>
                </div>
              )}

              {!loading && files !== null && files.length === 0 && !error && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-text-secondary/10">
                    <Check className="h-4.5 w-4.5 text-text-secondary" />
                  </span>
                  <span className="text-[13px] font-medium text-text-primary">
                    Already up to date
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-text-secondary">
                    <span className="font-mono">{currentBranch || projectName}</span> has no
                    differences from <span className="font-mono">{ref || 'the source'}</span>.
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
            {statusCount.deleted > 0 ? ` and ${statusCount.deleted} will be deleted` : ''}. Nothing
            is committed.
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
