import { getExt, kindOf } from './fileTypes';
import type { FileFilter, FileNode, FileSort, FolderNode, FsNode } from './fileTypes';

// Auto-loads every file in mock/<mockFolder>/files: adding/removing files needs no import changes.
// Text is loaded with ?raw (preview + downloadable); media is loaded with ?url.
const RAW_MODULES = import.meta.glob('../../../mock/**/files/**/*.{md,js,ts,json,txt,csv,html,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const URL_MODULES = import.meta.glob(
  '../../../mock/**/files/**/*.{png,jpg,jpeg,gif,webp,svg,mp4,webm,mp3,wav,pdf}',
  { query: '?url', import: 'default', eager: true }
) as Record<string, string>;

// Glob has no real mtime so the module load time is used — upgrade path: read mtime over IPC when a real store exists.
const LOADED_AT = new Date().toISOString();

export interface FileSystem {
  nodes: FsNode[];
  byPath: Map<string, FsNode>;
}

const cache = new Map<string, FileSystem>();

/** Strips the leading '.../mock/<mockFolder>/files/' part and returns the path relative to the store. */
function relativePath(modulePath: string, mockFolder: string): string | null {
  const marker = `/mock/${mockFolder}/files/`;
  const idx = modulePath.indexOf(marker);
  return idx === -1 ? null : modulePath.slice(idx + marker.length);
}

function parentOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Builds the virtual (read-only) file store from mock/<mockFolder>/files; the result is cached per mockFolder. */
export function getFileSystem(mockFolder = 'mock1'): FileSystem {
  const hit = cache.get(mockFolder);
  if (hit) return hit;

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

  const addFile = (modulePath: string, content?: string, url?: string) => {
    const rel = relativePath(modulePath, mockFolder);
    if (!rel) return;
    const parentPath = parentOf(rel);
    ensureFolder(parentPath);
    const name = nameOf(rel);
    const ext = getExt(name);
    const file: FileNode = {
      type: 'file',
      id: rel,
      name,
      path: rel,
      parentPath,
      ext,
      kind: kindOf(ext),
      size: content !== undefined ? new TextEncoder().encode(content).length : undefined,
      modified: LOADED_AT,
      content,
      url,
    };
    byPath.set(rel, file);
  };

  Object.entries(RAW_MODULES).forEach(([p, content]) => addFile(p, content));
  Object.entries(URL_MODULES).forEach(([p, url]) => addFile(p, undefined, url));

  const fs: FileSystem = { nodes: [...byPath.values()], byPath };
  cache.set(mockFolder, fs);
  return fs;
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