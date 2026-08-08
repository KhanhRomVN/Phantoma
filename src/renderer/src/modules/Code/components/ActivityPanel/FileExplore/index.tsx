import { useState, useCallback, useEffect, useRef, memo, createContext, useContext } from 'react';
import {
  ChevronRight,
  ChevronsDownUp,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Loader,
  File,
  Folder,
  Copy,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useCodeStore, type FileNode } from '../../../hooks/useCodeStore';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import { DeleteConfirmModal } from './DeleteConfirmModal';

// ─── Helpers ────────────────────────────────────────────────────────────────
let lazyFileIdCounter = 100000;

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

const dirEntryToFileNode = (entry: DirEntry): FileNode => ({
  id: `fs_lazy_${++lazyFileIdCounter}`,
  name: entry.name,
  type: entry.isDirectory ? 'folder' : 'file',
  path: entry.path,
  children: entry.isDirectory ? [] : undefined,
});

const fetchDirChildren = async (dirPath: string): Promise<FileNode[]> => {
  try {
    const entries: DirEntry[] = await window.api.invoke('fs:list-dir', dirPath);
    if (!entries || !Array.isArray(entries)) return [];

    return entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      })
      .map(dirEntryToFileNode);
  } catch {
    return [];
  }
};

async function refreshProjectTree(projectId: string, projectPath: string) {
  const { scanDirectory } = await import('../../ProjectTabBar/OpenProjectModal');
  const { setProjectFiles } = useCodeStore.getState();
  const files = await scanDirectory(projectPath);
  setProjectFiles(projectId, files);
}

/** Tìm node theo id trong cây đệ quy */
function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Thu thập tên + path của các node được chọn */
function collectSelectedItems(
  nodes: FileNode[],
  selectedIds: Set<string>,
): { name: string; path: string; isFolder: boolean }[] {
  const result: { name: string; path: string; isFolder: boolean }[] = [];
  for (const n of nodes) {
    if (selectedIds.has(n.id)) {
      result.push({ name: n.name, path: n.path || '', isFolder: n.type === 'folder' });
    }
    if (n.children) result.push(...collectSelectedItems(n.children, selectedIds));
  }
  return result;
}

// ─── FileExplore Context ────────────────────────────────────────────────────
interface CreatingState {
  nodeId: string;
  parentPath: string;
  type: 'file' | 'folder';
}

interface FileExploreContextValue {
  creating: CreatingState | null;
  setCreating: (v: CreatingState | null) => void;
}

const FileExploreContext = createContext<FileExploreContextValue>({
  creating: null,
  setCreating: () => {},
});

// ─── InlineNewInput ─────────────────────────────────────────────────────────
interface InlineNewInputProps {
  type: 'file' | 'folder';
  parentPath: string;
  depth: number;
  onCreated: () => void;
  onCancel: () => void;
}

function InlineNewInput({ type, parentPath, depth, onCreated, onCancel }: InlineNewInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async () => {
    const name = inputRef.current?.value.trim();
    if (!name) {
      onCancel();
      return;
    }
    try {
      const fullPath = `${parentPath}/${name}`;
      if (type === 'file') {
        await window.api.invoke('fs:write-file', fullPath, '');
      } else {
        await window.api.invoke('fs:mkdir', fullPath);
      }
      onCreated();
    } catch (err) {
      console.error(`[FileExplore] Failed to create ${type}:`, err);
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 w-full py-1 pr-2"
      style={{ paddingLeft: `${8 + depth * 12 + 20}px` }}
    >
      {type === 'folder' ? (
        <Folder className="w-4 h-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
      ) : (
        <File className="w-4 h-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
      )}
      <input
        ref={inputRef}
        className="flex-1 bg-input-background text-[13px] text-text-primary outline-none border border-primary/50 rounded px-1.5 py-0.5"
        placeholder={type === 'folder' ? 'Tên thư mục...' : 'Tên file...'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleSubmit}
      />
    </div>
  );
}

// ─── TreeNode ────────────────────────────────────────────────────────────────
interface TreeNodeProps {
  node: FileNode;
  depth: number;
  projectId: string;
  selectedNodeIds: Set<string>;
  lastClickedId: string | null;
  onNodeClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  onDeleteRequest: (ids: string[]) => void;
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  projectId,
  selectedNodeIds,
  lastClickedId,
  onNodeClick,
  onDeleteRequest,
}: TreeNodeProps) {
  const openFile = useCodeStore((s) => s.openFile);
  const setActiveFileTab = useCodeStore((s) => s.setActiveFileTab);
  const toggleFolderExpand = useCodeStore((s) => s.toggleFolderExpand);
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const expandedFolderIds = project?.expandedFolderIds ?? [];
  const dirVersions = project?.dirVersions ?? {};

  const [lazyChildren, setLazyChildren] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const { creating, setCreating } = useContext(FileExploreContext);

  const isFolder = node.type === 'folder';
  const isActive = selectedNodeIds.has(node.id);
  const expanded = isFolder && expandedFolderIds.includes(node.id);

  // Watcher-driven invalidation
  const dirVersion = node.path ? (dirVersions[node.path] ?? 0) : 0;
  const dirVersionRef = useRef(dirVersion);
  useEffect(() => {
    if (dirVersion !== dirVersionRef.current) {
      dirVersionRef.current = dirVersion;
      if (expanded && lazyChildren !== null) {
        setLazyChildren(null);
      }
    }
  }, [dirVersion, expanded, lazyChildren]);

  const children = lazyChildren !== null ? lazyChildren : node.children;
  const hasChildren = children && children.length > 0;
  const canExpand = isFolder && (hasChildren || !!node.path);

  // Auto-load children
  useEffect(() => {
    if (isFolder && expanded && !hasChildren && node.path && lazyChildren === null && !loading) {
      setLoading(true);
      fetchDirChildren(node.path)
        .then((kids) => {
          setLazyChildren(kids);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[FileExplore] Failed to auto-load children:', err);
          setLoading(false);
        });
    }
  }, [isFolder, expanded, hasChildren, node.path, lazyChildren, loading, dirVersion]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onNodeClick(node.id, e.ctrlKey || e.metaKey, e.shiftKey);

      // Chỉ mở file/folder khi không có multi-select modifier
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (!isFolder) {
          openFile(projectId, node.id, node.name, node);
          setActiveFileTab(node.id);
          return;
        }

        if (expanded) {
          toggleFolderExpand(projectId, node.id);
          return;
        }

        if (!hasChildren && node.path && lazyChildren === null) {
          setLoading(true);
          toggleFolderExpand(projectId, node.id);
          fetchDirChildren(node.path).then((kids) => {
            setLazyChildren(kids);
            setLoading(false);
          });
        } else {
          toggleFolderExpand(projectId, node.id);
        }
      }
    },
    [
      isFolder,
      expanded,
      hasChildren,
      node.path,
      node.id,
      projectId,
      openFile,
      setActiveFileTab,
      toggleFolderExpand,
      lazyChildren,
      onNodeClick,
    ],
  );

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleCopyPath = useCallback(() => {
    // Copy path của tất cả selected, hoặc node hiện tại
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [node.id];
    const paths: string[] = [];
    const p = useCodeStore.getState().projects.find((pr) => pr.id === projectId);
    if (!p) return;
    for (const id of ids) {
      const found = findNodeById(p.files, id);
      if (found?.path) paths.push(found.path);
    }
    navigator.clipboard.writeText(paths.join('\n')).catch(() => {});
  }, [node.id, projectId, selectedNodeIds]);

  const handleDelete = useCallback(() => {
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [node.id];
    onDeleteRequest(ids);
  }, [node.id, selectedNodeIds, onDeleteRequest]);

  const handleRename = useCallback(async () => {
    if (!node.path) return;
    const newName = window.prompt('Tên mới:', node.name);
    if (!newName || newName === node.name) return;
    try {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;
      await window.api.invoke('fs:rename', { oldPath: node.path, newPath });
      const p = useCodeStore.getState().projects.find((pr) => pr.id === projectId);
      if (p?.path) await refreshProjectTree(projectId, p.path);
    } catch (err) {
      console.error('[FileExplore] Failed to rename:', err);
    }
  }, [node.path, node.name, projectId]);

  const handleCreateFromContext = useCallback(
    (type: 'file' | 'folder') => {
      if (!isFolder || !node.path) return;
      if (!expanded) {
        toggleFolderExpand(projectId, node.id);
      }
      setCreating({ nodeId: node.id, parentPath: node.path, type });
    },
    [isFolder, expanded, node.path, node.id, projectId, toggleFolderExpand, setCreating],
  );

  const handleCreated = useCallback(() => {
    setCreating(null);
    setLazyChildren(null);
  }, [setCreating]);

  const iconSrc = isFolder ? getFolderIconPath(node.name, expanded) : getFileIconPath(node.name);
  const fallbackIcon = isFolder ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  const isCreatingHere = creating?.nodeId === node.id;

  return (
    <div>
      <Dropdown
        open={contextMenuOpen}
        onOpenChange={setContextMenuOpen}
        trigger="contextmenu"
        className="w-full"
      >
        <DropdownTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-sm text-left transition-colors group',
              isActive
                ? 'bg-card-hover text-text-primary'
                : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {isFolder ? (
              loading ? (
                <Loader className="w-3.5 h-3.5 shrink-0 text-text-secondary animate-spin" strokeWidth={1.5} />
              ) : (
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform text-text-secondary',
                    expanded && 'rotate-90',
                    !canExpand && 'invisible',
                  )}
                  strokeWidth={1.5}
                />
              )
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}

            <img
              src={iconSrc}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src === fallbackIcon) {
                  img.style.display = 'none';
                } else {
                  img.src = fallbackIcon;
                }
              }}
            />

            <span className="truncate text-[13px]">{node.name}</span>
          </button>
        </DropdownTrigger>
        <DropdownContent className="min-w-[180px]">
          {isFolder && (
            <>
              <DropdownItem icon={<FilePlus className="w-3.5 h-3.5" />} onClick={() => handleCreateFromContext('file')}>
                New File
              </DropdownItem>
              <DropdownItem icon={<FolderPlus className="w-3.5 h-3.5" />} onClick={() => handleCreateFromContext('folder')}>
                New Folder
              </DropdownItem>
              <DropdownSeparator />
            </>
          )}
          <DropdownItem icon={<Pencil className="w-3.5 h-3.5" />} onClick={handleRename}>
            Rename
          </DropdownItem>
          <DropdownItem icon={<Copy className="w-3.5 h-3.5" />} onClick={handleCopyPath}>
            Copy Path
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleDelete} variant="error">
            Delete
          </DropdownItem>
        </DropdownContent>
      </Dropdown>

      {/* Inline create input */}
      {isCreatingHere && isFolder && (
        <InlineNewInput
          type={creating!.type}
          parentPath={creating!.parentPath}
          depth={depth + 1}
          onCreated={handleCreated}
          onCancel={() => setCreating(null)}
        />
      )}

      {/* Children */}
      {isFolder && expanded && hasChildren && (
        <div>
          {children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              projectId={projectId}
              selectedNodeIds={selectedNodeIds}
              lastClickedId={lastClickedId}
              onNodeClick={onNodeClick}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Empty folder indicator */}
      {isFolder && expanded && !hasChildren && !loading && !isCreatingHere && (
        <div
          className="text-[11px] text-text-secondary py-0.5"
          style={{ paddingLeft: `${8 + (depth + 1) * 12 + 20}px` }}
        >
          (trống)
        </div>
      )}
    </div>
  );
});

// ─── FileExplore ────────────────────────────────────────────────────────────
export function FileExplore() {
  const { projects, currentProjectId, collapseAllFolders } = useCodeStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const projectPathRef = useRef<string | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreatingState | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);

  // ── File watcher subscription ──────────────────────────────────────────────
  useEffect(() => {
    const projectPath = project?.path;
    if (!projectPath || projectPath === projectPathRef.current) return;
    projectPathRef.current = projectPath;

    window.api.invoke('fs:watch-dir', projectPath).catch((err) => {
      console.error('[FileExplore] Failed to start watcher:', err);
    });

    const handler = (_event: any, payload: { dirPath: string }) => {
      const store = useCodeStore.getState();
      if (store.currentProjectId) {
        store.invalidateDir(store.currentProjectId, payload.dirPath);
      }
    };

    window.api.on('fs:dir-changed', handler);

    return () => {
      window.api.off('fs:dir-changed', handler);
      window.api.invoke('fs:unwatch-dir', projectPath).catch(() => {});
      projectPathRef.current = null;
    };
  }, [project?.path]);

  // ── Keyboard: Delete ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeIds.size > 0) {
        e.preventDefault();
        setDeleteTargetIds(Array.from(selectedNodeIds));
        setDeleteModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds]);

  // ── Node click handler (multi-select) ─────────────────────────────────────
  const handleNodeClick = useCallback(
    (id: string, ctrlKey: boolean, shiftKey: boolean) => {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);

        if (ctrlKey || shiftKey) {
          // Ctrl+Click: toggle
          if (ctrlKey && !shiftKey) {
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            setLastClickedId(id);
            return next;
          }

          // Shift+Click: range select
          if (shiftKey && lastClickedId) {
            // Tìm siblingIds chứa cả lastClickedId và id
            if (!project) return prev;
            const findSiblings = (nodes: FileNode[], targetA: string, targetB: string): string[] | null => {
              for (const n of nodes) {
                if (n.children) {
                  const childIds = n.children.map((c) => c.id);
                  const hasA = childIds.includes(targetA);
                  const hasB = childIds.includes(targetB);
                  if (hasA && hasB) return childIds;
                  const deeper = findSiblings(n.children, targetA, targetB);
                  if (deeper) return deeper;
                }
              }
              return null;
            };
            // Root level siblings
            const rootIds = project.files.map((f) => f.id);
            const hasA = rootIds.includes(lastClickedId);
            const hasB = rootIds.includes(id);
            const siblingIds =
              hasA && hasB ? rootIds : findSiblings(project.files, lastClickedId, id);

            if (siblingIds) {
              const idxA = siblingIds.indexOf(lastClickedId);
              const idxB = siblingIds.indexOf(id);
              const [start, end] = idxA < idxB ? [idxA, idxB] : [idxB, idxA];
              for (let i = start; i <= end; i++) {
                next.add(siblingIds[i]);
              }
            } else {
              next.add(id);
            }
            return next;
          }
        }

        // No modifier: single select
        next.clear();
        next.add(id);
        setLastClickedId(id);
        return next;
      });
    },
    [lastClickedId, project],
  );

  // ── Delete action ─────────────────────────────────────────────────────────
  const handleDeleteRequest = useCallback((ids: string[]) => {
    setDeleteTargetIds(ids);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteModalOpen(false);
    if (!project) return;

    const items = collectSelectedItems(project.files, new Set(deleteTargetIds));
    let errorCount = 0;

    for (const item of items) {
      try {
        if (item.isFolder) {
          await window.api.invoke('fs:remove-dir', item.path);
        } else {
          await window.api.invoke('fs:delete-file', item.path);
        }
      } catch (err) {
        console.error(`[FileExplore] Failed to delete ${item.path}:`, err);
        errorCount++;
      }
    }

    setSelectedNodeIds(new Set());
    setLastClickedId(null);
    setDeleteTargetIds([]);
    // Watcher (fs:dir-changed) sẽ tự động cập nhật folder cha
  }, [project, deleteTargetIds]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteTargetIds([]);
  }, []);

  // ── Toolbar actions ───────────────────────────────────────────────────────
  const handleCollapseAll = useCallback(() => {
    if (currentProjectId) {
      collapseAllFolders(currentProjectId);
    }
  }, [currentProjectId, collapseAllFolders]);

  const handleRefresh = useCallback(async () => {
    if (!project?.path) return;
    await refreshProjectTree(project.id, project.path);
  }, [project]);

  const handleToolbarCreate = useCallback(
    (type: 'file' | 'folder') => {
      if (!project) return;

      // Tìm folder đang select (ưu tiên single select)
      if (selectedNodeIds.size === 1) {
        const singleId = Array.from(selectedNodeIds)[0];
        const selectedNode = findNodeById(project.files, singleId);
        if (selectedNode && selectedNode.type === 'folder' && selectedNode.path) {
          setCreating({ nodeId: selectedNode.id, parentPath: selectedNode.path, type });
          return;
        }
      }

      // Fallback: root level
      if (project.path) {
        setCreating({ nodeId: '__root__', parentPath: project.path, type });
      }
    },
    [project, selectedNodeIds],
  );

  const handleCreated = useCallback(async () => {
    setCreating(null);
    if (!project?.path) return;
    await refreshProjectTree(project.id, project.path);
  }, [project]);

  // ── Delete confirm modal items ────────────────────────────────────────────
  const deleteItems = project
    ? collectSelectedItems(project.files, new Set(deleteTargetIds)).map((i) => i.name)
    : [];

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
      <span className="text-[13px] text-text-secondary truncate max-w-[50%]" title={project?.name}>
        {project?.name || 'No project'}
      </span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={handleRefresh}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => handleToolbarCreate('folder')}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="Thư mục mới"
        >
          <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => handleToolbarCreate('file')}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="File mới"
        >
          <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleCollapseAll}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="Thu gọn tất cả"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!project || project.files.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {toolbar}
        {creating && creating.nodeId === '__root__' && (
          <InlineNewInput
            type={creating.type}
            parentPath={creating.parentPath}
            depth={0}
            onCreated={handleCreated}
            onCancel={() => setCreating(null)}
          />
        )}
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-2 p-4">
          <img
            src="/images/icon/folder-base.svg"
            alt=""
            className="w-8 h-8 opacity-40"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-xs">Chưa có file nào</span>
        </div>
      </div>
    );
  }

  return (
    <FileExploreContext.Provider value={{ creating, setCreating }}>
      <div className="flex-1 flex flex-col min-h-0">
        {toolbar}

        {/* Inline create at root */}
        {creating && creating.nodeId === '__root__' && (
          <InlineNewInput
            type={creating.type}
            parentPath={creating.parentPath}
            depth={0}
            onCreated={handleCreated}
            onCancel={() => setCreating(null)}
          />
        )}

        {/* File tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {project.files.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              projectId={project.id}
              selectedNodeIds={selectedNodeIds}
              lastClickedId={lastClickedId}
              onNodeClick={handleNodeClick}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
          <div style={{ height: '30%', minHeight: '2rem' }} />
        </div>

        {/* Delete confirm modal */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          items={deleteItems}
        />
      </div>
    </FileExploreContext.Provider>
  );
}

export default FileExplore;