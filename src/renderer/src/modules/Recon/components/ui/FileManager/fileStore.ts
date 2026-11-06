import { getExt, kindOf } from './fileTypes';
import type { FileFilter, FileNode, FileSort, FolderNode, FsNode } from './fileTypes';

export interface FileSystem {
  nodes: FsNode[];
  byPath: Map<string, FsNode>;
}

/** Một file đọc từ thư mục `files/` của target (text hoặc binary base64). */
export interface RawFsEntry {
  path: string;
  size: number;
  modified: string;
  content?: string;
  base64?: string;
  mime?: string;
}

function parentOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Dựng FileSystem (read-only) từ danh sách file thật của target. */
export function buildFileSystem(entries: RawFsEntry[]): FileSystem {
  const byPath = new Map<string, FsNode>();

  const ensureFolder = (path: string) => {
    // Create each level in turn: 'a/b/c' -> 'a', 'a/b', 'a/b/c'
    const parts = path.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      const parent = acc;
      acc = acc ? `${acc}/${part}` : part;
      if (!byPath.has(acc)) {
        const folder: FolderNode = { type: 'folder', id: acc, name: part, path: acc, parentPath: parent };
        byPath.set(acc, folder);
      }
    }
  };

  for (const entry of entries) {
    const rel = entry.path;
    if (!rel) continue;
    const parentPath = parentOf(rel);
    ensureFolder(parentPath);
    const name = nameOf(rel);
    const ext = getExt(name);
    const url =
      entry.base64 && entry.mime
        ? `data:${entry.mime};base64,${entry.base64}`
        : undefined;
    const file: FileNode = {
      type: 'file',
      id: rel,
      name,
      path: rel,
      parentPath,
      ext,
      kind: kindOf(ext),
      size: entry.size,
      modified: entry.modified,
      content: entry.content,
      url,
    };
    byPath.set(rel, file);
  }

  return { nodes: [...byPath.values()], byPath };
}

/** Direct children of a folder ('' = root). */
export function listChildren(fs: FileSystem, path: string): FsNode[] {
  return fs.nodes.filter((n) => (n.type === 'folder' ? n.parentPath : n.parentPath) === path);
}

/** Every file under a folder, including all sub levels. */
export function listDescendantFiles(fs: FileSystem, path: string): FileNode[] {
  const prefix = path ? `${path}/` : '';
  return fs.nodes.filter((n): n is FileNode => n.type === 'file' && n.path.startsWith(prefix));
}

/** Folder chain from the root to path, used for the breadcrumb. */
export function getBreadcrumbs(path: string): { name: string; path: string }[] {
  const parts = path.split('/').filter(Boolean);
  return parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join('/') }));
}

/** Filters by query / kind / extension. When filtering by kind or extension, folders are hidden (only matching files remain). */
export function applyFilter(nodes: FsNode[], filter?: FileFilter): FsNode[] {
  if (!filter) return nodes;
  const q = filter.query?.trim().toLowerCase();
  const kinds = filter.kinds?.length ? new Set(filter.kinds) : null;
  const exts = filter.exts?.length ? new Set(filter.exts.map((e) => e.toLowerCase())) : null;

  return nodes.filter((n) => {
    if (q && !n.name.toLowerCase().includes(q)) return false;
    if (n.type === 'folder') return !kinds && !exts;
    if (kinds && !kinds.has(n.kind)) return false;
    if (exts && !exts.has(n.ext)) return false;
    return true;
  });
}

/** Sorts; folders always come before files. */
export function applySort(nodes: FsNode[], sort: FileSort = { key: 'name', dir: 'asc' }): FsNode[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const cmpName = (a: FsNode, b: FsNode) => a.name.localeCompare(b.name, 'en', { numeric: true });

  const compare = (a: FsNode, b: FsNode): number => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (a.type === 'folder' || b.type === 'folder') return cmpName(a, b) * sign;
    switch (sort.key) {
      case 'kind':
        return (a.kind.localeCompare(b.kind) || cmpName(a, b)) * sign;
      case 'size':
        return ((a.size ?? -1) - (b.size ?? -1) || cmpName(a, b)) * sign;
      case 'modified':
        return (a.modified.localeCompare(b.modified) || cmpName(a, b)) * sign;
      default:
        return cmpName(a, b) * sign;
    }
  };

  return [...nodes].sort(compare);
}

/** Downloads a file to the machine (only files that have content or a url). */
export function downloadFile(file: FileNode): void {
  const href =
    file.content !== undefined
      ? URL.createObjectURL(new Blob([file.content], { type: 'text/plain;charset=utf-8' }))
      : file.url;
  if (!href) return;
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (file.content !== undefined) URL.revokeObjectURL(href);
}