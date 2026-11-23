export type GitFileStatus = 'added' | 'modified' | 'deleted';

export type GhostIndex = Map<string, Map<string, 'file' | 'folder'>>;

// ─── FileExplorer Context ────────────────────────────────────────────────────
export interface CreatingState {
  nodeId: string;
  parentPath: string;
  type: 'file' | 'folder';
}

export interface NodeMeta {
  path: string;
  name: string;
  isFolder: boolean;
}

export interface FileExplorerContextValue {
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
  scopeBranch: string;
  nodeScope: string[];
  scopeRoot: string;
}
