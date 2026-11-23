import type { DirEntry } from '../../../shared/api/types/fs.types';
import { useCodeStore, type FileNode } from '../../../shared/stores/code.store';
import { codeApi } from '../../../shared/api/code.api';
import { beginScan, endScan, lazyNodeRegistry, refreshInFlight } from './file-tree.cache';

export const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const compareDirEntries = (
  a: { name: string; isDirectory: boolean },
  b: { name: string; isDirectory: boolean },
): number => {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return nameCollator.compare(a.name, b.name) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
};

// Local helper to avoid circular dependency or missing export in AddProjectModal
export async function scanDirectory(dirPath: string): Promise<FileNode[]> {
  let entries: Array<{ name: string; path: string; isDirectory: boolean }> = [];
  try {
    entries = await codeApi.fs.listDir(dirPath);
  } catch {
    return [];
  }
  if (!Array.isArray(entries)) return [];

  return [...entries].sort(compareDirEntries).map((entry): FileNode => ({
    id: `fs_${entry.path}`,
    name: entry.name,
    type: entry.isDirectory ? 'folder' : 'file',
    path: entry.path,
    children: entry.isDirectory ? [] : undefined,
  }));
}

export const dirEntryToFileNode = (entry: DirEntry): FileNode => {
  const node: FileNode = {
    id: `fs_${entry.path}`,
    name: entry.name,
    type: entry.isDirectory ? 'folder' : 'file',
    path: entry.path,
    children: entry.isDirectory ? [] : undefined,
  };
  lazyNodeRegistry.set(node.id, node);
  return node;
};

export const fetchDirChildren = async (dirPath: string): Promise<FileNode[]> => {
  try {
    const entries = await codeApi.fs.listDir(dirPath);
    if (!entries || !Array.isArray(entries)) return [];

    return [...entries].sort(compareDirEntries).map(dirEntryToFileNode);
  } catch {
    return [];
  }
};

export function refreshProjectTree(projectId: string, projectPath: string): Promise<void> {
  const key = `${projectId}|${projectPath}`;
  const running = refreshInFlight.get(key);
  if (running) return running;
  const p = refreshProjectTreeImpl(projectId, projectPath).finally(() =>
    refreshInFlight.delete(key),
  );
  refreshInFlight.set(key, p);
  return p;
}

export async function refreshProjectTreeImpl(projectId: string, projectPath: string) {
  const { setProjectFiles } = useCodeStore.getState();
  beginScan();
  try {
    const files = await scanDirectory(projectPath);
    setProjectFiles(projectId, files);
  } finally {
    endScan();
  }
}

/** Tìm node theo id trong cây đệ quy */
export function findNodeInTree(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNodeInTree(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  return findNodeInTree(nodes, id) ?? lazyNodeRegistry.get(id) ?? null;
}

/** Thu thập tên + path của các node được chọn */
export function collectSelectedItems(
  nodes: FileNode[],
  selectedIds: Set<string>,
): { name: string; path: string; isFolder: boolean }[] {
  const result: { name: string; path: string; isFolder: boolean }[] = [];
  for (const n of nodes) {
    if (selectedIds.has(n.id)) {
      result.push({ name: n.name, path: n.path || '', isFolder: n.type === 'folder' });
    }
    if (n.children) result.push(...collectSelectedItems(n.children, selectedIds));
  }
  return result;
}
