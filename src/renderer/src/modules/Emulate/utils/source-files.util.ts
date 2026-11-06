/**
 * ------------------------------------------------------------------
 * Source Files Util
 * ------------------------------------------------------------------
 * Làm phẳng cây source thành danh sách file kèm full path. Dùng chung
 * cho list_sources và get_source_detail.
 *
 * Các functions chính:
 * - collectSourceFiles() : Danh sách file (node + fullPath) từ requests
 * - formatFileSize()     : Định dạng dung lượng file
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { NetworkRequest } from '../types/inspector';

// ── Utils ──
import { buildSourceTree, type SourceNode } from './source-tree.util';

// ─── Types ──────────────────────────────────────────────────────────────
export interface SourceFileEntry {
  node: SourceNode;
  fullPath: string;
}

// ─── Functions ──────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function collectSourceFiles(requests: NetworkRequest[]): SourceFileEntry[] {
  const withUrl = requests.filter((r) => r.url && r.url.length > 0);
  const tree = buildSourceTree(withUrl as any);
  const files: SourceFileEntry[] = [];

  const walk = (node: SourceNode, parentPath: string) => {
    if (node.type === 'domain' || node.type === 'folder') {
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      node.children?.forEach((child) => walk(child, currentPath));
    } else if (node.type === 'file') {
      files.push({ node, fullPath: parentPath ? `${parentPath}/${node.name}` : node.name });
    }
  };
  tree.roots.forEach((root) => walk(root, ''));

  return files;
}