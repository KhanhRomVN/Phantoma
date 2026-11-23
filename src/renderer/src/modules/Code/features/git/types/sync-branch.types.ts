export type FileStatus = 'added' | 'modified' | 'deleted';

export type SourceKind = 'local' | 'remote';

export interface SourceOption {
  name: string;
  kind: SourceKind;
}

export interface SyncFile {
  path: string;
  status: FileStatus;
  added: number;
  deleted: number;
}

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: SyncFile;
  added: number;
  deleted: number;
  files: string[];
}

export interface SyncBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPath: string;
  projectName: string;
  currentBranch: string;
  branches: string[];
  onApplied: (count: number, source: string) => void;
  fixedSource?: { ref: string; label: string };
  targets?: { name: string; path: string }[];
  projectId?: string;
  defaultBranch?: string;
}
