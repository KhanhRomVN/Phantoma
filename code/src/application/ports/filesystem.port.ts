import type { PathAccessPort } from './path-access.port';

import type { DirEntry, FileStat, TreeNode, SquareImage } from '../models/filesystem.types';

export type { DirEntry, FileStat, TreeNode, SquareImage };

export interface TreeOptions {
  depth: number;
  exclude: string[];
  hidden: boolean;
}

export interface FindFilesOptions {
  max?: number;
  exclude?: string[];
}

import type { GrepMatch, GrepData } from '../models/filesystem.types';

export type { GrepMatch, GrepData };

export interface GrepOptions {
  filePath?: string;
  folderPath?: string;
  maxFiles?: number;
  maxFileSize?: number;
  exclude?: string[];
  pathAccess: PathAccessPort;
}

export type FsOk = { success: boolean };

export interface FileSystemWritePort {
  listDir(dirPath: string): Promise<DirEntry[]>;
  writeFile(filePath: string, content: string): Promise<FsOk>;
  mkdir(dirPath: string): Promise<FsOk>;
  rename(oldPath: string, newPath: string): Promise<FsOk>;
  copy(src: string, dest: string): Promise<FsOk>;
  deleteFile(filePath: string): Promise<FsOk>;
  removeDir(dirPath: string): Promise<FsOk>;
}

export interface FileSystemReadPort {
  readFile(filePath: string): Promise<string>;
  readLines(filePath: string, start: number, end?: number): Promise<string>;
  read(filePath: string, range?: { start?: number; end?: number }): Promise<string>;
  stat(filePath: string): Promise<FileStat>;
  tree(dirPath: string, options: TreeOptions): Promise<TreeNode[]>;
  findFiles(root: string, pattern: string, options?: FindFilesOptions): Promise<Array<{ path: string }>>;
  grep(searchTerm: string, options: GrepOptions): Promise<GrepData>;
  listProjectFiles(root: string): Promise<{ files: string[] }>;
}

export interface ImagePort {
  scanSquareImages(projectPath: string): Promise<SquareImage[]>;
  readImageDataUrl(filePath: string): Promise<string | null>;
  downloadProjectLogo(url: string): Promise<{ success: boolean; path?: string; error?: string }>;
}