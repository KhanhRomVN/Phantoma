/**
 * ------------------------------------------------------------------
 * File Explorer
 * ------------------------------------------------------------------
 * Tree-view file browser in the Activity sidebar. Renders the project
 * file tree with expandable folders, file-type icons, right-click
 * context menu (copy path, rename, delete, new file/folder), and
 * supports folder collapse-all and manual refresh.
 *
 * Main features:
 * - Recursive folder/file tree with expand/collapse
 * - File-type and folder icons via fileIconMapper
 * - Right-click context menu: Copy Path, Rename, Delete, New File, New Folder
 * - Delete confirmation modal for single/multi items
 * - Collapse all folders button
 * - Manual refresh to re-scan directory
 * - Directory version invalidation for file watcher sync
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ── UI ──
import {
  ChevronsDownUp,
  FolderPlus,
  FilePlus,
  RefreshCw,
} from 'lucide-react';

// ── Hooks ──
import { useCodeStore, type FileNode } from '../../../hooks/useCodeStore';

// ── Utils ──
// ── Components ──
import { DeleteConfirmModal } from './DeleteConfirmModal';
import TreeNode, {
  FileExploreContext,
  InlineNewInput,
  findNodeById,
  collectSelectedItems,
  refreshProjectTree,
} from '@renderer/components/common/FileTree';

// ─── FileExplore ────────────────────────────────────────────────────────────
export function FileExplore() {
  const { projects, currentProjectId, collapseAllFolders } = useCodeStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const projectPathRef = useRef<string | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ nodeId: string; parentPath: string; type: 'file' | 'folder' } | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);

  // Clipboard nội bộ cho cut/copy/paste file
  const [clipboard, setClipboard] = useState<{ paths: string[]; operation: 'copy' | 'cut' } | null>(null);

  // Double-press C detection
  const lastCKeyTimeRef = useRef<number>(0);
  const cKeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref cho clipboard để dùng trong event listener (tránh stale closure)
  const clipboardRef = useRef(clipboard);
  clipboardRef.current = clipboard;

  // Ref cho handlers để tránh dependency array thay đổi liên tục
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlersRef = useRef<any>({});

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

          // Shift+Click: range select — dùng getState() để tránh dependency project
          if (shiftKey && lastClickedId) {
            const currentProject = useCodeStore.getState().projects.find(
              (p) => p.id === useCodeStore.getState().currentProjectId,
            );
            if (!currentProject) return prev;

            const findSiblings = (
              nodes: FileNode[],
              targetA: string,
              targetB: string,
            ): string[] | null => {
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
            const rootIds = currentProject.files.map((f) => f.id);
            const hasA = rootIds.includes(lastClickedId);
            const hasB = rootIds.includes(id);
            const siblingIds =
              hasA && hasB ? rootIds : findSiblings(currentProject.files, lastClickedId, id);

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

        // No modifier: single select — skip nếu đã chọn đúng node này
        if (prev.has(id) && prev.size === 1) {
          return prev;
        }
        next.clear();
        next.add(id);
        setLastClickedId(id);
        return next;
      });
    },
    [lastClickedId],
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

  // ── Clipboard & file operations ──────────────────────────────────────────
  // Dùng getState() thay vì closure project để tránh re-render toàn bộ tree
  const getProject = () => {
    const state = useCodeStore.getState();
    return state.projects.find((p) => p.id === state.currentProjectId);
  };

  const handleCopyAbsolutePath = useCallback(() => {
    const p = getProject();
    if (!p) return;
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [];
    if (ids.length === 0) return;
    const paths: string[] = [];
    for (const id of ids) {
      const found = findNodeById(p.files, id);
      if (found?.path) paths.push(found.path);
    }
    if (paths.length > 0) {
      navigator.clipboard.writeText(paths.join('\n')).catch(() => {});
    }
  }, [selectedNodeIds]);

  const handleCopyRelativePath = useCallback(() => {
    const p = getProject();
    if (!p?.path) return;
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [];
    if (ids.length === 0) return;
    const rootPath = p.path.endsWith('/') ? p.path : p.path + '/';
    const paths: string[] = [];
    for (const id of ids) {
      const found = findNodeById(p.files, id);
      if (found?.path && found.path.startsWith(rootPath)) {
        paths.push(found.path.substring(rootPath.length));
      } else if (found?.path) {
        paths.push(found.path);
      }
    }
    if (paths.length > 0) {
      navigator.clipboard.writeText(paths.join('\n')).catch(() => {});
    }
  }, [selectedNodeIds]);

  const handleCutFile = useCallback((paths?: string[]) => {
    if (paths && paths.length > 0) {
      setClipboard({ paths, operation: 'cut' });
      return;
    }
    const p = getProject();
    if (!p) return;
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [];
    if (ids.length === 0) return;
    const resolved: string[] = [];
    for (const id of ids) {
      const found = findNodeById(p.files, id);
      if (found?.path) resolved.push(found.path);
    }
    if (resolved.length > 0) {
      setClipboard({ paths: resolved, operation: 'cut' });
    }
  }, [selectedNodeIds]);

  const handleCopyFile = useCallback((paths?: string[]) => {
    if (paths && paths.length > 0) {
      setClipboard({ paths, operation: 'copy' });
      return;
    }
    const p = getProject();
    if (!p) return;
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [];
    if (ids.length === 0) return;
    const resolved: string[] = [];
    for (const id of ids) {
      const found = findNodeById(p.files, id);
      if (found?.path) resolved.push(found.path);
    }
    if (resolved.length > 0) {
      setClipboard({ paths: resolved, operation: 'copy' });
    }
  }, [selectedNodeIds]);

  const handlePasteFile = useCallback(async () => {
    if (!clipboard) return;
    const p = getProject();
    if (!p?.path) return;

    // Xác định thư mục đích: ưu tiên folder đang được chọn, nếu không thì root
    let destDir = p.path;
    if (selectedNodeIds.size === 1) {
      const singleId = Array.from(selectedNodeIds)[0];
      const selectedNode = findNodeById(p.files, singleId);
      if (selectedNode?.type === 'folder' && selectedNode.path) {
        destDir = selectedNode.path;
      }
    }

    let errorCount = 0;
    for (const srcPath of clipboard.paths) {
      try {
        const name = srcPath.split('/').pop() || 'untitled';
        const destPath = `${destDir}/${name}`;

        if (clipboard.operation === 'cut') {
          await window.api.invoke('fs:rename', { oldPath: srcPath, newPath: destPath });
        } else {
          await window.api.invoke('fs:copy', { src: srcPath, dest: destPath });
        }
      } catch (err) {
        console.error(`[FileExplore] Failed to paste ${srcPath}:`, err);
        errorCount++;
      }
    }

    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }

    await refreshProjectTree(p.id, p.path);
  }, [clipboard, selectedNodeIds]);

  const handleRenameKeyboard = useCallback(async () => {
    if (selectedNodeIds.size !== 1) return;
    const p = getProject();
    if (!p) return;
    const id = Array.from(selectedNodeIds)[0];
    const node = findNodeById(p.files, id);
    if (!node?.path) return;
    const newName = window.prompt('Tên mới:', node.name);
    if (!newName || newName === node.name) return;
    try {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;
      await window.api.invoke('fs:rename', { oldPath: node.path, newPath });
      await refreshProjectTree(p.id, p.path);
    } catch (err) {
      console.error('[FileExplore] Failed to rename:', err);
    }
  }, [selectedNodeIds]);

  // Gán handlers vào ref sau khi tất cả đã được định nghĩa
  handlersRef.current = {
    handleCopyAbsolutePath,
    handleCopyRelativePath,
    handleCutFile,
    handleCopyFile,
    handlePasteFile,
    handleRenameKeyboard,
  };

  // ── Keyboard: shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Bỏ qua nếu đang focus vào input/textarea/contentEditable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const h = handlersRef.current;

      // Delete
      if (e.key === 'Delete' && selectedNodeIds.size > 0) {
        e.preventDefault();
        setDeleteTargetIds(Array.from(selectedNodeIds));
        setDeleteModalOpen(true);
        return;
      }

      // F2: Rename
      if (e.key === 'F2') {
        e.preventDefault();
        h.handleRenameKeyboard();
        return;
      }

      // Ctrl+Alt+C: Copy Absolute Path
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        h.handleCopyAbsolutePath();
        return;
      }

      // Ctrl+C: Copy file vào clipboard nội bộ
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        h.handleCopyFile();
        return;
      }

      // Ctrl+X: Cut file
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        h.handleCutFile();
        return;
      }

      // Ctrl+V: Paste file
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        h.handlePasteFile();
        return;
      }

      // Double-press C: Copy Relative Path
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastCKeyTimeRef.current < 300) {
          // Double press detected
          if (cKeyTimerRef.current) {
            clearTimeout(cKeyTimerRef.current);
            cKeyTimerRef.current = null;
          }
          lastCKeyTimeRef.current = 0;
          h.handleCopyRelativePath();
        } else {
          lastCKeyTimeRef.current = now;
          if (cKeyTimerRef.current) clearTimeout(cKeyTimerRef.current);
          cKeyTimerRef.current = setTimeout(() => {
            lastCKeyTimeRef.current = 0;
          }, 300);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (cKeyTimerRef.current) {
        clearTimeout(cKeyTimerRef.current);
      }
    };
  }, [selectedNodeIds]);

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

  // ── Context value ─────────────────────────────────────────────────────────
  const contextValue = useMemo(() => ({
    creating,
    setCreating,
    clipboard,
    setClipboard,
    onCopyAbsolutePath: handleCopyAbsolutePath,
    onCopyRelativePath: handleCopyRelativePath,
    onCutFile: handleCutFile,
    onCopyFile: handleCopyFile,
    onPasteFile: handlePasteFile,
  }), [creating, clipboard, handleCopyAbsolutePath, handleCopyRelativePath, handleCutFile, handleCopyFile, handlePasteFile]);

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
    <FileExploreContext.Provider value={contextValue}>
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