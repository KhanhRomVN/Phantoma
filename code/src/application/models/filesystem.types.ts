// Filesystem domain types - owned by Application layer

export interface DirEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface FileStat {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  mtime: number;
  ctime: number;
}

export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: TreeNode[];
}

export interface SquareImage {
  path: string;
  name: string;
  width: number;
  height: number;
  size: number;
}

export interface GrepMatch {
  lineNumber: number;
  lineContent: string;
}

export interface GrepData {
  searchTerm: string;
  pattern: string;
  results: Record<string, { matches: GrepMatch[] }>;
  totalFilesSearched: number;
  totalMatches: number;
  filesSkippedSize?: number;
}