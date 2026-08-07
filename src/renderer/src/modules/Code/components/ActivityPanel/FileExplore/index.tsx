import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { ChevronRight, ChevronUp, FolderPlus, FilePlus, Loader } from 'lucide-react';
import { useCodeStore, type FileNode } from '../../../hooks/useCodeStore';
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

// ─── TreeNode ────────────────────────────────────────────────────────────────
interface TreeNodeProps {
  node: FileNode;
  depth: number;
  projectId: string;
}

const TreeNode = memo(function TreeNode({ node, depth, projectId }: TreeNodeProps) {
  const openFile = useCodeStore((s) => s.openFile);
  const setActiveFileTab = useCodeStore((s) => s.setActiveFileTab);
  const toggleFolderExpand = useCodeStore((s) => s.toggleFolderExpand);
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const activeFileTabId = project?.activeFileTabId ?? null;
  const expandedFolderIds = project?.expandedFolderIds ?? [];
  const dirVersions = project?.dirVersions ?? {};

  const [lazyChildren, setLazyChildren] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  const isFolder = node.type === 'folder';
  const isActive = activeFileTabId === node.id;
  const expanded = isFolder && expandedFolderIds.includes(node.id);

  // Watcher-driven invalidation: reset lazyChildren when dirVersion changes
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

  // Children: use lazy-loaded if available, otherwise node.children
  const children = lazyChildren !== null ? lazyChildren : node.children;
  const hasChildren = children && children.length > 0;
  // Folder can be expanded if it has children OR has a path (can lazy load)
  const canExpand = isFolder && (hasChildren || !!node.path);

  // Auto-load children if folder is expanded but has no children yet
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

  const handleClick = useCallback(async () => {
    if (!isFolder) {
      openFile(projectId, node.id, node.name, node);
      setActiveFileTab(node.id);
      return;
    }

    if (expanded) {
      toggleFolderExpand(projectId, node.id);
      return;
    }

    // Expand: if no children yet and has path, lazy load
    if (!hasChildren && node.path && lazyChildren === null) {
      setLoading(true);
      toggleFolderExpand(projectId, node.id);
      const kids = await fetchDirChildren(node.path);
      setLazyChildren(kids);
      setLoading(false);
    } else {
      toggleFolderExpand(projectId, node.id);
    }
  }, [
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
  ]);

  const iconSrc = isFolder ? getFolderIconPath(node.name, expanded) : getFileIconPath(node.name);

  const fallbackIcon = isFolder ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-sm text-left transition-colors group',
          isActive
            ? 'bg-sidebar-item-hover text-text-primary'
            : 'text-text-secondary hover:bg-sidebar-item-hover/50 hover:text-text-primary',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {/* Chevron for folders */}
        {isFolder ? (
          loading ? (
            <Loader
              className="w-3.5 h-3.5 shrink-0 text-text-secondary/40 animate-spin"
              strokeWidth={1.5}
            />
          ) : (
            <ChevronRight
              className={cn(
                'w-3.5 h-3.5 shrink-0 transition-transform',
                isActive ? 'text-text-primary' : 'text-text-secondary',
                expanded && 'rotate-90',
                !canExpand && 'invisible',
              )}
              strokeWidth={1.5}
            />
          )
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}

        {/* Icon */}
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

        {/* Name */}
        <span className="truncate text-[13px]">{node.name}</span>
      </button>

      {/* Children */}
      {isFolder && expanded && hasChildren && (
        <div>
          {children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} projectId={projectId} />
          ))}
        </div>
      )}

      {/* Empty folder indicator */}
      {isFolder && expanded && !hasChildren && !loading && (
        <div
          className="text-[11px] text-text-secondary/30 py-0.5"
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
  const { projects, currentProjectId, collapseAllFolders, invalidateDir } = useCodeStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const projectPathRef = useRef<string | null>(null);

  // ── File watcher subscription ──────────────────────────────────────────────
  useEffect(() => {
    const projectPath = project?.path;
    if (!projectPath || projectPath === projectPathRef.current) return;
    projectPathRef.current = projectPath;

    // Start watching
    window.api.invoke('fs:watch-dir', projectPath).catch((err) => {
      console.error('[FileExplore] Failed to start watcher:', err);
    });

    const handler = (_event: any, payload: { dirPath: string }) => {
      if (currentProjectId) {
        invalidateDir(currentProjectId, payload.dirPath);
      }
    };

    window.api.on('fs:dir-changed', handler);

    return () => {
      window.api.off('fs:dir-changed', handler);
      window.api.invoke('fs:unwatch-dir', projectPath).catch(() => {});
      projectPathRef.current = null;
    };
  }, [project?.path, currentProjectId, invalidateDir]);

  const handleCollapseAll = useCallback(() => {
    if (currentProjectId) {
      collapseAllFolders(currentProjectId);
    }
  }, [currentProjectId, collapseAllFolders]);

  const handleNewFile = useCallback(async () => {
    if (!project?.path) return;
    const name = window.prompt('Tên file mới:');
    if (!name) return;
    try {
      const targetDir = project.path; // tạo ở gốc project — upgrade path: cho phép chọn thư mục cha
      const filePath = `${targetDir}/${name}`;
      await window.api.invoke('fs:write-file', filePath, '');
      // Refresh file tree — watcher will also trigger a targeted reload,
      // but a full rescan ensures the root-level tree stays correct.
      const { setProjectFiles } = useCodeStore.getState();
      const { scanDirectory } = await import('../../ProjectTabBar/OpenProjectModal');
      const files = await scanDirectory(project.path);
      setProjectFiles(project.id, files);
    } catch (err) {
      console.error('[FileExplore] Failed to create file:', err);
    }
  }, [project]);

  const handleNewFolder = useCallback(async () => {
    if (!project?.path) return;
    const name = window.prompt('Tên thư mục mới:');
    if (!name) return;
    try {
      const targetDir = project.path;
      const folderPath = `${targetDir}/${name}`;
      await window.api.invoke('fs:mkdir', folderPath);
      // Refresh file tree
      const { scanDirectory } = await import('../../ProjectTabBar/OpenProjectModal');
      const { setProjectFiles } = useCodeStore.getState();
      const files = await scanDirectory(project.path);
      setProjectFiles(project.id, files);
    } catch (err) {
      console.error('[FileExplore] Failed to create folder:', err);
    }
  }, [project]);

  if (!project || project.files.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar — vẫn hiển thị ngay cả khi chưa có file */}
        <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
          <span className="text-[11px] text-text-secondary truncate max-w-[60%]">
            {project?.name || 'No project'}
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleCollapseAll}
              className="p-1 rounded text-text-secondary/50 hover:text-text-secondary hover:bg-sidebar-item-hover/50 transition-colors"
              title="Thu gọn tất cả"
            >
              <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleNewFolder}
              className="p-1 rounded text-text-secondary/50 hover:text-text-secondary hover:bg-sidebar-item-hover/50 transition-colors"
              title="Thư mục mới"
            >
              <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleNewFile}
              className="p-1 rounded text-text-secondary/50 hover:text-text-secondary hover:bg-sidebar-item-hover/50 transition-colors"
              title="File mới"
            >
              <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary/40 gap-2 p-4">
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[11px] text-text-secondary truncate max-w-[60%]" title={project.name}>
          {project.name}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleCollapseAll}
            className="p-1 rounded text-text-secondary/50 hover:text-text-secondary hover:bg-sidebar-item-hover/50 transition-colors"
            title="Thu gọn tất cả"
          >
            <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleNewFolder}
            className="p-1 rounded text-text-secondary/50 hover:text-text-secondary hover:bg-sidebar-item-hover/50 transition-colors"
            title="Thư mục mới"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleNewFile}
            className="p-1 rounded text-text-secondary/50 hover:text-text-secondary hover:bg-sidebar-item-hover/50 transition-colors"
            title="File mới"
          >
            <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {project.files.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} projectId={project.id} />
        ))}
      </div>
    </div>
  );
}

export default FileExplore;
