/**
 * ------------------------------------------------------------------
 * FileTree
 * ------------------------------------------------------------------
 * Cây thư mục/file hiển thị trong sidebar, hỗ trợ lazy loading,
 * context menu (tạo, đổi tên, xóa, copy, paste), và multi-select.
 *
 * Main features:
 * - Hiển thị cây thư mục/file với lazy loading khi expand
 * - Context menu đầy đủ: New File/Folder, Cut, Copy, Paste, Rename, Delete
 * - Multi-select với Ctrl/Shift click
 * - Tạo file/thư mục inline ngay trong cây
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useCallback, useRef, useEffect, createContext, useContext, memo } from 'react';

// ── UI ──
import { ChevronRight, Loader, File, Folder } from 'lucide-react';
import { Kbd } from '@renderer/components/ui/Kbd';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ── Hooks ──
import { useCodeStore, type FileNode } from '@renderer/modules/Code/hooks/useCodeStore';

// ── Utils ──
import { logger } from '@renderer/utils/logger';
import { getFileIconPath, getFolderIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';

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

export async function refreshProjectTree(projectId: string, projectPath: string) {
  const { scanDirectory } =
    await import('@renderer/modules/Code/components/ProjectTabBar/OpenProjectModal');
  const { setProjectFiles } = useCodeStore.getState();
  const files = await scanDirectory(projectPath);
  setProjectFiles(projectId, files);
}

/** Tìm node theo id trong cây đệ quy */
export function findNodeById(nodes: FileNode[], id: string): FileNode | null {
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
export function collectSelectedItems(
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
  clipboard: { paths: string[]; operation: 'copy' | 'cut' } | null;
  setClipboard: (v: { paths: string[]; operation: 'copy' | 'cut' } | null) => void;
  onCopyAbsolutePath: () => void;
  onCopyRelativePath: () => void;
  onCutFile: (paths?: string[]) => void;
  onCopyFile: (paths?: string[]) => void;
  onPasteFile: () => void;
}

export const FileExploreContext = createContext<FileExploreContextValue>({
  creating: null,
  setCreating: () => {},
  clipboard: null,
  setClipboard: () => {},
  onCopyAbsolutePath: () => {},
  onCopyRelativePath: () => {},
  onCutFile: () => {},
  onCopyFile: () => {},
  onPasteFile: () => {},
});

// ─── InlineNewInput ─────────────────────────────────────────────────────────
interface InlineNewInputProps {
  type: 'file' | 'folder';
  parentPath: string;
  depth: number;
  onCreated: () => void;
  onCancel: () => void;
}

export function InlineNewInput({
  type,
  parentPath,
  depth,
  onCreated,
  onCancel,
}: InlineNewInputProps) {
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
      logger.error(`[FileExplore] Failed to create ${type}:`, err);
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

// ─── TreeNode Render Counter (DEBUG) ────────────────────────────────────────
let treeNodeRenderCount = 0;
const renderedNodeNames: string[] = [];

function bumpRenderCount(name: string) {
  treeNodeRenderCount++;
  if (renderedNodeNames.length < 10) {
    renderedNodeNames.push(name);
  }
}

function logRenderCountAndReset(_label: string) {
  setTimeout(() => {
    treeNodeRenderCount = 0;
    renderedNodeNames.length = 0;
  }, 50);
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

  // Selector tinh: chỉ chọn expanded boolean cho chính node này + dirVersion
  const isFolder = node.type === 'folder';
  const expanded = useCodeStore((s) => {
    if (!isFolder) return false;
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p ? p.expandedFolderIds.includes(node.id) : false;
  });
  const dirVersion = useCodeStore((s) => {
    if (!node.path) return 0;
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.dirVersions?.[node.path] ?? 0;
  });

  // Helper lấy project khi cần (không reactive, dùng trong event handler)
  const getProject = () => {
    const state = useCodeStore.getState();
    return state.projects.find((p) => p.id === state.currentProjectId);
  };

  const [lazyChildren, setLazyChildren] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const {
    creating,
    setCreating,
    clipboard,
    onCopyAbsolutePath,
    onCopyRelativePath,
    onCutFile,
    onCopyFile,
    onPasteFile,
  } = useContext(FileExploreContext);

  const isActive = selectedNodeIds.has(node.id);

  // Watcher-driven invalidation
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

  const expandedRef = useRef(expanded);
  const clickTimeRef = useRef<number>(0);
  useEffect(() => {
    if (expanded !== expandedRef.current) {
      expandedRef.current = expanded;
      clickTimeRef.current = 0;
    }
  }, [expanded, children?.length, node.name]);

  // Auto-load children
  useEffect(() => {
    if (isFolder && expanded && !hasChildren && node.path && lazyChildren === null && !loading) {
      setLoading(true);
      fetchDirChildren(node.path)
        .then((kids) => {
          setLazyChildren(kids);
          setLoading(false);
        })
        .catch(() => {
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
          setTimeout(() => logRenderCountAndReset(`COLLAPSE "${node.name}"`), 100);
          return;
        }

        if (!hasChildren && node.path && lazyChildren === null) {
          setLoading(true);
          toggleFolderExpand(projectId, node.id);
          setTimeout(() => logRenderCountAndReset(`EXPAND+FETCH "${node.name}"`), 100);
          fetchDirChildren(node.path).then((kids) => {
            setLazyChildren(kids);
            setLoading(false);
          });
        } else {
          toggleFolderExpand(projectId, node.id);
          setTimeout(() => logRenderCountAndReset(`EXPAND_CACHED "${node.name}"`), 100);
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
    if (selectedNodeIds.size > 0) {
      onCopyAbsolutePath();
    } else if (node.path) {
      navigator.clipboard.writeText(node.path).catch(() => {
        logger.warn('[FileTree] Failed to copy path to clipboard');
      });
    }
  }, [node.path, selectedNodeIds, onCopyAbsolutePath]);

  const handleCopyRelativePathLocal = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      onCopyRelativePath();
    } else if (node.path) {
      const p = getProject();
      if (p?.path) {
        const rootPath = p.path.endsWith('/') ? p.path : p.path + '/';
        const relative = node.path.startsWith(rootPath)
          ? node.path.substring(rootPath.length)
          : node.path;
        navigator.clipboard.writeText(relative).catch(() => {
          logger.warn('[FileTree] Failed to copy relative path to clipboard');
        });
      }
    }
  }, [node.path, selectedNodeIds, onCopyRelativePath]);

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
      logger.error('[FileExplore] Failed to rename:', err);
    }
  }, [node.path, node.name, projectId]);

  const handleCutLocal = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      onCutFile();
    } else if (node.path) {
      onCutFile([node.path]);
    }
  }, [node.path, selectedNodeIds, onCutFile]);

  const handleCopyLocal = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      onCopyFile();
    } else if (node.path) {
      onCopyFile([node.path]);
    }
  }, [node.path, selectedNodeIds, onCopyFile]);

  const handlePasteLocal = useCallback(() => {
    onPasteFile();
  }, [onPasteFile]);

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

  // DEBUG: đếm render
  bumpRenderCount(node.name);

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
                <Loader
                  className="w-3.5 h-3.5 shrink-0 text-text-secondary animate-spin"
                  strokeWidth={1.5}
                />
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
        <DropdownContent className="min-w-[200px]" size="sm">
          {isFolder && (
            <>
              <DropdownItem onClick={() => handleCreateFromContext('file')}>New File</DropdownItem>
              <DropdownItem onClick={() => handleCreateFromContext('folder')}>
                New Folder
              </DropdownItem>
              <DropdownSeparator />
            </>
          )}
          <DropdownItem onClick={handleCutLocal}>
            <span className="flex items-center justify-between w-full">
              <span>Cut</span>
              <Kbd>Ctrl+X</Kbd>
            </span>
          </DropdownItem>
          <DropdownItem onClick={handleCopyLocal}>
            <span className="flex items-center justify-between w-full">
              <span>Copy</span>
              <Kbd>Ctrl+C</Kbd>
            </span>
          </DropdownItem>
          {clipboard && (
            <DropdownItem onClick={handlePasteLocal}>
              <span className="flex items-center justify-between w-full">
                <span>Paste</span>
                <Kbd>Ctrl+V</Kbd>
              </span>
            </DropdownItem>
          )}
          <DropdownSeparator />
          <DropdownItem onClick={handleCopyPath}>
            <span className="flex items-center justify-between w-full gap-4">
              <span>Copy Path</span>
              <Kbd>Ctrl+Alt+C</Kbd>
            </span>
          </DropdownItem>
          <DropdownItem onClick={handleCopyRelativePathLocal}>
            <span className="flex items-center justify-between w-full gap-4">
              <span>Copy Relative Path</span>
              <Kbd>C+C</Kbd>
            </span>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={handleRename}>
            <span className="flex items-center justify-between w-full">
              <span>Rename</span>
              <Kbd>F2</Kbd>
            </span>
          </DropdownItem>
          <DropdownItem onClick={handleDelete} variant="error">
            <span className="flex items-center justify-between w-full">
              <span>Delete</span>
              <Kbd>Del</Kbd>
            </span>
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

export default TreeNode;
