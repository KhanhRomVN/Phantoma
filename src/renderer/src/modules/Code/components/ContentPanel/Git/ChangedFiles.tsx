/**
 * ------------------------------------------------------------------
 * Changed Files
 * ------------------------------------------------------------------
 * File list of a commit in two layouts: flat "path" list or folder
 * "tree". Icons come from fileIconMapper (getFileIconPath /
 * getFolderIconPath). Stats are a green +N and a red -N. Clicking a
 * file calls onSelect so the parent can open its diff.
 * ------------------------------------------------------------------
 */

import { createContext, memo, useContext, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Minus, Plus, Undo2 } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { fileKind, splitPath, type CommitFile, type FileChangeKind } from './graph';

export type FilesView = 'path' | 'tree';

interface TreeNode {
  name: string;
  path: string;
  folders: Map<string, TreeNode>;
  files: CommitFile[];
}

const makeNode = (name: string, path: string): TreeNode => ({
  name,
  path,
  folders: new Map(),
  files: [],
});

function buildTree(files: CommitFile[]): TreeNode {
  const root = makeNode('', '');
  files.forEach((f) => {
    const parts = f.path.split('/');
    let node = root;
    parts.slice(0, -1).forEach((part, i) => {
      let next = node.folders.get(part);
      if (!next) {
        next = makeNode(part, parts.slice(0, i + 1).join('/'));
        node.folders.set(part, next);
      }
      node = next;
    });
    node.files.push(f);
  });
  return root;
}

/** Merge chains of single-child folders into one row (a/b/c). */
function compact(node: TreeNode): { label: string; node: TreeNode } {
  let label = node.name;
  let cur = node;
  while (cur.files.length === 0 && cur.folders.size === 1) {
    const only = [...cur.folders.values()][0];
    label = `${label}/${only.name}`;
    cur = only;
  }
  return { label, node: cur };
}


interface FileRowProps {
  file: CommitFile;
  depth: number;
  showDir: boolean;
  selected: boolean;
  onSelect?: (path: string) => void;
}

export interface FileActions {
  onStage?: (file: CommitFile) => void;
  onUnstage?: (file: CommitFile) => void;
  onDiscard?: (file: CommitFile) => void;
}

const ActionsContext = createContext<FileActions>({});

function ActionButton({
  title,
  onClick,
  danger = false,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-5 h-5 rounded flex items-center justify-center text-text-secondary transition-colors cursor-pointer',
        danger ? 'hover:bg-red/15 hover:text-red' : 'hover:bg-card-background hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

const KIND_MARK: Record<FileChangeKind, { mark: string; title: string; className: string }> = {
  added: { mark: '+', title: 'Created', className: 'text-green' },
  modified: { mark: '~', title: 'Modified', className: 'text-amber-400' },
  deleted: { mark: '-', title: 'Deleted', className: 'text-red' },
};

function FileRow({ file, depth, showDir, selected, onSelect }: FileRowProps) {
  const { name, dir } = splitPath(file.path);
  const actions = useContext(ActionsContext);
  const kindId = fileKind(file);
  const kind = KIND_MARK[kindId];
  const canStage = !!actions.onStage && !!file.unstaged;
  const canUnstage = !!actions.onUnstage && !!file.staged;
  const canDiscard = !!actions.onDiscard && (!!file.unstaged || !!file.staged);
  const hasActions = canStage || canUnstage || canDiscard;
  return (
    <div
      title={file.path}
      onClick={() => onSelect?.(file.path)}
      style={{ paddingLeft: 12 + depth * 14 }}
      className={cn(
        'group flex items-center gap-2 pr-4 h-[28px] transition-colors',
        onSelect && 'cursor-pointer',
        selected ? 'bg-primary/15' : 'hover:bg-card-hover',
      )}
    >
      <img src={getFileIconPath(name)} alt={''} className={'w-4 h-4 shrink-0'} />
      <span
        className={cn(
          'text-[12px] truncate shrink-0 max-w-[65%]',
          kindId === 'deleted' ? 'text-text-secondary line-through' : 'text-text-primary',
        )}
      >
        {name}
      </span>
      <span
        title={kind.title}
        className={cn('shrink-0 font-mono text-[12px] font-semibold leading-none', kind.className)}
      >
        {`(${kind.mark})`}
      </span>
      {showDir ? (
        <span className={'flex-1 min-w-0 truncate text-[10.5px] text-text-secondary/50'}>{dir}</span>
      ) : (
        <span className={'flex-1'} />
      )}
      {file.staged && (
        <span title={'Staged'} className={'shrink-0 text-[9px] font-semibold px-1 rounded bg-green/15 text-green'}>
          S
        </span>
      )}

      {hasActions && (
        <span className={'hidden group-hover:flex items-center gap-0.5 shrink-0'}>
          {canDiscard && (
            <ActionButton title={'Discard changes'} danger onClick={() => actions.onDiscard?.(file)}>
              <Undo2 className={'w-3 h-3'} />
            </ActionButton>
          )}
          {canUnstage && (
            <ActionButton title={'Unstage change'} onClick={() => actions.onUnstage?.(file)}>
              <Minus className={'w-3 h-3'} />
            </ActionButton>
          )}
          {canStage && (
            <ActionButton title={'Stage change'} onClick={() => actions.onStage?.(file)}>
              <Plus className={'w-3 h-3'} />
            </ActionButton>
          )}
        </span>
      )}
    </div>
  );
}

interface BranchProps {
  node: TreeNode;
  depth: number;
  closed: Set<string>;
  toggle: (path: string) => void;
  selectedPath: string | null;
  onSelect?: (path: string) => void;
}

function TreeLevel({ node, depth, closed, toggle, selectedPath, onSelect }: BranchProps) {
  const folders = [...node.folders.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));
  return (
    <>
      {folders.map((f) => {
        const { label, node: leaf } = compact(f);
        const isOpen = !closed.has(leaf.path);
        return (
          <div key={leaf.path}>
            <div
              onClick={() => toggle(leaf.path)}
              style={{ paddingLeft: 6 + depth * 14 }}
              className={'flex items-center gap-1.5 pr-4 h-[28px] cursor-pointer hover:bg-card-hover transition-colors'}
            >
              {isOpen ? (
                <ChevronDown className={'w-3 h-3 shrink-0 text-text-secondary/60'} />
              ) : (
                <ChevronRight className={'w-3 h-3 shrink-0 text-text-secondary/60'} />
              )}
              <img src={getFolderIconPath(leaf.name, isOpen)} alt={''} className={'w-4 h-4 shrink-0'} />
              <span className={'flex-1 min-w-0 truncate text-[12px] text-text-primary'}>{label}</span>
            </div>
            {isOpen && (
              <TreeLevel
                node={leaf}
                depth={depth + 1}
                closed={closed}
                toggle={toggle}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            )}
          </div>
        );
      })}
      {files.map((f) => (
        <FileRow
          key={f.path}
          file={f}
          depth={depth + 1}
          showDir={false}
          selected={f.path === selectedPath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

interface ChangedFilesProps {
  files: CommitFile[];
  view: FilesView;
  selectedPath?: string | null;
  onSelect?: (path: string) => void;
  actions?: FileActions;
}

export const ChangedFiles = memo(function ChangedFiles({ actions = {}, ...rest }: ChangedFilesProps) {
  return (
    <ActionsContext.Provider value={actions}>
      <ChangedFilesBody {...rest} />
    </ActionsContext.Provider>
  );
});

const ChangedFilesBody = memo(function ChangedFilesBody({
  files,
  view,
  selectedPath = null,
  onSelect,
}: Omit<ChangedFilesProps, 'actions'>) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const root = useMemo(() => buildTree(files), [files]);

  const toggle = (path: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (files.length === 0) {
    return <div className={'py-6 text-center text-[11.5px] text-text-secondary/40'}>No files</div>;
  }

  if (view === 'tree') {
    return (
      <TreeLevel node={root} depth={0} closed={closed} toggle={toggle} selectedPath={selectedPath} onSelect={onSelect} />
    );
  }

  return (
    <>
      {files.map((f) => (
        <FileRow
          key={f.path}
          file={f}
          depth={0}
          showDir
          selected={f.path === selectedPath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
});