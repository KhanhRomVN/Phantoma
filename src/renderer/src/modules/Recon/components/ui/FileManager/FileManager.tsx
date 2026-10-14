import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { ChevronRight, Download, FolderTree, LayoutGrid, Search, X } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@renderer/components/ui/Dropdown';
import {
  DEFAULT_FEATURES,
  KIND_LABEL,
  KIND_ORDER,
} from './fileTypes';
import type { FileFilter, FileKind, FileManagerConfig, FileNode, FileSort, FileView, FsNode, SortKey } from './fileTypes';
import { applyFilter, applySort, downloadFile, getBreadcrumbs, getFileSystem, listChildren, listDescendantFiles } from './fileStore';
import GridView from './GridView';
import TreeView, { buildTreeRows } from './TreeView';
import FileViewer from './FileViewer';
import { KIND_META } from './shared';

export interface FileManagerProps {
  /** Nothing passed = show everything, all features enabled, grid view. */
  config?: FileManagerConfig;
  className?: string;
}

const VIEW_OPTIONS: { key: FileView; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'tree', label: 'Tree', icon: FolderTree },
];

const SORT_LABEL: Record<SortKey, string> = {
  name: 'Name',
  kind: 'Kind',
  size: 'Size',
  modified: 'Modified',
};

const ICON_BTN =
  'h-7 rounded-md flex items-center justify-center gap-1.5 px-2 text-xs transition-colors text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover';

export default function FileManager({ config, className }: FileManagerProps) {
  const features = useMemo(() => ({ ...DEFAULT_FEATURES, ...config?.features }), [config?.features]);
  const fs = useMemo(() => getFileSystem(config?.mockFolder ?? 'mock1'), [config?.mockFolder]);
  const root = config?.root ?? '';

  const [path, setPath] = useState(root);
  const [view, setView] = useState<FileView>(config?.view ?? 'grid');
  const [sort, setSort] = useState<FileSort>(config?.sort ?? { key: 'name', dir: 'asc' });
  const [query, setQuery] = useState(config?.filter?.query ?? '');
  const [kinds, setKinds] = useState<FileKind[]>(config?.filter?.kinds ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<FileNode | null>(null);

  const filter: FileFilter = useMemo(
    () => ({ ...config?.filter, query: features.search ? query : config?.filter?.query, kinds: features.filter ? kinds : config?.filter?.kinds }),
    [config?.filter, features.search, features.filter, query, kinds]
  );

  // With a query or kind filter, grid searches all sub levels, otherwise only direct children are listed
  const searching = !!filter.query?.trim() || !!filter.kinds?.length || !!filter.exts?.length;

  // Tree view: rows being displayed (search, filter and sort already applied)
  const treeRows = useMemo(
    () => (view === 'tree' ? buildTreeRows(fs, path, filter, sort) : []),
    [view, fs, path, filter, sort]
  );

  const nodes: FsNode[] = useMemo(() => {
    if (view === 'tree') return treeRows.map((r) => r.node);
    const base = searching ? listDescendantFiles(fs, path) : listChildren(fs, path);
    return applySort(applyFilter(base, filter), sort);
  }, [view, treeRows, fs, path, filter, sort, searching]);

  const clearSelection = () => {
    setSelected(new Set());
    setAnchorId(null);
  };

  const navigate = (next: string) => {
    setPath(next);
    clearSelection();
    setViewing(null);
  };

  const handleOpen = (node: FsNode) => {
    if (node.type === 'folder') navigate(node.path);
    else if (features.preview) setViewing(node);
  };

  const handleToggle = (node: FsNode) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    setAnchorId(node.id);
  };

  const handleClickNode = (node: FsNode, e: MouseEvent) => {
    if (!features.multiSelect) {
      setSelected(new Set([node.id]));
      return;
    }
    if (e.shiftKey && anchorId) {
      const a = nodes.findIndex((n) => n.id === anchorId);
      const b = nodes.findIndex((n) => n.id === node.id);
      if (a !== -1 && b !== -1) {
        const [from, to] = a < b ? [a, b] : [b, a];
        setSelected(new Set(nodes.slice(from, to + 1).map((n) => n.id)));
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      handleToggle(node);
      return;
    }
    setSelected(new Set([node.id]));
    setAnchorId(node.id);
  };

  const handleToggleAll = () => {
    setSelected((prev) => (nodes.length > 0 && nodes.every((n) => prev.has(n.id)) ? new Set() : new Set(nodes.map((n) => n.id))));
  };

  const handleSortChange = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const toggleKind = (kind: FileKind) => {
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  };

  // Batch: download every selected file (folders are skipped)
  const selectedFiles = nodes.filter((n): n is FileNode => n.type === 'file' && selected.has(n.id));
  const handleBatchDownload = () => selectedFiles.forEach(downloadFile);

  const crumbs = getBreadcrumbs(path);
  const rootDepth = getBreadcrumbs(root).length;
  const visibleCrumbs = crumbs.slice(rootDepth);

  const listProps = {
    nodes,
    selected,
    selectable: features.multiSelect,
    onClickNode: handleClickNode,
    onToggle: handleToggle,
    onOpen: handleOpen,
  };

  return (
    <div className={cn('flex h-full w-full min-h-0 bg-card-background text-text-primary relative', className)}>
      <div className='flex-1 min-w-0 flex flex-col relative'>
        {/* Toolbar */}
        <div className='shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap'>
          {features.breadcrumb && (
            <nav className='flex items-center gap-1 min-w-0 text-xs text-text-secondary'>
              <button type='button' onClick={() => navigate(root)} className='hover:text-text-primary transition-colors'>
                {root ? root.split('/').pop() : 'All files'}
              </button>
              {visibleCrumbs.map((c) => (
                <span key={c.path} className='flex items-center gap-1 min-w-0'>
                  <ChevronRight className='w-3 h-3 shrink-0 opacity-50' />
                  <button type='button' onClick={() => navigate(c.path)} className='truncate hover:text-text-primary transition-colors'>
                    {c.name}
                  </button>
                </span>
              ))}
            </nav>
          )}

          <div className='flex-1' />

          {features.search && (
            <div className='relative'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none' strokeWidth={1.5} />
              <input
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search files...'
                className='w-44 h-7 bg-input-background border border-input-border-default rounded-md pl-8 pr-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-primary/50 outline-none transition-colors'
              />
            </div>
          )}

          {features.filter && (
            <Dropdown strategy='fixed' align='end' width={200}>
              <DropdownTrigger asChild>
                <button type='button' className={cn(ICON_BTN, kinds.length > 0 && 'text-primary')} title='Filter by kind'>
                  Kind{kinds.length > 0 && ` (${kinds.length})`}
                </button>
              </DropdownTrigger>
              <DropdownContent className='max-h-72 overflow-y-auto gap-1'>
                {KIND_ORDER.map((k) => {
                  const Icon = KIND_META[k].icon;
                  return (
                    <DropdownItem
                      key={k}
                      icon={<Icon className='w-3.5 h-3.5' strokeWidth={2} style={{ color: KIND_META[k].color }} />}
                      onClick={() => toggleKind(k)}
                      className={cn(kinds.includes(k) && 'bg-primary/10')}
                    >
                      <span className='flex-1 truncate'>{KIND_LABEL[k]}</span>
                    </DropdownItem>
                  );
                })}
              </DropdownContent>
            </Dropdown>
          )}

          {features.sort && (
            <Dropdown strategy='fixed' align='end' width={180}>
              <DropdownTrigger asChild>
                <button type='button' className={ICON_BTN} title='Sort'>
                  {SORT_LABEL[sort.key]} {sort.dir === 'asc' ? '↑' : '↓'}
                </button>
              </DropdownTrigger>
              <DropdownContent className='gap-1'>
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <DropdownItem key={k} onClick={() => handleSortChange(k)} className={cn(sort.key === k && 'bg-primary/10')}>
                    <span className='flex-1'>{SORT_LABEL[k]}</span>
                    {sort.key === k && <span className='text-[10px] text-text-secondary'>{sort.dir === 'asc' ? 'Asc' : 'Desc'}</span>}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          )}

          {features.viewSwitch && (
            <div className='flex items-center rounded-md border border-border overflow-hidden'>
              {VIEW_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type='button'
                  title={label}
                  onClick={() => setView(key)}
                  className={cn('w-7 h-7 flex items-center justify-center transition-colors', view === key ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover')}
                >
                  <Icon className='w-3.5 h-3.5' strokeWidth={1.75} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Batch bar: only visible when something is selected */}
        {features.multiSelect && selected.size > 0 && (
          <div className='shrink-0 flex items-center gap-2 px-3 h-9 bg-primary/10 border-b border-primary/30 text-xs'>
            <span className='text-text-primary font-medium'>Selected {selected.size}</span>
            <div className='flex-1' />
            {features.download && (
              <button type='button' disabled={selectedFiles.length === 0} onClick={handleBatchDownload} className={cn(ICON_BTN, 'disabled:opacity-30 disabled:cursor-default')}>
                <Download className='w-3.5 h-3.5' strokeWidth={1.75} />
                Download ({selectedFiles.length})
              </button>
            )}
            <button type='button' onClick={clearSelection} className={ICON_BTN} title='Clear selection'>
              <X className='w-3.5 h-3.5' strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* List */}
        <div className='flex-1 min-h-0 overflow-y-auto'>
          {view === 'tree' ? (
            <TreeView
              {...listProps}
              rows={treeRows}
              sort={sort}
              onSortChange={handleSortChange}
              onToggleAll={handleToggleAll}
              sortable={features.sort}
            />
          ) : (
            <GridView {...listProps} />
          )}
        </div>

        {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} canDownload={features.download} />}
      </div>
    </div>
  );
}