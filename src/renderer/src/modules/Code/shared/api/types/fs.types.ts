// Mirror of code/src/domain/api-types.ts
export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface FileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
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

export interface ReadDirEntry {
  name: string;
  type: 'file' | 'folder';
  size?: number;
}