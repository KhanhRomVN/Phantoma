/**
 * ListSourcesHandler — Trả về danh sách source files dạng cây thư mục.
 *
 * Usage:
 *   const handler = new ListSourcesHandler();
 *   const result = handler.handle(requests, { host: 'cdn.example.com', type: 'js' });
 *
 * Filter hỗ trợ: host, type
 * Kết quả trả về dạng text tree view để LLM dễ đọc.
 */

// TYPE
import { NetworkRequest } from '../types/inspector';

// UTIL
import { buildSourceTree, type SourceNode } from '../utils/source-tree.util';

export interface ListSourcesFilter {
  host?: string;
  type?: string;
}

export interface ListSourcesResult {
  total: number;
  text: string;
}

export class ListSourcesHandler {
  public handle(requests: NetworkRequest[], filter: ListSourcesFilter = {}): ListSourcesResult {
    // Step 1: Build unfiltered flat file list and assign stable indices (1-indexed)
    const allRequests = requests.filter((r) => r.url && r.url.length > 0);
    const unfilteredTree = buildSourceTree(allRequests as any);
    
    const allFlatFiles: SourceNode[] = [];
    const flattenUnfiltered = (nodes: SourceNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          allFlatFiles.push(node);
        }
        if (node.children) {
          flattenUnfiltered(node.children);
        }
      }
    };
    for (const root of unfilteredTree.roots) {
      flattenUnfiltered([root]);
    }

    // Create stable index map: URL -> stable index (1-indexed)
    const stableIndexMap = new Map<string, number>();
    allFlatFiles.forEach((file, idx) => {
      if (file.url) {
        stableIndexMap.set(file.url, idx + 1);
      }
    });

    // Step 2: Apply filters
    let filtered = allRequests;

    const filterType = filter.type?.toLowerCase();
    if (filterType) {
      filtered = filtered.filter((r) => r.type?.toLowerCase() === filterType);
    }

    const lowerHost = filter.host?.toLowerCase();
    if (lowerHost) {
      filtered = filtered.filter((r) => r.host?.toLowerCase().includes(lowerHost));
    }

    // Step 3: Build filtered tree
    const tree = buildSourceTree(filtered as any);

    // Step 4: Render tree with stable indices
    const lines: string[] = [];
    let visibleCount = 0;

    const renderNode = (node: SourceNode, depth: number, prefix: string) => {
      const indent = '  '.repeat(depth);
      if (node.type === 'domain') {
        lines.push(`${indent}${prefix}${node.name}/`);
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const isLast = i === node.children.length - 1;
            renderNode(child, depth + 1, isLast ? '└─ ' : '├─ ');
          }
        }
      } else if (node.type === 'folder') {
        lines.push(`${indent}${prefix}${node.name}/`);
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const isLast = i === node.children.length - 1;
            renderNode(child, depth + 1, isLast ? '└─ ' : '├─ ');
          }
        }
      } else if (node.type === 'file') {
        const stableIndex = node.url ? stableIndexMap.get(node.url) || 0 : 0;
        const sizeStr = node.size ? ` (${formatFileSize(node.size)})` : '';
        const line = `${indent}${prefix}stt=${stableIndex} ${node.name}${sizeStr}`;
        lines.push(line);
        visibleCount++;
      }
    };

    for (const root of tree.roots) {
      renderNode(root, 0, '');
    }

    const text = [
      `[list_sources] Total: ${allFlatFiles.length}, Filtered: ${visibleCount}`,
      ...lines
    ].join('\n');

    return {
      total: allFlatFiles.length,
      text,
    };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
