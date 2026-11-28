import { promises as fs } from 'fs';
import type { FilePort, FileStatLike } from '../../application/ports/file-access.port';

export class NodeFileAdapter implements FilePort {
  readText(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
  }

  writeFile(filePath: string, content: string, mode?: number): Promise<void> {
    return fs.writeFile(filePath, content, mode === undefined ? undefined : { mode });
  }

  async mkdirp(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  realpath(targetPath: string): Promise<string> {
    return fs.realpath(targetPath);
  }

  exists(targetPath: string): Promise<boolean> {
    return fs.access(targetPath).then(
      () => true,
      () => false,
    );
  }

  stat(targetPath: string): Promise<FileStatLike> {
    return fs.stat(targetPath);
  }

  copyFile(src: string, dest: string): Promise<void> {
    return fs.copyFile(src, dest);
  }

  chmod(targetPath: string, mode: number): Promise<void> {
    return fs.chmod(targetPath, mode);
  }

  unlink(filePath: string): Promise<void> {
    return fs.unlink(filePath);
  }

  remove(targetPath: string): Promise<void> {
    return fs.rm(targetPath, { force: true });
  }
}