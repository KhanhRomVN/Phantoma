// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { request } from '../client';

// ── Types ──
import type { DirEntry, FileStat, TreeNode, SquareImage, ReadDirEntry } from '../types/fs.types';

// ─── Constants ───────────────────────────────────────────────────────────────
export const fsApi = {
  listDir: (path: string) =>
    request<DirEntry[]>('GET', `/fs/list-dir?path=${encodeURIComponent(path)}`),
  readDir: async (path: string): Promise<ReadDirEntry[]> => {
    const entries = await request<DirEntry[]>('GET', `/fs/list-dir?path=${encodeURIComponent(path)}`);
    return entries.map((e) => ({ name: e.name, type: e.isDirectory ? 'folder' : 'file', size: e.size }));
  },
  writeFile: (path: string, content: string, allowSensitive = false) =>
    request<{ success: boolean }>('POST', '/fs/write-file', { path, content, allowSensitive }),
  readFile: (path: string, trusted = false, range?: { start: number; end?: number }) => {
    const q = new URLSearchParams({ path });
    if (trusted) q.set('trusted', 'true');
    if (range) {
      q.set('start', String(range.start));
      if (range.end !== undefined) q.set('end', String(range.end));
    }
    return request<string>('GET', `/fs/read-file?${q.toString()}`);
  },
  grep: (
    searchTerm: string,
    target: { filePath?: string; folderPath?: string },
    options: { maxFiles?: number; maxFileSize?: number; exclude?: string[] } = {},
  ) =>
    request<{
      searchTerm: string;
      pattern: string;
      results: Record<string, { matches: Array<{ lineNumber: number; lineContent: string }> }>;
      totalFilesSearched: number;
      totalMatches: number;
      filesSkippedSize?: number;
    }>('POST', '/fs/grep', { searchTerm, ...target, ...options }),
  stat: (path: string, trusted = false) =>
    request<FileStat>('GET', `/fs/stat?path=${encodeURIComponent(path)}${trusted ? '&trusted=true' : ''}`),
  tree: (path: string, depth = 1, options: { exclude?: string[]; hidden?: boolean } = {}) => {
    const q = new URLSearchParams({ path, depth: String(depth) });
    if (options.exclude?.length) q.set('exclude', options.exclude.join(','));
    if (options.hidden === false) q.set('hidden', 'false');
    return request<TreeNode[]>('GET', `/fs/tree?${q.toString()}`);
  },
  findFiles: (root: string, pattern: string, options: { max?: number; exclude?: string[] } = {}) => {
    const q = new URLSearchParams({ root, pattern });
    if (options.max) q.set('max', String(options.max));
    if (options.exclude?.length) q.set('exclude', options.exclude.join(','));
    return request<Array<{ path: string }>>('GET', `/fs/find-files?${q.toString()}`);
  },
  listProjectFiles: (root: string) =>
    request<{ files: string[] }>('GET', `/fs/list-project-files?root=${encodeURIComponent(root)}`),
  scanSquareImages: (root: string) =>
    request<SquareImage[]>('GET', `/fs/scan-square-images?root=${encodeURIComponent(root)}`),
  image: (path: string, side?: number) =>
    request<string | null>(
      'GET',
      `/fs/image?path=${encodeURIComponent(path)}${side ? `&side=${side}` : ''}`,
    ),
  downloadLogo: (url: string) =>
    request<{ success: boolean; path?: string; error?: string }>('POST', '/projects/logo/download', { url }),
  mkdir: (path: string) => request<{ success: boolean }>('POST', '/fs/mkdir', { path }),
  rename: (oldPath: string, newPath: string) =>
    request<{ success: boolean }>('POST', '/fs/rename', { oldPath, newPath }),
  copy: (src: string, dest: string) =>
    request<{ success: boolean }>('POST', '/fs/copy', { src, dest }),
  deleteFile: (path: string) =>
    request<{ success: boolean }>('DELETE', `/fs/delete-file?path=${encodeURIComponent(path)}`),
  removeDir: (path: string) =>
    request<{ success: boolean }>('DELETE', `/fs/remove-dir?path=${encodeURIComponent(path)}`),
};
