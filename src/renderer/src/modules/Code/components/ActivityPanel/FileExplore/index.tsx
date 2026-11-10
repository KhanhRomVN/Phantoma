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
import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  createContext,
  useContext,
  memo,
} from 'react';

// ── UI ──
import {
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  FilePlus,
  RefreshCw,
  ChevronRight,
  Loader,
  File,
  Folder,
} from 'lucide-react';
import { Kbd } from '@renderer/components/ui/Kbd';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';

// ── Hooks ──
import { useCodeStore, type FileNode } from '../../../hooks/useCodeStore';
import { parseGitStatusOutput } from '../../../services/git-status-parser';
import { useBranchScope, useBranchScopeStore, isInScope } from '../../../stores/useBranchScopeStore';

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const compareDirEntries = (
  a: { name: string; isDirectory: boolean },
  b: { name: string; isDirectory: boolean },
): number => {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return nameCollator.compare(a.name, b.name) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
};

// Local helper to avoid circular dependency or missing export in AddProjectModal
async function scanDirectory(dirPath: string, depth = 0): Promise<FileNode[]> {
  if (depth > 8) return []; // safety cap against runaway recursion
  let entries: Array<{ name: string; path: string; isDirectory: boolean }> = [];
  try {
    entries = await window.api.invoke('fs:list-dir', dirPath);
  } catch {
    return [];
  }
  if (!Array.isArray(entries)) return [];

  const nodes: FileNode[] = [];
  for (const entry of [...entries].sort(compareDirEntries)) {
    const node: FileNode = {
      id: `fs_${entry.path}`,
      name: entry.name,
      type: entry.isDirectory ? 'folder' : 'file',
      path: entry.path,
    };
    if (entry.isDirectory) {
      node.children =
        entry.name === 'node_modules' || entry.name === '.git'
          ? []
          : await scanDirectory(entry.path, depth + 1);
    }
    nodes.push(node);
  }
  return nodes;
}

// ── Utils ──
import { getFileIconPath, getFolderIconPath } from '@renderer/utils/file-icon';
import { installRightClickDragCancel } from '@renderer/utils/drag-cancel';
import { cn } from '@renderer/utils/cn';

// ── Components ──
import { ConfirmDeleteFileModal } from './ConfirmDeleteFileModal';
import { RemoteDiffModal } from './RemoteDiffModal';

import { FolderBadges } from './FolderBadges';
import { ScopeFilterButton } from './ScopeFilterButton';
import { ScopeWarnBell } from './ScopeWarnBell';
import {
  EMPTY_SCOPE_STATS,
  useScopeFilter,
  SCOPE_DIFF_DOT,
  SCOPE_DIFF_RING,
  useScopeStats,
  useScopeStatsStore,
} from '../../../stores/useScopeStatsStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

const lazyNodeRegistry = new Map<string, FileNode>();

const dirEntryToFileNode = (entry: DirEntry): FileNode => {
  const node: FileNode = {
    id: `fs_${entry.path}`,
    name: entry.name,
    type: entry.isDirectory ? 'folder' : 'file',
    path: entry.path,
    children: entry.isDirectory ? [] : undefined,
  };
  lazyNodeRegistry.set(node.id, node);
  return node;
};

const fetchDirChildren = async (dirPath: string): Promise<FileNode[]> => {
  try {
    const entries: DirEntry[] = await window.api.invoke('fs:list-dir', dirPath);
    if (!entries || !Array.isArray(entries)) return [];

    return [...entries].sort(compareDirEntries).map(dirEntryToFileNode);
  } catch {
    return [];
  }
};

type GitFileStatus = 'added' | 'modified' | 'deleted';

const gitStatusCache = new Map<string, Record<string, GitFileStatus>>();

type GhostIndex = Map<string, Map<string, 'file' | 'folder'>>;

const GHOST_PREFIX = 'ghost_';

const buildGhostIndex = (root: string, gitStatus: Record<string, GitFileStatus>): GhostIndex => {
  const index: GhostIndex = new Map();
  if (!root) return index;
  const base = root.replace(/\/+$/, '');
  for (const [p, s] of Object.entries(gitStatus)) {
    if (s !== 'deleted' || !p.startsWith(`${base}/`)) continue;
    const parts = p.slice(base.length + 1).split('/');
    let dir = base;
    parts.forEach((seg, i) => {
      let names = index.get(dir);
      if (!names) {
        names = new Map();
        index.set(dir, names);
      }
      if (!names.has(seg)) names.set(seg, i === parts.length - 1 ? 'file' : 'folder');
      dir = `${dir}/${seg}`;
    });
  }
  return index;
};

const withGhosts = (
  children: FileNode[] | undefined,
  dirPath: string | undefined,
  index: GhostIndex,
): FileNode[] | undefined => {
  const ghosts = dirPath ? index.get(dirPath) : undefined;
  if (!ghosts || ghosts.size === 0) return children;
  const existing = new Set((children ?? []).map((c) => c.name));
  const extra: FileNode[] = [];
  ghosts.forEach((kind, name) => {
    if (existing.has(name)) return;
    const path = `${dirPath}/${name}`;
    extra.push({
      id: `${GHOST_PREFIX}${path}`,
      name,
      type: kind,
      path,
      children: kind === 'folder' ? [] : undefined,
    });
  });
  if (extra.length === 0) return children;
  return [...(children ?? []), ...extra].sort((a, b) =>
    compareDirEntries(
      { name: a.name, isDirectory: a.type === 'folder' },
      { name: b.name, isDirectory: b.type === 'folder' },
    ),
  );
};
const ignoredPathsCache = new Map<string, string[]>();

let scanCount = 0;
const scanListeners = new Set<() => void>();
const emitScan = () => scanListeners.forEach((l) => l());

function useTreeScanning(): boolean {
  const [scanning, setScanning] = useState(scanCount > 0);
  useEffect(() => {
    const l = () => setScanning(scanCount > 0);
    scanListeners.add(l);
    l();
    return () => {
      scanListeners.delete(l);
    };
  }, []);
  return scanning;
}

async function refreshProjectTree(projectId: string, projectPath: string) {
  const { setProjectFiles } = useCodeStore.getState();
  scanCount++;
  emitScan();
  try {
    const files = await scanDirectory(projectPath);
    setProjectFiles(projectId, files);
  } finally {
    scanCount--;
    emitScan();
  }
}

/** Tìm node theo id trong cây đệ quy */
function findNodeInTree(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeInTree(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  return findNodeInTree(nodes, id) ?? lazyNodeRegistry.get(id) ?? null;
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

interface NodeMeta {
  path: string;
  name: string;
  isFolder: boolean;
}

interface FileExploreContextValue {

  nodeMetaRef: React.MutableRefObject<Map<string, NodeMeta>>;
  creating: CreatingState | null;
  setCreating: (v: CreatingState | null) => void;
  clipboard: { paths: string[]; operation: 'copy' | 'cut' } | null;
  setClipboard: (v: { paths: string[]; operation: 'copy' | 'cut' } | null) => void;
  onCopyAbsolutePath: () => void;
  onCopyRelativePath: () => void;
  onCutFile: (paths?: string[]) => void;
  onCopyFile: (paths?: string[]) => void;
  onPasteFile: () => void;
  gitStatus: Record<string, GitFileStatus>;
  ghostIndex: GhostIndex;
  ignoredPaths: string[];
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  errorPaths: Set<string>;
  onViewRemoteDiff: (path: string) => void;
}

const FileExploreContext = createContext<FileExploreContextValue>({

  nodeMetaRef: { current: new Map() },
  gitStatus: {},
  ghostIndex: new Map(),
  ignoredPaths: [],
  creating: null,
  setCreating: () => {},
  clipboard: null,
  setClipboard: () => {},
  onCopyAbsolutePath: () => {},
  onCopyRelativePath: () => {},
  onCutFile: () => {},
  onCopyFile: () => {},
  onPasteFile: () => {},
  renamingId: null,
  errorPaths: new Set<string>(),
  onViewRemoteDiff: () => {},
  setRenamingId: () => {},
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
        placeholder={type === 'folder' ? 'Folder name...' : 'File name...'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleSubmit}
      />
    </div>
  );
}

// ─── InlineRenameInput ──────────────────────────────────────────────────────
interface InlineRenameInputProps {
  node: FileNode;
  depth: number;
  projectId: string;
  onDone: () => void;
}

function InlineRenameInput({ node, depth, projectId, onDone }: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const isFolder = node.type === 'folder';
  const iconSrc = isFolder ? getFolderIconPath(node.name, false) : getFileIconPath(node.name);
  const fallbackIcon = isFolder ? '/images/icon/folder-base.svg' : '/images/icon/file.svg';

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const dot = isFolder ? -1 : node.name.lastIndexOf('.');
    el.setSelectionRange(0, dot > 0 ? dot : node.name.length);
  }, [isFolder, node.name]);

  const finish = async (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const newName = inputRef.current?.value.trim();
    if (commit && newName && newName !== node.name && node.path && !newName.includes('/')) {
      try {
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        await window.api.invoke('fs:rename', {
          oldPath: node.path,
          newPath: `${parentPath}/${newName}`,
        });
        const state = useCodeStore.getState();
        state.invalidateDir(projectId, parentPath);
        const p = state.projects.find((pr) => pr.id === projectId);
        const root = p?.explorerRoot ?? p?.path;
        if (root) await refreshProjectTree(projectId, root);
      } catch (err) {
        console.error('[FileExplore] Failed to rename:', err);
      }
    }
    onDone();
  };

  return (
    <div
      className="flex items-center gap-1.5 w-full py-1 pr-2"
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span className="w-3.5 h-3.5 shrink-0" />
      <img
        src={iconSrc}
        alt=""
        className="w-4 h-4 shrink-0"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          if (img.src.endsWith(fallbackIcon)) img.style.display = 'none';
          else img.src = fallbackIcon;
        }}
      />
      <input
        ref={inputRef}
        defaultValue={node.name}
        spellCheck={false}
        className="flex-1 min-w-0 bg-input-background text-[13px] text-text-primary outline-none rounded px-1.5 py-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') void finish(true);
          if (e.key === 'Escape') void finish(false);
        }}
        onBlur={() => void finish(true)}
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
  } = useContext(FileExploreContext);

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

  const scopeBranch = useActiveBranchName(projectId);
  const nodeScope = useBranchScope(projectId, scopeBranch);
  const setBranchScope = useBranchScopeStore((s) => s.setScope);
  const scopeRoot = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === projectId);
    return (p?.explorerRoot ?? p?.path ?? '').replace(/\/+$/, '');
  });
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
        setTimeout(() => logRenderCountAndReset(`TOGGLE "${node.name}"`), 100);
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
      navigator.clipboard.writeText(node.path).catch(() => {
        console.warn('[FileTree] Failed to copy path to clipboard');
      });
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
        navigator.clipboard.writeText(relative).catch(() => {
          console.warn('[FileTree] Failed to copy relative path to clipboard');
        });
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
      const err = await window.api.invoke('shell:open-path', node.path);
      if (err) console.error('[FileExplore] Cannot open folder:', err);
    } catch (err) {
      console.error('[FileExplore] Failed to open folder:', err);
    }
  }, [node.path]);

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

// ─── FileExplore ────────────────────────────────────────────────────────────
interface ScopeLayout {
  blocks: {
    key: string;
    index: number;
    top: number;
    height: number;
    rows: number;
    deleted?: boolean;
  }[];
  bad: {
    top: number;
    height: number;
    level: 'warn' | 'diff' | 'error';
    rows: number;
    deleted?: boolean;
  }[];
  diff: { top: number; height: number; deleted?: boolean }[];
  warn: { top: number; height: number; deleted?: boolean }[];
}

const GutterDot = memo(function GutterDot({
  top,
  dot,
  ring,
  deleted,
}: {
  top: number;
  dot: string;
  ring: string;
  deleted?: boolean;
}) {
  if (!deleted) {
    return <span className={cn('absolute right-3 w-2 h-2 rounded-full', dot)} style={{ top }} />;
  }
  return (
    <span
      className={cn(
        'absolute right-[9px] inline-flex p-[2px] rounded-[4px] border border-dashed',
        ring,
      )}
      style={{ top: top - 3 }}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
    </span>
  );
});

// key: `${root}\n${remoteHash}` — đổi khi default branch có commit mới
function SelectionBlocks({
  containerRef,
  selectedNodeIds,
}: {
  containerRef: { current: HTMLDivElement | null };
  selectedNodeIds: Set<string>;
}) {
  const [blocks, setBlocks] = useState<{ top: number; height: number }[]>([]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || selectedNodeIds.size < 2) {
      setBlocks((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const compute = () => {
      const box = el.getBoundingClientRect();
      const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-node-id]'))
        .filter((r) => selectedNodeIds.has(r.dataset.nodeId ?? ''))
        .map((r) => {
          const b = r.getBoundingClientRect();
          return {
            top: Math.round(b.top - box.top + el.scrollTop),
            bottom: Math.round(b.bottom - box.top + el.scrollTop),
          };
        })
        .sort((a, b) => a.top - b.top);
      const merged: { top: number; bottom: number }[] = [];
      for (const r of rows) {
        const prev = merged[merged.length - 1];
        if (prev && r.top - prev.bottom <= 2) prev.bottom = Math.max(prev.bottom, r.bottom);
        else merged.push({ ...r });
      }
      const next = merged.map((m) => ({ top: m.top, height: m.bottom - m.top }));
      setBlocks((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
    };
  }, [containerRef, selectedNodeIds]);

  return (
    <div className="absolute left-0 right-0 top-0 z-10 h-0 pointer-events-none">
      {blocks.map((b, i) => (
        <div
          key={i}
          className="absolute left-1 right-1 rounded border border-dashed border-primary"
          style={{ top: b.top, height: b.height }}
        />
      ))}
    </div>
  );
}

const remoteDiffCache = new Map<string, Set<string>>();
const remoteHashByRoot = new Map<string, string>();

interface BorderRun {
  top: number;
  height: number;
  level?: 'warn' | 'diff' | 'error';
  key?: string;
  rows?: number;
}

const EDGE_INSET = 1;
const GAP_INSET = 3;

// Gộp các border liền kề cùng màu (và cùng scope) thành 1
function mergeRuns<T extends BorderRun>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.top - b.top);
  const out: T[] = [];
  for (const it of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.level === it.level &&
      prev.key === it.key &&
      it.top <= prev.top + prev.height + 1
    ) {
      const bottom = Math.max(prev.top + prev.height, it.top + it.height);
      prev.height = bottom - prev.top;
      prev.rows = (prev.rows ?? 1) + (it.rows ?? 1);
    } else {
      out.push({ ...it });
    }
  }
  return out;
}

// Inset 1px mỗi đầu; đầu nào chạm border khác màu thì inset 3px để tạo gap 6px tại đó
function insetRuns<T extends BorderRun>(runs: T[], all: BorderRun[]): T[] {
  const tagOf = (r: BorderRun) => r.level ?? `scope:${r.key}`;
  return runs.map((r) => {
    const tag = tagOf(r);
    const bottom = r.top + r.height;
    const touchTop = all.some((o) => tagOf(o) !== tag && Math.abs(o.top + o.height - r.top) <= 2);
    const touchBottom = all.some((o) => tagOf(o) !== tag && Math.abs(o.top - bottom) <= 2);
    const top = r.top + (touchTop ? GAP_INSET : EDGE_INSET);
    const end = bottom - (touchBottom ? GAP_INSET : EDGE_INSET);
    return { ...r, top, height: Math.max(end - top, 1) };
  });
}

function useActiveBranchName(projectId: string): string {
  return useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === projectId);
    return (
      p?.branches?.find((b) => b.sessions.some((ss) => ss.id === s.activeWorkspaceSessionId))
        ?.name ?? ''
    );
  });
}

const TreeNodeGate = memo(function TreeNodeGate(props: TreeNodeProps) {
  const { node, projectId } = props;
  const filter = useScopeFilter(projectId);
  const stats = useScopeStats(projectId);
  const visible = useMemo(() => {
    if (!filter) return true;
    if (!node.path) return false;
    const list = stats[filter];
    if (node.type !== 'folder') return list.includes(node.path);
    const prefix = `${node.path}/`;
    return list.some((p) => p.startsWith(prefix));
  }, [filter, stats, node.path, node.type]);
  return visible ? <TreeNode {...props} /> : null;
});

const NO_SCOPES: number[] = [];

function useScopesBelow(
  projectId: string,
  nodePath: string | undefined,
  isFolder: boolean,
): number[] {
  const branchName = useActiveBranchName(projectId);
  const scope = useBranchScope(projectId, branchName);
  const root = useCodeStore((s) => {
    const p = s.projects.find((x) => x.id === projectId);
    return (p?.explorerRoot ?? p?.path ?? '').replace(/\/+$/, '');
  });
  return useMemo(() => {
    if (!isFolder || !nodePath || !root || !nodePath.startsWith(`${root}/`)) return NO_SCOPES;
    const rel = nodePath.slice(root.length + 1);
    if (isInScope(rel, scope)) return NO_SCOPES;
    return scope.flatMap((p, i) => (p.startsWith(`${rel}/`) ? [i + 1] : []));
  }, [isFolder, nodePath, root, scope]);
}

function ScopeBlocks({
  containerRef,
  projectId,
  root,
  gitStatus,
  onErrorPaths,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  projectId: string;
  root: string;
  gitStatus: Record<string, GitFileStatus>;
  onErrorPaths: (paths: Set<string>) => void;
}) {
  const branchName = useActiveBranchName(projectId);
  const scope = useBranchScope(projectId, branchName);
  const [defaultBranch, setDefaultBranch] = useState('');
  useEffect(() => {
    if (!root) return;
    let cancelled = false;
    window.api
      .invoke('git:default-branch', root)
      .then((r: { name?: string }) => {
        if (!cancelled) setDefaultBranch(r?.name ?? '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [root]);
  const isDefault = !!branchName && branchName === defaultBranch;
  const active = !!branchName && (scope.length > 0 || isDefault);
  const setIsDefault = useScopeStatsStore((s) => s.setIsDefault);
  useEffect(() => {
    setIsDefault(projectId, isDefault);
  }, [projectId, isDefault, setIsDefault]);
  const setDefaultBranchName = useScopeStatsStore((s) => s.setDefaultBranch);
  useEffect(() => {
    setDefaultBranchName(projectId, defaultBranch);
  }, [projectId, defaultBranch, setDefaultBranchName]);
  // ASSUMED: remoteDiff = null (không có remote/main|master hoặc lỗi) → giữ hành vi cũ (error)
  const [remoteDiff, setRemoteDiff] = useState<Set<string> | null>(() => {
    const h = remoteHashByRoot.get(root);
    return h ? (remoteDiffCache.get(`${root}\n${h}`) ?? null) : null;
  });

  const lastDiffKeyRef = useRef('');
  const [remoteOnly, setRemoteOnly] = useState<string[]>([]);
  const effectiveStatus = useMemo(() => {
    if (remoteOnly.length === 0) return gitStatus;
    const merged: Record<string, GitFileStatus> = { ...gitStatus };
    for (const p of remoteOnly) if (!(p in merged)) merged[p] = 'modified' as GitFileStatus;
    return merged;
  }, [gitStatus, remoteOnly]);

  const [otherChanged, setOtherChanged] = useState<Set<string>>(new Set());
  const [otherMap, setOtherMap] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!root || !active) {
      setOtherChanged(new Set());
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await window.api.invoke('git:changed-in-other-branches', root);
        if (cancelled) return;
        const files: Record<string, string[]> = res && res.files ? res.files : {};
        setOtherMap((prev) => (JSON.stringify(prev) === JSON.stringify(files) ? prev : files));
        const next = new Set<string>(Object.keys(files));
        setOtherChanged((prev) =>
          prev.size === next.size && [...next].every((p) => prev.has(p)) ? prev : next,
        );
      } catch {
        if (!cancelled) setOtherChanged(new Set());
      }
    };
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [root, branchName, scope]);
  const candidatesKey = useMemo(() => {
    const base = root.replace(/\/+$/, '');
    return Object.keys(gitStatus)
      .filter((p) => p.startsWith(`${base}/`) && !isInScope(p.slice(base.length + 1), scope))
      .sort()
      .join('\n');
  }, [gitStatus, root, scope]);

  // ASSUMED: mọi key của gitStatus ngoài scope (kể cả file trong folder đang collapse) đều tính là file thay đổi
  const errorKey = useMemo(() => {
    if (!active || !root) return '';
    const base = root.replace(/\/+$/, '');
    return Object.keys(effectiveStatus)
      .filter(
        (p) =>
          p.startsWith(`${base}/`) &&
          !isInScope(p.slice(base.length + 1), scope) &&
          (remoteDiff === null || remoteDiff.has(p)),
      )
      .sort()
      .join('\n');
  }, [effectiveStatus, root, scope, branchName, remoteDiff]);

  useEffect(() => {
    onErrorPaths(new Set(errorKey ? errorKey.split('\n') : []));
  }, [errorKey, onErrorPaths]);

  const filter = useScopeFilter(projectId);
  const setStats = useScopeStatsStore((s) => s.setStats);
  useEffect(() => {
    if (!root || !active) {
      setStats(projectId, EMPTY_SCOPE_STATS);
      return;
    }
    const base = root.replace(/\/+$/, '');
    const primary: string[] = [];
    const warn: string[] = [];
    const diff: string[] = [];
    const error: string[] = [];
    const deletedPaths: string[] = [];
    for (const p of Object.keys(effectiveStatus).sort()) {
      if (!p.startsWith(`${base}/`)) continue;
      if (isInScope(p.slice(base.length + 1), scope)) primary.push(p);
      else if (remoteDiff === null || remoteDiff.has(p)) {
        if (otherChanged.has(p)) error.push(p);
        else {
          diff.push(p);
          if (effectiveStatus[p] === 'deleted') deletedPaths.push(p);
        }
      } else warn.push(p);
    }
    setStats(projectId, { primary, warn, diff, error, deletedPaths });
  }, [projectId, root, branchName, scope, effectiveStatus, remoteDiff, otherChanged, setStats]);

  const setOtherBranches = useScopeStatsStore((s) => s.setOtherBranches);
  useEffect(() => {
    if (!root || !active) {
      setOtherBranches(projectId, []);
      return;
    }
    const base = root.replace(/\/+$/, '');
    const names = new Set<string>();
    for (const p of Object.keys(effectiveStatus)) {
      if (!p.startsWith(`${base}/`) || isInScope(p.slice(base.length + 1), scope)) continue;
      if (remoteDiff !== null && !remoteDiff.has(p)) continue;
      for (const b of otherMap[p] ?? []) names.add(b);
    }
    setOtherBranches(projectId, [...names].sort());
  }, [projectId, root, active, scope, effectiveStatus, remoteDiff, otherMap, setOtherBranches]);

  const [remoteTick, setRemoteTick] = useState(0);
  // ASSUMED: fetch định kỳ 30s để origin/<default> luôn mới, rồi buộc tính lại diff-vs-remote
  useEffect(() => {
    if (!root || !active) return;
    let cancelled = false;
    const t = setInterval(() => {
      console.log('[DEBUG] FileExplore fetch tick start', { root });
      void window.api
        .invoke('git:fetch', root)
        .then((r: unknown) => console.log('[DEBUG] FileExplore git:fetch result', r))
        .catch((e: unknown) => console.log('[DEBUG] FileExplore git:fetch error', e))
        .finally(() => {
          if (!cancelled) setRemoteTick((n) => n + 1);
        });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [root, active]);

  useEffect(() => {
    if (!root || !active) {
      setRemoteDiff(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        console.log('[DEBUG] FileExplore diff-vs-remote start', { root, active, branchName, remoteTick, candidatesLen: candidatesKey.length });
        const res = await window.api.invoke(
          'git:diff-vs-remote',
          root,
          candidatesKey ? candidatesKey.split('\n') : [],
        );
        if (cancelled) return;
        const ok = res && Array.isArray(res.files);
        console.log('[DEBUG] FileExplore diff-vs-remote result', { ok, remoteHash: res?.remoteHash, filesCount: res?.files?.length, error: res?.error, lastKeyLen: lastDiffKeyRef.current.length });
        const only: string[] = ok && Array.isArray(res.remoteOnly) ? res.remoteOnly : [];
        const next = ok ? new Set<string>([...res.files, ...only]) : null;
        if (ok && res.remoteHash) {
          remoteHashByRoot.set(root, res.remoteHash);
          remoteDiffCache.set(`${root}\n${res.remoteHash}`, next as Set<string>);
        }
        const key = ok ? [...(next as Set<string>)].sort().join('\n') : '\0null';
        if (key === lastDiffKeyRef.current) return;
        lastDiffKeyRef.current = key;
        setRemoteOnly(only);
        setRemoteDiff(next);
      } catch {
        if (!cancelled) setRemoteDiff(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [root, branchName, scope, candidatesKey, remoteTick]);
  const [layout, setLayout] = useState<ScopeLayout>({ blocks: [], bad: [], diff: [], warn: [] });
  const lastJsonRef = useRef('');

  useEffect(() => {
    const el = containerRef.current;
    const apply = (next: ScopeLayout) => {
      const json = JSON.stringify(next);
      if (json === lastJsonRef.current) return;
      lastJsonRef.current = json;
      setLayout(next);
    };
    if (!el || !active || !root) {
      apply({ blocks: [], bad: [], diff: [], warn: [] });
      return;
    }
    const base = root.replace(/\/+$/, '');
    const compute = () => {
      const box = el.getBoundingClientRect();
      const rects = Array.from(el.querySelectorAll<HTMLElement>('[data-node-path]')).map((r) => {
        const b = r.getBoundingClientRect();
        return {
          path: r.dataset.nodePath ?? '',
          folder: r.dataset.nodeFolder === '1',
          top: Math.round(b.top - box.top + el.scrollTop),
          bottom: Math.round(b.bottom - box.top + el.scrollTop),
        };
      });
      const blocks = scope.flatMap((p, i) => {
        const abs = `${base}/${p}`;
        const hit = rects.filter((r) => r.path === abs || r.path.startsWith(`${abs}/`));
        if (hit.length === 0) return [];
        const top = Math.min(...hit.map((h) => h.top));
        const bottom = Math.max(...hit.map((h) => h.bottom));
        return [
          {
            key: p,
            index: i + 1,
            top,
            height: bottom - top,
            rows: hit.length,
            deleted: hit.length === 1 && gitStatus[hit[0].path] === 'deleted',
          },
        ];
      });
      const bad = rects
        .filter(
          (r) =>
            !r.folder &&
            !!effectiveStatus[r.path] &&
            r.path.startsWith(`${base}/`) &&
            !isInScope(r.path.slice(base.length + 1), scope),
        )
        .map((r) => ({
          path: r.path,
          top: r.top,
          height: r.bottom - r.top,
          deleted: effectiveStatus[r.path] === 'deleted',
          level: (remoteDiff === null || remoteDiff.has(r.path)
            ? otherChanged.has(r.path)
              ? 'error'
              : 'diff'
            : 'warn') as 'warn' | 'diff' | 'error',
        }));
      const mergedBlocks = mergeRuns(blocks);
      const errors = bad
        .filter((b) => b.level === 'error')
        .map(({ top, height, level, deleted }) => ({ top, height, level, rows: 1, deleted }));
      const warn = bad
        .filter((b) => b.level === 'warn')
        .map(({ top, height, deleted }) => ({ top, height, deleted }));
      const diff = bad
        .filter((b) => b.level === 'diff')
        .map(({ top, height, deleted }) => ({ top, height, deleted }));
      const all: BorderRun[] = mergedBlocks.filter((r) => (r.rows ?? 1) > 1);
      apply({
        blocks: insetRuns(mergedBlocks, all),
        bad: errors,
        diff,
        warn,
      });
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
    };
  }, [containerRef, branchName, scope, root, gitStatus, effectiveStatus, remoteDiff, otherChanged]);

  return (
    <div className="absolute left-0 right-0 top-0 z-10 h-0 pointer-events-none">
      {(!filter || filter === 'primary') &&
        layout.blocks.map((b) =>
          b.rows > 1 ? (
            <div
              key={b.key}
              className="absolute left-1 right-1 rounded-md border border-dashed border-primary"
              style={{ top: b.top, height: b.height }}
            >
              <span className="absolute -right-px -top-px px-1.5 min-w-4 h-4 rounded-tr-md rounded-bl-md bg-primary text-white text-[10px] leading-4 text-center">
                {b.index}
              </span>
            </div>
          ) : (
            <GutterDot
              key={b.key}
              top={b.top + b.height / 2 - 4}
              dot="bg-primary"
              ring="border-primary"
              deleted={b.deleted}
            />
          ),
        )}
      {(!filter || filter === 'error') &&
        layout.bad.map((b, i) => (
          <GutterDot
            key={i}
            top={b.top + b.height / 2 - 4}
            dot="bg-error"
            ring="border-error"
            deleted={b.deleted}
          />
        ))}
      {(!filter || filter === 'diff') &&
        layout.diff.map((d, i) => (
          <GutterDot
            key={`d${i}`}
            top={d.top + d.height / 2 - 4}
            dot={SCOPE_DIFF_DOT}
            ring={SCOPE_DIFF_RING}
            deleted={d.deleted}
          />
        ))}
      {(!filter || filter === 'warn') &&
        layout.warn.map((w, i) => (
          <GutterDot
            key={`w${i}`}
            top={w.top + w.height / 2 - 4}
            dot="bg-warn"
            ring="border-warn"
            deleted={w.deleted}
          />
        ))}
    </div>
  );
}

export function FileExplore() {
  const { projects, currentProjectId, collapseAllFolders, expandFolders } = useCodeStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const projectPathRef = useRef<string | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  const nodeMetaRef = useRef<Map<string, NodeMeta>>(new Map());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{
    nodeId: string;
    parentPath: string;
    type: 'file' | 'folder';
  } | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [errorPaths, setErrorPaths] = useState<Set<string>>(new Set());
  const [remoteDiffTarget, setRemoteDiffTarget] = useState<string | null>(null);
  const handleViewRemoteDiff = useCallback((p: string) => setRemoteDiffTarget(p), []);

  // Clipboard nội bộ cho cut/copy/paste file
  const [clipboard, setClipboard] = useState<{ paths: string[]; operation: 'copy' | 'cut' } | null>(
    null,
  );

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
    const projectPath = project?.explorerRoot ?? project?.path;
    if (!projectPath || projectPath === projectPathRef.current) return;
    projectPathRef.current = projectPath;

    window.api.invoke('fs:watch-dir', projectPath).catch((err) => {
      console.error('[FileExplore] Failed to start watcher:', err);
    });

    const normalize = (p: string) => p.replace(/\/+$/, '');
    const normalizedRoot = normalize(projectPath);

    const handler = (_event: any, payload: { dirPath: string }) => {
      const store = useCodeStore.getState();
      if (!store.currentProjectId) return;

      // Luôn bump dirVersion cho folder bị thay đổi (drives lazy-children refresh
      // của các TreeNode đang expanded).
      store.invalidateDir(store.currentProjectId, payload.dirPath);

      // Root-level nodes lấy từ `project.files` (initial scan), KHÔNG qua
      // lazyChildren — nên invalidateDir một mình không làm file mới xuất hiện
      // ở cấp gốc. Nếu event thuộc root project, re-scan toàn bộ tree.
      const changedDir = normalize(payload.dirPath);
      if (changedDir === normalizedRoot) {
        void refreshProjectTree(store.currentProjectId, projectPath);
      }
    };

    window.api.on('fs:dir-changed', handler);

    return () => {
      window.api.off('fs:dir-changed', handler);
      window.api.invoke('fs:unwatch-dir', projectPath).catch(() => {});
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
      navigator.clipboard.writeText(paths.join('\n')).catch(() => {});
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
  const visibleGitStatus = useMemo(() => {
    const dirKeys = new Set<string>();
    for (const p of Object.keys(gitStatus)) {
      let idx = p.lastIndexOf('/');
      while (idx > 0) {
        dirKeys.add(p.slice(0, idx));
        idx = p.lastIndexOf('/', idx - 1);
      }
    }
    const out: Record<string, GitFileStatus> = {};
    for (const [p, s] of Object.entries(gitStatus)) {
      if (dirKeys.has(p)) continue;
      if (ignoredPaths.some((ip) => p === ip || p.startsWith(`${ip}/`))) continue;
      out[p] = s;
    }
    return out;
  }, [gitStatus, ignoredPaths]);
  const ghostIndex = useMemo(() => {
    const index = buildGhostIndex(gitRoot ?? '', visibleGitStatus);

    return index;
  }, [gitRoot, gitStatus, visibleGitStatus]);

  useEffect(() => {
    if (!gitRoot) {
      setIgnoredPaths([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res: string[] = await window.api.invoke('git:ignored-paths', gitRoot);
        const next = Array.isArray(res) ? res : [];
        ignoredPathsCache.set(gitRoot, next);
        if (!cancelled) setIgnoredPaths(next);
      } catch {
        if (!cancelled) setIgnoredPaths([]);
      }
    };
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [gitRoot]);

  useEffect(() => {
    if (!gitRoot) {
      setGitStatus({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await window.api.invoke('git:status', gitRoot);
        if (cancelled) return;
        if (!res || res.error) {
          setGitStatus({});
          return;
        }
        const base = gitRoot.replace(/\/+$/, '');
        const map: Record<string, GitFileStatus> = {};
        for (const { path: rel, kind: status } of parseGitStatusOutput(String(res.output ?? ''))) {
          let abs = `${base}/${rel}`;
          map[abs] = status;
          const ancestorStatus: GitFileStatus = status === 'added' ? 'added' : 'modified';
          let idx = abs.lastIndexOf('/');
          while (idx > base.length) {
            abs = abs.slice(0, idx);
            if (ancestorStatus === 'modified' || !map[abs]) map[abs] = ancestorStatus;
            idx = abs.lastIndexOf('/');
          }
        }
        gitStatusCache.set(gitRoot, map);
        setGitStatus(map);
      } catch {
        if (!cancelled) setGitStatus({});
      }
    };
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [gitRoot]);

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
  const toolbar = (
    <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
      <span className="text-[13px] text-text-secondary truncate max-w-[50%]" title={project?.name}>
        {project?.name || 'No project'}
      </span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {project && gitRoot && (
          <ScopeWarnBell projectId={project.id} projectPath={gitRoot} onDone={handleRefresh} />
        )}
        {project && <ScopeFilterButton projectId={project.id} />}

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
  const contextValue = useMemo(
    () => ({
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
        <div ref={treeScrollRef} className="flex-1 overflow-y-auto py-1 relative">
          <ScopeBlocks
            containerRef={treeScrollRef}
            projectId={project.id}
            root={gitRoot ?? ''}
            gitStatus={visibleGitStatus}
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

        {selectedNodeIds.size > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-md bg-card-background px-3 py-1 text-xs text-text-secondary outline outline-1 outline-dashed outline-primary">
            <span className="whitespace-nowrap">{selectedNodeIds.size} selected · drag to add to message</span>
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

        <RemoteDiffModal
          isOpen={remoteDiffTarget !== null}
          onClose={() => setRemoteDiffTarget(null)}
          projectPath={gitRoot ?? ''}
          filePath={remoteDiffTarget}
        />
      </div>
    </FileExploreContext.Provider>
  );
}

export default FileExplore;
