import { promises as fs } from 'fs';
import type { Stats } from 'fs';
import path from 'path';
import type { DirEntry } from '../../domain/api-types';

export type { DirEntry };

type Ok = { success: boolean };

async function safeStat(p: string): Promise<Stats | null> {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

async function run<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    throw new Error(`Failed to ${label}: ${err.message}`);
  }
}

export const fsService = {
  listDir: (dirPath: string): Promise<DirEntry[]> =>
    run('list directory', async () => {
      const names = await fs.readdir(dirPath);
      const entries = await Promise.all(
        names.map(async (name): Promise<DirEntry | null> => {
          const fullPath = path.join(dirPath, name);
          const stat = await safeStat(fullPath);
          if (!stat) return null;
          return {
            name,
            path: fullPath,
            isDirectory: stat.isDirectory(),
            size: stat.size,
            mtime: stat.mtimeMs,
          };
        }),
      );
      return entries.filter((e): e is DirEntry => e !== null);
    }),

  writeFile: (filePath: string, content: string): Promise<Ok> =>
    run('write file', async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    }),

  mkdir: (dirPath: string): Promise<Ok> =>
    run('create directory', async () => {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    }),

  rename: (oldPath: string, newPath: string): Promise<Ok> =>
    run('rename', async () => {
      await fs.rename(oldPath, newPath);
      return { success: true };
    }),

  copy: (src: string, dest: string): Promise<Ok> =>
    run('copy', async () => {
      await fs.cp(src, dest, { recursive: true });
      return { success: true };
    }),

  deleteFile: (filePath: string): Promise<Ok> =>
    run('delete file', async () => {
      await fs.unlink(filePath);
      return { success: true };
    }),

  removeDir: (dirPath: string): Promise<Ok> =>
    run('remove directory', async () => {
      await fs.rm(dirPath, { recursive: true, force: true });
      return { success: true };
    }),
};