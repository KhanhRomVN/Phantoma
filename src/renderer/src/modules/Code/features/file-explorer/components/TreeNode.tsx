import { shellIpc } from '../../../shared/ipc/shell.ipc';
import { useState, useCallback, useMemo, useRef, useEffect, useContext, memo } from 'react';
import { ChevronRight, Loader } from 'lucide-react';
import { toastService } from '@renderer/components/ui/Toast';
import { Kbd } from '@renderer/components/ui/Kbd';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import { useCodeStore, type FileNode } from '../../../shared/stores/code.store';
import {
  useBranchScopeStore,
  isInScope,
  toScopeKey,
} from '../../../shared/stores/branch-scope.store';
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { installRightClickDragCancel } from '@renderer/utils/drag-cancel';
import { cn } from '@renderer/utils/cn';
import { FolderBadges } from './FolderBadges';
import {
  useScopeBranchFilter,
  useScopeFilter,
  useScopeStats,
  useScopeStatsStore,
} from '../../../shared/stores/scope-stats.store';
import { UNSCOPED_BRANCH } from '../../../shared/components/ScopeFilterTabs';
import { NodeMeta } from '../types/file-explorer.types';
import { GHOST_PREFIX, withGhosts } from '../utils/tree-ghost.util';
import { fetchDirChildren } from '../services/file-tree.service';
import { FileExplorerContext } from './FileExplorerContext';
import { InlineNewInput } from './InlineNewInput';
import { InlineRenameInput } from './InlineRenameInput';
import { useActiveBranchName, useScopesBelow } from '../hooks/useScopesBelow';

// ─── TreeNode ────────────────────────────────────────────────────────────────
export interface TreeNodeProps {
  node: FileNode;
  depth: number;
  projectId: string;
  selectedNodeIds: Set<string>;
  lastClickedId: string | null;
  onNodeClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  onDeleteRequest: (ids: string[]) => void;
}

export const TreeNode = memo(function TreeNode({
  node,
  depth,
  projectId,
  selectedNodeIds,
  lastClickedId,
  onNodeClick,
  onDeleteRequest,
}: TreeNodeProps) {
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

  const scopesBelow = useScopesBelow(projectId, node.path, isFolder);
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
    gitStatus,
    ghostIndex,
    ignoredPaths,
    renamingId,
    setRenamingId,

    nodeMetaRef,
    errorPaths,
    onViewRemoteDiff,
    scopeBranch,
    nodeScope,
    scopeRoot,
  } = useContext(FileExplorerContext);

  const isActive = selectedNodeIds.has(node.id);
  const isRenaming = renamingId === node.id;

  const scopeFilter = useScopeFilter(projectId);
  const warnPaths = useScopeStats(projectId).warn;
  const warnBelow = useMemo(() => {
    if (!isFolder || !node.path || warnPaths.length === 0) return 0;
    const prefix = `${node.path}/`;
    let n = 0;
    for (const p of warnPaths) if (p.startsWith(prefix)) n++;
    return n;
  }, [isFolder, node.path, warnPaths]);

  const diffPaths = useScopeStats(projectId).diff;
  const diffBelow = useMemo(() => {
    if (!isFolder || !node.path || diffPaths.length === 0) return 0;
    const prefix = `${node.path}/`;
    let n = 0;
    for (const p of diffPaths) if (p.startsWith(prefix)) n++;
    return n;
  }, [isFolder, node.path, diffPaths]);

  const errPaths = useScopeStats(projectId).error;
  const errorBelow = useMemo(() => {
    if (!isFolder || !node.path || errPaths.length === 0) return 0;
    const prefix = `${node.path}/`;
    let n = 0;
    for (const p of errPaths) if (p.startsWith(prefix)) n++;
    return n;
  }, [isFolder, node.path, errPaths]);

  const setBranchScope = useBranchScopeStore((s) => s.setScope);
  const scopeRel =
    scopeRoot && node.path && node.path.startsWith(`${scopeRoot}/`)
      ? node.path.slice(scopeRoot.length + 1)
      : '';
  const scopeExact = !!scopeRel && nodeScope.includes(scopeRel);
  const scopeCovered = !!scopeRel && !scopeExact && isInScope(scopeRel, nodeScope);
  const handleAddToScope = useCallback(() => {
    if (!scopeBranch || !scopeRel) return;
    const kept = nodeScope.filter((p) => !p.startsWith(`${scopeRel}/`));
    setBranchScope(projectId, scopeBranch, [...kept, scopeRel]);
  }, [projectId, scopeBranch, scopeRel, nodeScope, setBranchScope]);
  const handleRemoveFromScope = useCallback(() => {
    if (!scopeBranch || !scopeRel) return;
    setBranchScope(
      projectId,
      scopeBranch,
      nodeScope.filter((p) => p !== scopeRel),
    );
  }, [projectId, scopeBranch, scopeRel, nodeScope, setBranchScope]);

  useEffect(() => {
    if (isActive && node.path) {
      nodeMetaRef.current.set(node.id, { path: node.path, name: node.name, isFolder });
    }
  }, [isActive, node.id, node.path, node.name, isFolder, nodeMetaRef]);

  // Watcher-driven invalidation
  const dirVersionRef = useRef(dirVersion);
  useEffect(() => {
    if (dirVersion !== dirVersionRef.current) {
      dirVersionRef.current = dirVersion;
      if (isFolder && node.path) {
        fetchDirChildren(node.path).then(setLazyChildren);
      }
    }
  }, [dirVersion, isFolder, node.path]);

  const baseChildren = lazyChildren !== null ? lazyChildren : node.children;
  const children = useMemo(
    () => (isFolder ? withGhosts(baseChildren, node.path, ghostIndex) : baseChildren),
    [isFolder, baseChildren, node.path, ghostIndex],
  );
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
    if (isFolder && expanded && node.path && lazyChildren === null && !loading) {
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
  }, [isFolder, expanded, node.path, lazyChildren, loading, dirVersion]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;
      if (isFolder && !hasModifier) {
        toggleFolderExpand(projectId, node.id);
        return;
      }
      onNodeClick(node.id, e.ctrlKey || e.metaKey, e.shiftKey);
    },
    [isFolder, node.id, node.name, projectId, toggleFolderExpand, onNodeClick],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isFolder || e.ctrlKey || e.metaKey || e.shiftKey) return;
      onNodeClick(node.id, false, false);
      if (node.id.startsWith(GHOST_PREFIX)) return;

      const sessionId = useCodeStore.getState().activeWorkspaceSessionId;
      if (sessionId && node.path) {
        useCodeStore.getState().requestOpenFile(sessionId, node.path, node.name);
      }
    },
    [isFolder, node.path, node.id, node.name, onNodeClick],
  );

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleCopyPath = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      onCopyAbsolutePath();
    } else if (node.path) {
      navigator.clipboard.writeText(node.path).then(
        () => toastService.show({ variant: 'success', title: 'Copied path', description: node.path }),
        () => toastService.show({ variant: 'error', title: 'Cannot copy path' }),
      );
    }
  }, [node.path, selectedNodeIds, onCopyAbsolutePath]);

  const handleCopyRelativePathLocal = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      onCopyRelativePath();
    } else if (node.path) {
      const p = getProject();
      if (p?.path) {
        const root = p.explorerRoot ?? p.path;
        const rootPath = root.endsWith('/') ? root : root + '/';
        const relative = node.path.startsWith(rootPath)
          ? node.path.substring(rootPath.length)
          : node.path;
        navigator.clipboard.writeText(relative).then(
          () =>
            toastService.show({
              variant: 'success',
              title: 'Copied relative path',
              description: relative,
            }),
          () => toastService.show({ variant: 'error', title: 'Cannot copy path' }),
        );
      }
    }
  }, [node.path, selectedNodeIds, onCopyRelativePath]);

  const handleDelete = useCallback(() => {
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [node.id];
    onDeleteRequest(ids);
  }, [node.id, selectedNodeIds, onDeleteRequest]);

  const handleRename = useCallback(() => {
    if (node.path) setRenamingId(node.id);
  }, [node.path, node.id, setRenamingId]);

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

  const handleOpenFolder = useCallback(async () => {
    if (!node.path) return;
    try {
      // shell:open-path is a system-level operation, keep IPC for now
      const err = await shellIpc.openPath(node.path); // Keep IPC: shell operation không thuộc code server
      if (err) {
        console.error('[FileExplorer] Cannot open folder:', err);
        toastService.show({ variant: 'error', title: 'Cannot open folder', description: String(err).split('\n')[0] });
      }
    } catch (err) {
      console.error('[FileExplorer] Failed to open folder:', err);
      toastService.show({
        variant: 'error',
        title: 'Open folder failed',
        description: String((err as Error)?.message ?? err).split('\n')[0],
      });
    }
  }, [node.path]);

  const handleCreated = useCallback(() => {
    setCreating(null);
    setLazyChildren(null);
  }, [setCreating]);

  const iconSrc = isFolder ? getFolderIconPath(node.name, expanded) : getFileIconPath(node.name);
  const fallbackIcon = isFolder ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  const isCreatingHere = creating?.nodeId === node.id;

  return (
    <div>
      {isRenaming ? (
        <InlineRenameInput
          node={node}
          depth={depth}
          projectId={projectId}
          onDone={() => setRenamingId(null)}
        />
      ) : (
        <Dropdown
          open={contextMenuOpen}
          onOpenChange={setContextMenuOpen}
          trigger="contextmenu"
          className="w-full"
        >
          <DropdownTrigger asChild>
            <button
              data-node-id={node.id}

              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              draggable={!!node.path}
              onDragStart={(e) => {
                if (!node.path) return;
                installRightClickDragCancel();
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-phantoma-mention', '1');
                const batch =
                  selectedNodeIds.has(node.id) && selectedNodeIds.size > 1
                    ? Array.from(selectedNodeIds)
                        .map((id) => nodeMetaRef.current.get(id))
                        .filter((m): m is NodeMeta => !!m)
                    : [];
                const isBatch = batch.length > 1;
                const label = isBatch ? `${batch.length} items` : node.name;
                if (!isBatch && !isFolder) {
                  e.dataTransfer.setData('application/x-phantoma-open-file', '1');
                }
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify(
                    isBatch
                      ? {
                          type: 'phantoma-batch',
                          items: batch.map((m) => ({ filePath: m.path, isFolder: m.isFolder })),
                        }
                      : {
                          type: isFolder ? 'phantoma-folder' : 'phantoma-file',
                          filePath: node.path,
                          name: node.name,
                        },
                  ),
                );
                const ghost = document.createElement('div');
                ghost.style.cssText =
                  'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;height:28px;padding:0 12px 0 8px;line-height:20px;font-size:13px;white-space:nowrap;width:max-content;background:#1f1f1f;color:#e5e5e5;';
                const ghostIcon = document.createElement('img');
                ghostIcon.src = iconSrc;
                ghostIcon.style.cssText = 'width:16px;height:16px;';
                const ghostLabel = document.createElement('span');
                ghostLabel.textContent = label;
                ghost.append(ghostIcon, ghostLabel);
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => ghost.remove(), 0);
              }}
              data-node-path={node.path}
              data-node-folder={isFolder ? '1' : '0'}
              className={cn(
                'flex items-center gap-1.5 w-full py-1 pr-2 rounded text-sm text-left transition-colors group outline-none focus:outline-none focus-visible:outline-none',
                isActive ? 'bg-card-hover' : 'hover:bg-card-hover',
                gitStatus[node.path ?? ''] === 'added'
                  ? 'text-emerald-500'
                  : gitStatus[node.path ?? ''] === 'deleted'
                    ? 'text-red-400'
                    : gitStatus[node.path ?? ''] === 'modified'
                      ? 'text-orange-400'
                      : isActive
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary',
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
                  // Debug log - có thể xóa sau khi fix
                  if (img.src === fallbackIcon) {
                    img.style.display = 'none';
                  } else {
                    img.src = fallbackIcon;
                  }
                }}
              />

              <span
                className={cn(
                  'truncate text-[13px]',
                  (gitStatus[node.path ?? ''] === 'deleted' || node.id.startsWith(GHOST_PREFIX)) &&
                    'line-through',
                  node.path &&
                    ignoredPaths.some((p) => node.path === p || node.path!.startsWith(p + '/')) &&
                    'opacity-50',
                )}
              >
                {node.name}
              </span>
              {!expanded &&
                (scopesBelow.length > 0 || errorBelow > 0 || diffBelow > 0 || warnBelow > 0) && (
                  <FolderBadges
                    scopes={scopesBelow}
                    errorCount={errorBelow}
                    diffCount={diffBelow}
                    onDiffClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('explorer:scope-transfer', { detail: { path: node.path } }),
                      )
                    }
                    warnCount={warnBelow}
                    filter={scopeFilter}
                    deleted={node.id.startsWith(GHOST_PREFIX)}
                  />
                )}
            </button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[200px]" size="sm">
            {isFolder && (
              <>
                <DropdownItem onClick={() => handleCreateFromContext('file')}>
                  New File
                </DropdownItem>
                <DropdownItem onClick={() => handleCreateFromContext('folder')}>
                  New Folder
                </DropdownItem>
                <DropdownItem onClick={handleOpenFolder}>Open Folder</DropdownItem>
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
            {!!scopeBranch && !!scopeRel && !scopeCovered && (
              <>
                {scopeExact ? (
                  <DropdownItem onClick={handleRemoveFromScope}>Remove from scope</DropdownItem>
                ) : (
                  <DropdownItem onClick={handleAddToScope}>Add to scope</DropdownItem>
                )}
                <DropdownSeparator />
              </>
            )}
            {!isFolder && !!node.path && errorPaths.has(node.path) && (
              <>
                <DropdownItem onClick={() => onViewRemoteDiff(node.path as string)}>
                  Compare with default branch
                </DropdownItem>
                <DropdownSeparator />
              </>
            )}
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
      )}

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
            <TreeNodeGate
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
        ></div>
      )}
    </div>
  );
});

export const TreeNodeGate = memo(function TreeNodeGate(props: TreeNodeProps) {
  const { node, projectId } = props;
  const filter = useScopeFilter(projectId);
  const branchFilter = useScopeBranchFilter(projectId);
  const branchFilterPaths = useBranchScopeStore((s) =>
    branchFilter ? s.scopes[toScopeKey(projectId, branchFilter)] : undefined,
  );
  const allScopes = useBranchScopeStore((s) =>
    branchFilter === UNSCOPED_BRANCH ? s.scopes : undefined,
  );
  const activeBranch = useActiveBranchName(projectId);
  const stats = useScopeStats(projectId);
  const projectRoot = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === projectId);
    return p?.explorerRoot ?? p?.path ?? '';
  });
  const hideNoDot = useScopeStatsStore((s) => s.hideNoDotByProject[projectId] ?? false);
  const visible = useMemo(() => {
    if (!filter && !hideNoDot) return true;
    if (!node.path) return false;
    const outside = [...stats.warn, ...stats.diff, ...stats.error];
    let list = !filter
      ? [...stats.primary, ...outside]
      : filter === 'outside'
        ? outside
        : stats[filter];
    if (branchFilter === UNSCOPED_BRANCH && allScopes && projectRoot) {
      const rootPrefix = `${projectRoot.replace(/\/+$/, '')}/`;
      const keyPrefix = `${projectId}::`;
      const others = Object.entries(allScopes)
        .filter(
          ([k, paths]) =>
            k.startsWith(keyPrefix) &&
            k.slice(keyPrefix.length) !== activeBranch &&
            paths.length > 0,
        )
        .map(([, paths]) => paths);
      list = stats.diff.filter(
        (p) =>
          p.startsWith(rootPrefix) && !others.some((o) => isInScope(p.slice(rootPrefix.length), o)),
      );
    } else if (branchFilterPaths && projectRoot) {
      const prefix = `${projectRoot.replace(/\/+$/, '')}/`;
      list = list.filter(
        (p) => p.startsWith(prefix) && isInScope(p.slice(prefix.length), branchFilterPaths),
      );
    }
    if (node.type !== 'folder') return list.includes(node.path);
    const prefix = `${node.path}/`;
    return list.some((p) => p.startsWith(prefix));
  }, [
    filter,
    hideNoDot,
    stats,
    branchFilter,
    branchFilterPaths,
    allScopes,
    activeBranch,
    projectId,
    projectRoot,
    node.path,
    node.type,
  ]);
  return visible ? <TreeNode {...props} /> : null;
});
