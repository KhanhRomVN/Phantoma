import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import type { FileSystem } from './fileStore';
import { applyFilter, applySort, listChildren, listDescendantFiles } from './fileStore';
import { KIND_LABEL, formatDate, formatSize } from './fileTypes';
import type { FileFilter, FileSort, FsNode, SortKey } from './fileTypes';
import { CheckBox, NodeIcon } from './shared';
import type { FileViewProps } from './shared';

export interface TreeRow {
  node: FsNode;
  depth: number;
}

/**
 * Builds the flat row list from folder `root`.
 * While searching/filtering: branches with matching files are listed nested, non-matching branches are hidden (like the Explorer search box).
 */
export function buildTreeRows(
  fs: FileSystem,
  root: string,
  filter: FileFilter,
  sort: FileSort
): TreeRow[] {
  const searching = !!filter.query?.trim() || !!filter.kinds?.length || !!filter.exts?.length;
  const rows: TreeRow[] = [];

  const walk = (path: string, depth: number) => {
    for (const node of applySort(listChildren(fs, path), sort)) {
      if (node.type === 'file') {
        if (applyFilter([node], filter).length > 0) rows.push({ node, depth });
        continue;
      }
      if (searching && applyFilter(listDescendantFiles(fs, node.path), filter).length === 0) continue;
      rows.push({ node, depth });
      if (searching) walk(node.path, depth + 1);
    }
  };

  walk(root, 0);
  return rows;
}

interface TreeViewProps extends FileViewProps {
  rows: TreeRow[];
  sort: FileSort;
  onSortChange: (key: SortKey) => void;
  onToggleAll: () => void;
  sortable?: boolean;
}

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'name', label: 'Name', className: 'flex-1 min-w-0' },
  { key: 'kind', label: 'Kind', className: 'w-28 shrink-0' },
  { key: 'size', label: 'Size', className: 'w-24 shrink-0 text-right' },
  { key: 'modified', label: 'Modified', className: 'w-40 shrink-0' },
];

/** Explorer-style detail list: click a folder to enter it, double-click a file to open it, only the checkbox selects. */
export default function TreeView({
  rows,
  selected,
  selectable,
  onToggle,
  onOpen,
  sort,
  onSortChange,
  onToggleAll,
  sortable = true,
}: TreeViewProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.node.id));

  return (
    <div className='text-xs'>
      <div className='sticky top-0 z-10 flex items-center gap-3 px-3 h-8 bg-card-background-hover border-b border-border text-text-secondary font-medium'>
        {selectable && <CheckBox checked={allSelected} onChange={onToggleAll} />}
        {COLUMNS.map((col) => {
          const active = sort.key === col.key;
          const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
          return (
            <button
              key={col.key}
              type='button'
              disabled={!sortable}
              onClick={() => onSortChange(col.key)}
              className={cn(
                'inline-flex items-center gap-1 transition-colors',
                col.className,
                col.key === 'size' && 'justify-end',
                sortable && 'hover:text-text-primary',
                active && 'text-text-primary'
              )}
            >
              {col.label}
              {active && <Arrow className='w-3 h-3 shrink-0 text-primary' strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className='min-h-[120px] flex items-center justify-center italic text-text-secondary'>Folder is empty.</div>
      ) : (
        rows.map(({ node, depth }) => {
          const isSelected = selected.has(node.id);
          return (
            <div
              key={node.id}
              onClick={() => node.type === 'folder' && onOpen(node)}
              onDoubleClick={() => node.type === 'file' && onOpen(node)}
              className={cn(
                'flex items-center gap-3 px-3 h-8 border-b border-border/30 select-none transition-colors',
                node.type === 'folder' ? 'cursor-pointer' : 'cursor-default',
                isSelected ? 'bg-primary/10' : 'hover:bg-card-background-hover'
              )}
            >
              {selectable && <CheckBox checked={isSelected} onChange={() => onToggle(node)} />}
              <div className='flex-1 min-w-0 flex items-center gap-1.5' style={{ paddingLeft: depth * 16 }}>
                <NodeIcon node={node} size={16} />
                <span className='truncate text-text-primary' title={node.name}>
                  {node.name}
                </span>
              </div>
              <span className='w-28 shrink-0 text-text-secondary'>{node.type === 'folder' ? 'Folder' : KIND_LABEL[node.kind]}</span>
              <span className='w-24 shrink-0 text-right tabular-nums text-text-secondary'>{node.type === 'folder' ? '—' : formatSize(node.size)}</span>
              <span className='w-40 shrink-0 tabular-nums text-text-secondary'>{node.type === 'folder' ? '—' : formatDate(node.modified)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}