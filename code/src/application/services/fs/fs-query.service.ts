import type {
  FileSystemReadPort,
  FileStat,
  TreeNode,
  TreeOptions,
  FindFilesOptions,
  GrepData,
  GrepOptions,
} from '../../ports/filesystem.port';
import type { PathAccessPort } from '../../ports/path-access.port';

export class FsQueryService {
  constructor(
    private readonly fsRead: FileSystemReadPort,
    private readonly pathAccess: PathAccessPort,
  ) {}

  async readFile(rawPath: unknown, trusted: boolean): Promise<string> {
    const filePath = this.pathAccess.safePath(rawPath, 'path', {
      withinProject: !trusted,
      allowSensitive: trusted,
    });
    return this.fsRead.readFile(filePath);
  }

  async readLines(rawPath: unknown, start: number, end: number | undefined, trusted: boolean): Promise<string> {
    const filePath = this.pathAccess.safePath(rawPath, 'path', {
      withinProject: !trusted,
      allowSensitive: trusted,
    });
    return this.fsRead.readLines(filePath, start, end);
  }

  async read(rawPath: unknown, range: { start?: number; end?: number } | undefined, trusted: boolean): Promise<string> {
    const filePath = this.pathAccess.safePath(rawPath, 'path', {
      withinProject: !trusted,
      allowSensitive: trusted,
    });
    return this.fsRead.read(filePath, range);
  }

  async stat(rawPath: unknown, trusted: boolean): Promise<FileStat> {
    const filePath = this.pathAccess.safePath(rawPath, 'path', {
      withinProject: !trusted,
      allowSensitive: trusted,
    });
    return this.fsRead.stat(filePath);
  }

  async tree(rawPath: unknown, options: TreeOptions): Promise<TreeNode[]> {
    const dirPath = this.pathAccess.safePath(rawPath, 'path', { withinProject: true });
    return this.fsRead.tree(dirPath, options);
  }

  async findFiles(rawRoot: unknown, pattern: string, options?: FindFilesOptions): Promise<Array<{ path: string }>> {
    const root = this.pathAccess.safePath(rawRoot, 'root', { withinProject: true });
    return this.fsRead.findFiles(root, pattern, options);
  }

  async grep(searchTerm: string, rawPath: unknown, isFolder: boolean, maxFiles?: number, maxFileSize?: number, exclude?: string[]): Promise<GrepData> {
    const resolvedPath = this.pathAccess.safePath(rawPath, 'path', { withinProject: true });
    const options: GrepOptions = {
      ...(isFolder ? { folderPath: resolvedPath } : { filePath: resolvedPath }),
      maxFiles,
      maxFileSize,
      exclude,
      pathAccess: this.pathAccess,
    };
    return this.fsRead.grep(searchTerm, options);
  }

  async listProjectFiles(rawRoot: unknown): Promise<{ files: string[] }> {
    const root = this.pathAccess.safePath(rawRoot, 'root', { withinProject: true });
    return this.fsRead.listProjectFiles(root);
  }
}