import type { FileSystemWritePort, DirEntry, FsOk } from '../../ports/filesystem.port';
import type { PathAccessPort } from '../../ports/path-access.port';

export class FsWriteService {
  constructor(
    private readonly fsWrite: FileSystemWritePort,
    private readonly pathAccess: PathAccessPort,
  ) {}

  async listDir(rawPath: unknown): Promise<DirEntry[]> {
    const dirPath = this.pathAccess.safePath(rawPath, 'path');
    return this.fsWrite.listDir(dirPath);
  }

  async writeFile(rawPath: unknown, content: string, allowSensitive: boolean): Promise<FsOk> {
    const filePath = this.pathAccess.safePath(rawPath, 'path', {
      write: true,
      withinProject: true,
      allowSensitive,
    });
    return this.fsWrite.writeFile(filePath, content);
  }

  async mkdir(rawPath: unknown): Promise<FsOk> {
    const dirPath = this.pathAccess.safePath(rawPath, 'path', { write: true });
    return this.fsWrite.mkdir(dirPath);
  }

  async rename(rawOldPath: unknown, rawNewPath: unknown): Promise<FsOk> {
    const oldPath = this.pathAccess.safePath(rawOldPath, 'oldPath', { write: true, withinProject: true });
    const newPath = this.pathAccess.safePath(rawNewPath, 'newPath', { write: true, withinProject: true });
    return this.fsWrite.rename(oldPath, newPath);
  }

  async copy(rawSrc: unknown, rawDest: unknown): Promise<FsOk> {
    const src = this.pathAccess.safePath(rawSrc, 'src', { withinProject: true });
    const dest = this.pathAccess.safePath(rawDest, 'dest', { write: true, withinProject: true });
    return this.fsWrite.copy(src, dest);
  }

  async deleteFile(rawPath: unknown): Promise<FsOk> {
    const filePath = this.pathAccess.safePath(rawPath, 'path', { write: true, withinProject: true });
    return this.fsWrite.deleteFile(filePath);
  }

  async removeDir(rawPath: unknown): Promise<FsOk> {
    const dirPath = this.pathAccess.safePath(rawPath, 'path', { write: true, withinProject: true });
    return this.fsWrite.removeDir(dirPath);
  }
}