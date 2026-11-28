import { watchIpc } from '../../../shared/ipc/watch.ipc';
// ─── Imports ────────────────────────────────────────────────────────────

// ── React ──
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ── UI ──
import {
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Folder,
} from 'lucide-react';

// ── Hooks ──
import { useCodeStore, type FileNode } from '../../../shared/stores/code.store';
import {
  useBranchScope,
  useBranchScopeStore,
  isInScope,
} from '../../../shared/stores/branch-scope.store';
import { codeApi } from '../../../shared/api/code.api';

// ── Utils ──

// ── Components ──
import { ConfirmDeleteFileModal } from './modals/ConfirmDeleteFileModal';
import { RemoteDiffModal } from './modals/RemoteDiffModal';
import { ScopeTransferModal, type ScopeTransferTarget } from './modals/ScopeTransferModal';
import { ScopeHelpModal } from './modals/ScopeHelpModal';
import { HelpCircle } from 'lucide-react';
import { toastService } from '@renderer/components/ui/Toast';

import { ExplorerSearchBar, ExplorerSearchResults } from './ExplorerSearch';
import { ScopeWarnBell } from './ScopeWarnBell';
import { useScopeStats, useScopeStatsStore } from '../../../shared/stores/scope-stats.store';

import { GitFileStatus, GhostIndex, CreatingState, NodeMeta } from '../types/file-explorer.types';

import { gitStatusCache, ignoredPathsCache, lazyNodeRegistry } from '../services/file-tree.cache';
import { withGhosts } from '../utils/tree-ghost.util';

import {
  refreshProjectTree,
  findNodeById,
  collectSelectedItems,
} from '../services/file-tree.service';
import { useTreeScanning } from '../hooks/useTreeScanning';
import { FileExplorerContext } from './FileExplorerContext';
import { InlineNewInput } from './InlineNewInput';
import { SelectionBlocks } from './ScopeGutter';
import { ScopeBlocks } from './ScopeBlocks';

import { TreeNodeGate } from './TreeNode';
export function FileExplorer() {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const expandFolders = useCodeStore((s) => s.expandFolders);
  const collapseAllFolders = useCodeStore((s) => s.collapseAllFolders);

  // ── Scope: nạp scope mới từ server khi đổi project/branch ──
  const activeBranchName = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === s.currentProjectId);
    return (
      p?.branches?.find((b) => b.sessions.some((ss) => ss.id === s.activeWorkspaceSessionId))
        ?.name ?? ''
    );
  });
  useEffect(() => {
    if (currentProjectId) void useBranchScopeStore.getState().refreshFromServer(currentProjectId);
  }, [currentProjectId, activeBranchName]);

  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{ paths: string[]; operation: 'copy' | 'cut' } | null>(
    null,
  );
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [errorPaths, setErrorPaths] = useState<Set<string>>(new Set());
  const [viewRemoteDiffPath, setViewRemoteDiffPath] = useState<string | null>(null);
  const handleViewRemoteDiff = useCallback((path: string) => setViewRemoteDiffPath(path), []);
  const nodeMetaRef = useRef<Map<string, NodeMeta>>(new Map());

  // Double-press C detection
  const lastCKeyTimeRef = useRef<number>(0);
  const cKeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref cho clipboard để dùng trong event listener (tránh stale closure)
  const clipboardRef = useRef(clipboard);
  clipboardRef.current = clipboard;

  // Ref cho handlers để tránh dependency array thay đổi liên tục
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlersRef = useRef<any>({});
  const projectPathRef = useRef<string | null>(null);

  // ── File watcher subscription ──────────────────────────────────────────────
  useEffect(() => {
    const projectPath = project?.explorerRoot ?? project?.path;
    if (!projectPath || projectPath === projectPathRef.current) return;
    projectPathRef.current = projectPath;

    // fs:watch-dir is a file system watcher, keep IPC for now (needs main process file watcher)
    watchIpc.watchDir(projectPath).catch((err) => {
      console.error('[FileExplorer] Failed to start watcher:', err);
    });

    const normalize = (p: string) => p.replace(/\/+$/, '');
    const normalizedRoot = normalize(projectPath);

    const pendingDirs = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      flushTimer = undefined;
      const store = useCodeStore.getState();
      const id = store.currentProjectId;
      if (!id) return;
      let rootChanged = false;
      pendingDirs.forEach((dir) => {
        store.invalidateDir(id, dir);
        if (normalize(dir) === normalizedRoot) rootChanged = true;
      });
      pendingDirs.clear();
      if (rootChanged) void refreshProjectTree(id, projectPath);
    };
    const handler = (_event: any, payload: { dirPath: string }) => {
      pendingDirs.add(payload.dirPath);
      if (!flushTimer) flushTimer = setTimeout(flush, 200);
    };

    const offDirChanged = watchIpc.onDirChanged(handler);

    return () => {
      clearTimeout(flushTimer);
      offDirChanged();
      watchIpc.unwatchDir(projectPath).catch(() => {});
      projectPathRef.current = null;
    };
  }, [project?.explorerRoot, project?.path]);

  const lastRootKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${project?.id}|${project?.explorerRoot ?? ''}`;
    const prev = lastRootKeyRef.current;
    lastRootKeyRef.current = key;
    if (!project) return;
    const root = project.explorerRoot ?? project.path;
    if (!root || (prev === null ? !project.explorerRoot : prev === key)) return;
    void refreshProjectTree(project.id, root);
  }, [project?.id, project?.explorerRoot]);

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
            const currentProject = useCodeStore
              .getState()
              .projects.find((p) => p.id === useCodeStore.getState().currentProjectId);
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
          await codeApi.fs.removeDir(item.path);
        } else {
          await codeApi.fs.deleteFile(item.path);
        }
      } catch (err) {
        console.error(`[FileExplorer] Failed to delete ${item.path}:`, err);
        errorCount++;
      }
    }

    setSelectedNodeIds(new Set());
    setLastClickedId(null);
    setDeleteTargetIds([]);
    toastService.show(
      errorCount > 0
        ? {
            variant: 'error',
            title: 'Delete failed',
            description: `${errorCount} of ${items.length} item${items.length === 1 ? '' : 's'} could not be deleted`,
          }
        : {
            variant: 'success',
            title: 'Deleted',
            description: `${items.length} item${items.length === 1 ? '' : 's'}`,
          },
    );
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
      navigator.clipboard.writeText(paths.join('\n')).then(
        () =>
          toastService.show({
            variant: 'success',
            title: 'Copied path',
            description: paths.length === 1 ? paths[0] : `${paths.length} paths`,
          }),
        () => toastService.show({ variant: 'error', title: 'Cannot copy path' }),
      );
    }
  }, [selectedNodeIds]);

  const handleCopyRelativePath = useCallback(() => {
    const p = getProject();
    if (!p?.path) return;
    const ids = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds) : [];
    if (ids.length === 0) return;
    const root = p.explorerRoot ?? p.path;
    const rootPath = root.endsWith('/') ? root : root + '/';
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
      navigator.clipboard
        .writeText(paths.join('\n'))
        .then(
          () =>
            toastService.show({
              variant: 'success',
              title: 'Copied relative path',
              description: paths.length === 1 ? paths[0] : `${paths.length} paths`,
            }),
          () => toastService.show({ variant: 'error', title: 'Cannot copy path' }),
        );
    }
  }, [selectedNodeIds]);

  const handleCutFile = useCallback(
    (paths?: string[]) => {
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
    },
    [selectedNodeIds],
  );

  const handleCopyFile = useCallback(
    (paths?: string[]) => {
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
    },
    [selectedNodeIds],
  );

  const handlePasteFile = useCallback(async () => {
    if (!clipboard) return;
    const p = getProject();
    if (!p?.path) return;

    // Xác định thư mục đích: ưu tiên folder đang được chọn, nếu không thì root
    let destDir = p.explorerRoot ?? p.path;
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
          await codeApi.fs.rename(srcPath, destPath);
        } else {
          await codeApi.fs.copy(srcPath, destPath);
        }
      } catch (err) {
        console.error(`[FileExplorer] Failed to paste ${srcPath}:`, err);
        errorCount++;
      }
    }

    const total = clipboard.paths.length;
    toastService.show(
      errorCount > 0
        ? {
            variant: 'error',
            title: clipboard.operation === 'cut' ? 'Move failed' : 'Paste failed',
            description: `${errorCount} of ${total} item${total === 1 ? '' : 's'} failed`,
          }
        : {
            variant: 'success',
            title: clipboard.operation === 'cut' ? 'Moved' : 'Pasted',
            description: `${total} item${total === 1 ? '' : 's'}`,
          },
    );

    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }

    await refreshProjectTree(p.id, p.explorerRoot ?? p.path);
  }, [clipboard, selectedNodeIds]);

  const handleRenameKeyboard = useCallback(() => {
    if (selectedNodeIds.size !== 1) return;
    const p = getProject();
    if (!p) return;
    const id = Array.from(selectedNodeIds)[0];
    const node = findNodeById(p.files, id);
    if (node?.path) setRenamingId(id);
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
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
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
  const gitRoot = project?.explorerRoot ?? project?.path;
  const [gitStatus, setGitStatus] = useState<Record<string, GitFileStatus>>(
    () => (gitRoot ? gitStatusCache.get(gitRoot) : undefined) ?? {},
  );
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>(
    () => (gitRoot ? ignoredPathsCache.get(gitRoot) : undefined) ?? [],
  );
  const stateScope = useBranchScope(currentProjectId ?? '', activeBranchName);
  const stateDefault = useScopeStatsStore(
    (s) => s.isDefaultByProject[currentProjectId ?? ''] ?? false,
  );
  const stateActive = !!activeBranchName && (stateScope.length > 0 || stateDefault);
  const [scopeHelpOpen, setScopeHelpOpen] = useState(false);
  const stateDefaultBranchName = useScopeStatsStore(
    (s) => s.defaultBranchByProject[currentProjectId ?? ''] ?? 'main',
  );
  const [transferTargets, setTransferTargets] = useState<ScopeTransferTarget[] | null>(null);
  const transferStats = useScopeStats(currentProjectId ?? '');
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ path?: string; branch?: string }>).detail;
      const clicked = detail?.path;
      const base = (gitRoot ?? '').replace(/\/+$/, '');
      if (!clicked || !base || (clicked !== base && !clicked.startsWith(`${base}/`))) return;
      const state = useCodeStore.getState();
      const proj = state.projects.find((p) => p.id === state.currentProjectId);
      if (!proj) return;
      const prefix = `${proj.id}::`;
      const candidates = transferStats.diff.filter(
        (p) => p === clicked || p.startsWith(`${clicked}/`),
      );
      const leaves = candidates.filter(
        (p) => !candidates.some((q) => q !== p && q.startsWith(`${p}/`)),
      );
      const targets: ScopeTransferTarget[] = [];
      for (const [key, paths] of Object.entries(useBranchScopeStore.getState().scopes)) {
        if (!key.startsWith(prefix)) continue;
        const branch = key.slice(prefix.length);
        if (branch === activeBranchName || (detail?.branch && branch !== detail.branch)) continue;
        const branchPath = proj.branches?.find((b) => b.name === branch)?.path;
        if (!branchPath || branchPath.replace(/\/+$/, '') === base) continue;
        const files = leaves
          .filter((p) => p.startsWith(`${base}/`) && isInScope(p.slice(base.length + 1), paths))
          .map((p) => p.slice(base.length + 1));
        if (files.length > 0) targets.push({ branch, path: branchPath, files });
      }
      if (targets.length > 0)
        setTransferTargets(targets.sort((a, b) => a.branch.localeCompare(b.branch)));
    };
    window.addEventListener('explorer:scope-transfer', onOpen);
    return () => window.removeEventListener('explorer:scope-transfer', onOpen);
  }, [gitRoot, transferStats, activeBranchName]);
  const [otherFiles, setOtherFiles] = useState<Record<string, string[]>>({});
  const [visibleGitStatus, setVisibleGitStatus] = useState<Record<string, GitFileStatus>>({});
  const ghostIndex = useMemo<GhostIndex>(() => new Map(), []);

  useEffect(() => {
    if (!gitRoot) {
      setGitStatus({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await codeApi.git.explorerState(gitRoot, stateScope, stateActive);
        if (cancelled) return;
        gitStatusCache.set(gitRoot, res.files);
        ignoredPathsCache.set(gitRoot, res.ignoredPaths);
        setGitStatus((prev) =>
          JSON.stringify(prev) === JSON.stringify(res.files) ? prev : res.files,
        );
        setIgnoredPaths((prev) =>
          JSON.stringify(prev) === JSON.stringify(res.ignoredPaths) ? prev : res.ignoredPaths,
        );
        setOtherFiles((prev) =>
          JSON.stringify(prev) === JSON.stringify(res.otherFiles) ? prev : res.otherFiles,
        );
        setVisibleGitStatus((prev) =>
          JSON.stringify(prev) === JSON.stringify(res.visible) ? prev : res.visible,
        );

        if (currentProjectId) {
          const { otherBranches, ...scopeStats } = res.stats;
          useScopeStatsStore.getState().setStats(currentProjectId, scopeStats);
          useScopeStatsStore.getState().setOtherBranches(currentProjectId, otherBranches);
        }
      } catch {
        if (!cancelled) setGitStatus({});
      }
    };
    void load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 300);
    };
    const offDirChange = watchIpc.onDirChanged(onChange);
    const offIndexChange = watchIpc.onIndexChanged(onChange);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      offDirChange();
      offIndexChange();
    };
  }, [gitRoot, currentProjectId, stateScope, stateActive]);

  // ── Auto-reveal file đang active ở Workspace (giống VSCode) ───────────────
  const activeFilePath = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === s.currentProjectId);
    const activeId =
      (s.activeWorkspaceSessionId
        ? p?.activeWorkspacePanelIds?.[s.activeWorkspaceSessionId]
        : undefined) ?? p?.activeWorkspacePanelId;
    const panel = p?.workspacePanels?.find((w) => w.id === activeId);
    return panel?.type === 'file' ? (panel.filePath ?? null) : null;
  });
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const [revealTick, setRevealTick] = useState(0);

  useEffect(() => {
    const onReveal = () => setRevealTick((t) => t + 1);
    window.addEventListener('workspace:reveal-file', onReveal);
    return () => window.removeEventListener('workspace:reveal-file', onReveal);
  }, []);

  useEffect(() => {
    const root = project?.explorerRoot ?? project?.path;
    if (!project || !root || !activeFilePath) return;
    const base = root.replace(/\/+$/, '');
    if (!activeFilePath.startsWith(base + '/')) return;

    const folderIds: string[] = [];
    let acc = base;
    for (const seg of activeFilePath
      .slice(base.length + 1)
      .split('/')
      .slice(0, -1)) {
      acc = `${acc}/${seg}`;
      folderIds.push(`fs_${acc}`);
    }
    const fileId = `fs_${activeFilePath}`;

    const state = useCodeStore.getState();
    const expanded = state.projects.find((p) => p.id === project.id)?.expandedFolderIds ?? [];
    const missing = folderIds.filter((id) => !expanded.includes(id));
    if (missing.length > 0) {
      state.updateProject(project.id, { expandedFolderIds: [...expanded, ...missing] });
    }

    setSelectedNodeIds(new Set([fileId]));
    setLastClickedId(fileId);

    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scrollToNode = () => {
      const container = treeScrollRef.current;
      const el = container?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(fileId)}"]`);
      if (el && container) {
        const c = container.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (r.top < c.top || r.bottom > c.bottom) el.scrollIntoView({ block: 'center' });
        return;
      }
      if (++tries < 40) timer = setTimeout(scrollToNode, 50);
    };
    scrollToNode();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath, revealTick, project?.id, project?.explorerRoot, project?.path]);

  const handleExpandAll = useCallback(() => {
    if (!project) return;
    const ids: string[] = [];
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === 'folder' && n.name !== 'node_modules' && n.name !== '.git') {
          ids.push(n.id);
          if (n.children) walk(n.children);
        }
      }
    };
    walk(project.files);
    lazyNodeRegistry.forEach((n) => {
      if (
        n.type === 'folder' &&
        n.name !== 'node_modules' &&
        n.name !== '.git' &&
        !ids.includes(n.id)
      ) {
        ids.push(n.id);
      }
    });
    expandFolders(project.id, ids);
  }, [project, expandFolders]);

  const handleCollapseAll = useCallback(() => {
    if (currentProjectId) {
      collapseAllFolders(currentProjectId);
    }
  }, [currentProjectId, collapseAllFolders]);

  const handleRefresh = useCallback(async () => {
    const root = project?.explorerRoot ?? project?.path;
    if (!project || !root) return;
    await refreshProjectTree(project.id, root);
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
      const root = project.explorerRoot ?? project.path;
      if (root) {
        setCreating({ nodeId: '__root__', parentPath: root, type });
      }
    },
    [project, selectedNodeIds],
  );

  const handleCreated = useCallback(async () => {
    setCreating(null);
    const root = project?.explorerRoot ?? project?.path;
    if (!project || !root) return;
    await refreshProjectTree(project.id, root);
  }, [project]);

  // ── Delete confirm modal items ────────────────────────────────────────────
  const deleteItems = project ? collectSelectedItems(project.files, new Set(deleteTargetIds)) : [];

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searching = searchQuery.trim().length > 0;

  const toolbar = (
    <div className="flex items-center justify-between h-9 px-2 border-b border-border flex-shrink-0 bg-panel-background">
      <span className="text-[13px] text-text-secondary truncate max-w-[50%]" title={project?.name}>
        {project?.name || 'No project'}
      </span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {project && gitRoot && (
          <ScopeWarnBell projectId={project.id} projectPath={gitRoot} onDone={handleRefresh} />
        )}

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
          title="New folder"
        >
          <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => handleToolbarCreate('file')}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="New file"
        >
          <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <button
          onClick={handleExpandAll}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="Expand all"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleCollapseAll}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
          title="Collapse all"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );

  // ── Context value ─────────────────────────────────────────────────────────
  const explorerScope = useBranchScope(currentProjectId ?? '', activeBranchName);
  const explorerScopeRoot = (project?.explorerRoot ?? project?.path ?? '').replace(/\/+$/, '');
  const contextValue = useMemo(
    () => ({
      scopeBranch: activeBranchName,
      nodeScope: explorerScope,
      scopeRoot: explorerScopeRoot,
      creating,
      setCreating,
      clipboard,
      setClipboard,
      onCopyAbsolutePath: handleCopyAbsolutePath,
      onCopyRelativePath: handleCopyRelativePath,
      onCutFile: handleCutFile,
      onCopyFile: handleCopyFile,
      onPasteFile: handlePasteFile,
      gitStatus,
      ghostIndex,
      ignoredPaths,
      renamingId,
      setRenamingId,
      nodeMetaRef,
      errorPaths,
      onViewRemoteDiff: handleViewRemoteDiff,
    }),
    [
      activeBranchName,
      explorerScope,
      explorerScopeRoot,
      errorPaths,
      handleViewRemoteDiff,
      gitStatus,
      ghostIndex,
      ignoredPaths,
      renamingId,
      creating,
      clipboard,
      handleCopyAbsolutePath,
      handleCopyRelativePath,
      handleCutFile,
      handleCopyFile,
      handlePasteFile,
    ],
  );

  const scanning = useTreeScanning();

  if (project && !activeBranchName) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
          <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">No session selected</p>
            <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed">
              Select a session of a branch from the sidebar to browse files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state (chưa có dữ liệu cache, đang quét cây thư mục) ──────────
  if (project && project.files.length === 0 && scanning) {
    return (
      <div className="relative flex-1 flex flex-col min-h-0">
        {toolbar}
        <div className="flex-1 min-h-0 relative overflow-hidden py-1">
          <div className="absolute top-1 bottom-0 left-0 right-0 overflow-hidden">
            {Array.from({ length: 40 }, (_, i) => {
              const depth = [0, 1, 2, 2, 1, 2, 0, 1, 2, 0][i % 10];
              const width = [48, 62, 55, 70, 44, 66, 52, 58, 40, 60][i % 10];
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 w-full h-7 pr-2 animate-pulse"
                  style={{ paddingLeft: `${8 + depth * 12}px` }}
                >
                  <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                    {depth < 2 && <span className="w-1.5 h-2 rounded-[2px] bg-card-hover" />}
                  </span>
                  <span className="w-4 h-4 rounded-[3px] bg-card-hover shrink-0" />
                  <span className="h-3 rounded bg-card-hover" style={{ width: `${width}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
          <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {!project ? 'No project selected' : 'Empty folder'}
            </p>
            <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed">
              {!project
                ? 'Select a project from the sidebar to browse files.'
                : 'This project has no files yet. Create one or open an existing file.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FileExplorerContext.Provider value={contextValue}>
      <div className="flex-1 flex flex-col min-h-0">
        {toolbar}
        <ExplorerSearchBar
          projectId={project.id}
          root={gitRoot ?? ''}
          scopeBranch={activeBranchName}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          showScope={!stateDefault}
        />

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
        {searching && <ExplorerSearchResults root={gitRoot ?? ''} query={searchQuery} />}
        <div
          ref={treeScrollRef}
          className={searching ? 'hidden' : 'flex-1 overflow-y-auto py-1 relative'}
        >
          <ScopeBlocks
            containerRef={treeScrollRef}
            projectId={project.id}
            root={gitRoot ?? ''}
            gitStatus={visibleGitStatus}
            otherFiles={otherFiles}
            onErrorPaths={setErrorPaths}
          />
          <SelectionBlocks containerRef={treeScrollRef} selectedNodeIds={selectedNodeIds} />
          {(withGhosts(project.files, gitRoot ?? undefined, ghostIndex) ?? []).map((node) => (
            <TreeNodeGate
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

        <button
          type={'button'}
          onClick={() => setScopeHelpOpen(true)}
          className={
            'shrink-0 flex h-8 w-full items-center gap-1.5 border-t border-border px-3 text-[11.5px] text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary cursor-pointer'
          }
        >
          <HelpCircle className={'h-3.5 w-3.5'} />
          <span>Don't understand the scope dot colors?</span>
        </button>

        {selectedNodeIds.size > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-md bg-card-background px-3 py-1 text-xs text-text-secondary outline-1 outline-dashed outline-primary">
            <span className="whitespace-nowrap">
              {selectedNodeIds.size} selected · drag to add to message
            </span>
            <button
              onClick={() => {
                setSelectedNodeIds(new Set());
                setLastClickedId(null);
              }}
              className="rounded px-2 py-0.5 hover:bg-card-hover hover:text-text-primary"
            >
              Clear
            </button>
          </div>
        )}

        {/* Delete confirm modal */}
        <ConfirmDeleteFileModal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          items={deleteItems}
        />

        <ScopeHelpModal
          isOpen={scopeHelpOpen}
          onClose={() => setScopeHelpOpen(false)}
          branchName={activeBranchName}
          defaultBranch={stateDefaultBranchName}
          scope={stateScope}
        />

        <RemoteDiffModal
          isOpen={viewRemoteDiffPath !== null}
          onClose={() => setViewRemoteDiffPath(null)}
          projectPath={gitRoot ?? ''}
          filePath={viewRemoteDiffPath}
        />

        <ScopeTransferModal
          isOpen={transferTargets !== null}
          onClose={() => setTransferTargets(null)}
          sourceBranch={activeBranchName}
          sourceRoot={gitRoot ?? ''}
          targets={transferTargets ?? []}
          onApplied={() => setTransferTargets(null)}
        />
      </div>
    </FileExplorerContext.Provider>
  );
}

export default FileExplorer;
