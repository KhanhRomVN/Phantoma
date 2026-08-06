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
import { buildSourceTree, type SourceNode } from '../utils/sourceTree';

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
    // Lọc requests có URL (chỉ source files mới có URL)
    let filtered = requests.filter((r) => r.url && r.url.length > 0);

    // Filter by type
    const filterType = filter.type?.toLowerCase();
    if (filterType) {
      filtered = filtered.filter((r) => r.type?.toLowerCase() === filterType);
    }

    // Filter by host
    const lowerHost = filter.host?.toLowerCase();
    if (lowerHost) {
      filtered = filtered.filter((r) => r.host?.toLowerCase().includes(lowerHost));
    }

    // Build source tree (cast to any vì NetworkRequest.size là string|number)
    const tree = buildSourceTree(filtered as any);

    // Render tree as text with sequential indices
    const lines: string[] = [];
    let index = 0;

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
        const sizeStr = node.size ? ` (${formatFileSize(node.size)})` : '';
        const line = `${indent}${prefix}stt=${index} ${node.name}${sizeStr}`;
        lines.push(line);
        index++;
      }
    };

    for (const root of tree.roots) {
      renderNode(root, 0, '');
    }

    const text = [`[list_sources] Total source files: ${index}`, ...lines].join('\n');

    return {
      total: index,
      text,
    };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
