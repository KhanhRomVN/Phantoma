import { gitIpc } from '../../../../shared/ipc/git.ipc';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileDiff,
  GitBranch,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit/ResizableSplit';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button/Button';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { codeApi } from '../../../../shared/api/code.api';
import {
  SyncDiffPanel,
  buildTree,
  flatten,
  Checkbox,
  Counts,
  STATUS_META,
  BRANCH_PILL,
  type SyncFile,
  type TreeNode,
} from '../../../git';

export interface ScopeTransferTarget {
  branch: string;
  path: string;
  files: string[];
}

interface ScopeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBranch: string;
  sourceRoot: string;
  targets: ScopeTransferTarget[];
  onApplied: (count: number, branch: string) => void;
}

export function ScopeTransferModal({
  isOpen,
  onClose,
  sourceBranch,
  sourceRoot,
  targets,
  onApplied,
}: ScopeTransferModalProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [files, setFiles] = useState<SyncFile[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<string[]>([]);

  const target = targets.find((t) => t.branch === picked) ?? targets[0] ?? null;
  const targetBranch = target?.branch ?? '';
  const targetPath = target?.path ?? '';

  useEffect(() => {
    if (!isOpen) return;
    setPicked(null);
    setApplying(false);
    setConfirmOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !target) {
      setFiles(null);
      return;
    }
    let cancelled = false;
    const fallback = (): SyncFile[] =>
      target.files.map((p) => ({ path: p, status: 'modified', added: 0, deleted: 0 }));
    setFiles(null);
    setExcluded(new Set());
    setCollapsed(new Set());
    setDiffPath(null);
    setError('');
    setConflicts([]);
    gitIpc.invoke('git:branch-sync-preview', targetPath, sourceBranch)
      .then((res: { files?: SyncFile[] }) => {
        if (cancelled) return;
        const byPath = new Map<string, SyncFile>((res?.files ?? []).map((f) => [f.path, f]));
        setFiles(
          target.files.map(
            (p) => byPath.get(p) ?? { path: p, status: 'modified', added: 0, deleted: 0 },
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setFiles(fallback());
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetBranch, targetPath, sourceBranch]);

  const tree = useMemo(() => buildTree(files ?? []), [files]);
  const rows = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  const order = useMemo(
    () => rows.filter((r) => !r.node.isDir && r.node.file).map((r) => r.node.file!.path),
    [rows],
  );
  const chosen = useMemo(() => (files ?? []).filter((f) => !excluded.has(f.path)), [files, excluded]);
  const totals = useMemo(
    () =>
      chosen.reduce((acc, f) => ({ added: acc.added + f.added, deleted: acc.deleted + f.deleted }), {
        added: 0,
        deleted: 0,
      }),
    [chosen],
  );

  useEffect(() => {
    if (!isOpen || order.length === 0) return;
    if (diffPath === null || !order.includes(diffPath)) setDiffPath(order[0]);
  }, [isOpen, order, diffPath]);

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

  const allState =
    !files || files.length === 0
      ? 'none'
      : chosen.length === files.length
        ? 'all'
        : chosen.length === 0
          ? 'none'
          : 'some';

  const handleApply = async () => {
    if (!target || chosen.length === 0 || applying) return;
    setApplying(true);
    setError('');
    setConflicts([]);
    try {
      const res = await codeApi.git.scopeTransfer(
        sourceRoot,
        target.path,
        chosen.map((f) => f.path),
      );
      if (res?.error) {
        setError(res.error);
        setConflicts(res.conflicts ?? []);
        return;
      }
      onApplied(res?.transferred ?? chosen.length, target.branch);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
      setConfirmOpen(false);
    }
  };

  const handleClose = () => {
    if (!applying) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className={'w-[97vw] max-w-[2000px] h-[94vh] min-h-[70vh] max-h-[96vh]'}
    >
      <div
        className={
          'flex h-12 shrink-0 items-center gap-3 border-b border-text-secondary/20 px-4'
        }
      >
        <span className={'shrink-0 text-[15px] font-semibold text-text-primary'}>
          Move changes to branch scope
        </span>
        <span className={'h-5 w-px shrink-0 bg-text-secondary/20'} />
        <div className={'flex min-w-0 shrink-0 items-center gap-2'}>
          <div className={'flex h-9 min-w-0 max-w-[360px] items-center gap-2 px-2'}>
            <GitBranch className={'h-3.5 w-3.5 shrink-0 text-text-secondary'} />
            <span className={'truncate font-mono text-[14px] text-text-primary'}>{sourceBranch}</span>
          </div>
          <ArrowRight className={'h-4 w-4 shrink-0 text-text-secondary'} />
          <div className={'min-w-0 max-w-[360px]'}>
            <Dropdown align={'start'} sideOffset={4} className={'min-w-0'} searchable>
              <DropdownTrigger>
                <button type={'button'} disabled={targets.length <= 1} className={BRANCH_PILL}>
                  <span className={'flex min-w-0 items-center gap-2'}>
                    <GitBranch className={'h-3.5 w-3.5 shrink-0 text-primary'} />
                    <span className={'truncate font-mono'}>{targetBranch || 'Select branch'}</span>
                  </span>
                  {targets.length > 1 && (
                    <ChevronDown className={'h-3.5 w-3.5 shrink-0 text-text-secondary'} />
                  )}
                </button>
              </DropdownTrigger>
              <DropdownContent className={'max-h-[220px] min-w-[220px] overflow-y-auto'}>
                {targets.map((t) => (
                  <DropdownItem
                    key={t.branch}
                    icon={
                      <Check
                        className={cn('h-3.5 w-3.5 text-primary', t.branch !== targetBranch && 'invisible')}
                      />
                    }
                    onClick={() => setPicked(t.branch)}
                  >
                    <span className={'truncate'}>{`${t.branch} · ${t.files.length}`}</span>
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          </div>
        </div>
        <div className={'min-w-0 flex-1'} />
        <Button
          onClick={handleClose}
          disabled={applying}
          className={
            'h-8 cursor-pointer rounded-lg bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 disabled:opacity-50'
          }
        >
          Cancel
        </Button>
        <Button
          className={
            'h-8 gap-1.5 font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80'
          }
          onClick={() => setConfirmOpen(true)}
          disabled={chosen.length === 0 || files === null || applying}
        >
          <ArrowRight className={'h-3.5 w-3.5'} />
          {`Move ${chosen.length} file${chosen.length === 1 ? '' : 's'}`}
        </Button>
        <button
          type={'button'}
          title={'Close'}
          onClick={handleClose}
          disabled={applying}
          className={
            'grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary disabled:opacity-50'
          }
        >
          <X className={'h-4 w-4'} />
        </button>
      </div>

      <div className={'min-h-0 flex-1 overflow-hidden'}>
        <ResizableSplit direction={'horizontal'} initialSize={26} minSize={18} maxSize={50}>
          <div className={'flex h-full w-full min-w-0 flex-col'}>
            <div
              className={
                'flex h-12 shrink-0 items-center gap-3 border-b border-text-secondary/20 px-3'
              }
            >
              <span
                className={
                  'grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary'
                }
              >
                <FileDiff className={'h-3.5 w-3.5'} />
              </span>
              <div className={'flex min-w-0 flex-1 flex-col'}>
                <span
                  className={
                    'flex items-center gap-1.5 text-[13.5px] font-semibold leading-tight text-text-primary'
                  }
                >
                  Review changes
                  {files === null && (
                    <Loader2 className={'h-3 w-3 animate-spin text-text-secondary'} />
                  )}
                </span>
                <span className={'truncate text-[12px] leading-tight text-text-secondary'}>
                  {files && files.length > 0
                    ? `${chosen.length} of ${files.length} selected`
                    : 'No changes to review'}
                </span>
              </div>
            </div>
            <div className={'flex min-h-0 flex-1 flex-col gap-2.5 px-3 pb-3 pt-3'}>
              <div
                className={
                  'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-dashed border-text-secondary/20'
                }
              >
                <div
                  className={
                    'flex h-10 shrink-0 items-center gap-2.5 border-b border-text-secondary/20 px-3'
                  }
                >
                  {files && files.length > 0 ? (
                    <>
                      <Checkbox state={allState} onClick={() => selectAll(allState !== 'all')} />
                      <span className={'text-[13.5px] font-medium text-text-primary'}>
                        {chosen.length}
                        <span className={'font-normal text-text-secondary'}>{` / ${files.length} files`}</span>
                      </span>
                      <span className={'flex-1'} />
                      <Counts added={totals.added} deleted={totals.deleted} />
                      <button
                        type={'button'}
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
                        className={
                          'grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary'
                        }
                      >
                        {collapsed.size > 0 ? (
                          <ChevronsUpDown className={'h-3.5 w-3.5'} />
                        ) : (
                          <ChevronsDownUp className={'h-3.5 w-3.5'} />
                        )}
                      </button>
                    </>
                  ) : (
                    <span className={'text-[13.5px] text-text-secondary'}>Changes</span>
                  )}
                </div>

                <div className={'flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5'}>
                  {files === null && (
                    <div className={'flex flex-1 items-center justify-center'}>
                      <Loader2 className={'h-4 w-4 animate-spin text-text-secondary'} />
                    </div>
                  )}
                  {rows.map(({ node, depth }) => {
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
                        onClick={() =>
                          node.isDir ? toggleCollapse(node.path) : setDiffPath(node.file?.path ?? null)
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
                          alt={''}
                          draggable={false}
                          className={cn('h-4 w-4 shrink-0', dim && 'opacity-40')}
                        />
                        <span
                          className={cn(
                            'min-w-0 truncate font-mono text-[13.5px]',
                            dim ? 'text-text-secondary/50' : 'text-text-primary',
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
                        <span className={'flex-1'} />
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
                <div
                  className={
                    'flex shrink-0 items-start gap-2 rounded-md border border-error/30 px-3 py-2 text-[14px] text-error'
                  }
                >
                  <AlertCircle className={'mt-px h-3.5 w-3.5 shrink-0'} />
                  <div className={'min-w-0 break-words'}>
                    <div>{error}</div>
                    {conflicts.map((c) => (
                      <div key={c} className={'truncate font-mono text-[12px]'} title={c}>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <SyncDiffPanel
            projectPath={targetPath}
            sourceRef={sourceBranch}
            sourcePath={sourceRoot}
            filePath={diffPath}
            file={(files ?? []).find((f) => f.path === diffPath) ?? null}
            paths={order}
            onNavigate={setDiffPath}
          />
        </ResizableSplit>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => !applying && setConfirmOpen(false)}
        closeOnBackdropClick={false}
        className={'max-w-[420px]'}
      >
        <ModalBody className={'px-5 py-6'}>
          <div className={'flex flex-col items-center gap-3 text-center'}>
            <div
              className={
                'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary'
              }
            >
              <ArrowRight className={'h-5 w-5'} strokeWidth={1.8} />
            </div>
            <h3 className={'text-base font-semibold leading-snug text-text-primary'}>
              {`Move ${chosen.length} file${chosen.length === 1 ? '' : 's'}?`}
            </h3>
            <p className={'max-w-[320px] text-xs leading-relaxed text-text-secondary'}>
              {`Files from ${sourceBranch} will be moved into ${targetBranch}, and ${sourceBranch} goes back to the state before these changes.`}
            </p>
          </div>
        </ModalBody>
        <ModalFooter className={'gap-0 border-t border-border p-0'}>
          <button
            type={'button'}
            onClick={() => setConfirmOpen(false)}
            disabled={applying}
            className={
              'h-[42px] flex-1 cursor-pointer border-r border-border text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-text-primary disabled:opacity-50'
            }
          >
            Cancel
          </button>
          <button
            type={'button'}
            onClick={() => void handleApply()}
            disabled={applying}
            className={
              'flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.06] disabled:opacity-50'
            }
          >
            {applying ? (
              <Loader2 className={'h-3.5 w-3.5 animate-spin'} />
            ) : (
              <ArrowRight className={'h-3.5 w-3.5'} />
            )}
            {applying ? 'Moving…' : 'Move'}
          </button>
        </ModalFooter>
      </Modal>
    </Modal>
  );
}

export default ScopeTransferModal;