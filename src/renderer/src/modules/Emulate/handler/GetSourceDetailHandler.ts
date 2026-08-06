/**
 * GetSourceDetailHandler — Trả về nội dung source code của một file.
 *
 * Usage:
 *   const handler = new GetSourceDetailHandler();
 *   const result = handler.handle(requests, unpackedScripts, 3);
 *
 * Ưu tiên unpacked source nếu có, fallback về responseBody.
 */

// TYPE
import { NetworkRequest } from '../types/inspector';

// UTIL
import { buildSourceTree, type SourceNode } from '../utils/sourceTree';

// HOOK
import type { CdpScriptUnpackedData } from '../hooks/network/useNetworkEvents';

export interface GetSourceDetailResult {
  text: string;
  found: boolean;
}

export class GetSourceDetailHandler {
  public handle(
    requests: NetworkRequest[],
    unpackedScripts: Map<string, CdpScriptUnpackedData> | undefined,
    index: number,
  ): GetSourceDetailResult {
    // Build flat file list từ source tree
    const tree = buildSourceTree(requests.filter((r) => r.url && r.url.length > 0) as any);
    const flatFiles: SourceNode[] = [];

    const flatten = (nodes: SourceNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          flatFiles.push(node);
        }
        if (node.children) {
          flatten(node.children);
        }
      }
    };
    flatten(tree.roots);

    if (index < 0 || index >= flatFiles.length) {
      return {
        text: `[get_source_detail] Error: index ${index} out of range (0-${flatFiles.length - 1})`,
        found: false,
      };
    }

    const file = flatFiles[index];

    // Tìm request gốc để lấy responseBody
    const request = requests.find((r) => r.url === file.url);

    // Ưu tiên unpacked source
    let source: string | null = null;
    let sourceLabel = '';

    if (file.scriptId && unpackedScripts) {
      const unpacked = unpackedScripts.get(file.scriptId);
      if (unpacked?.unpackedSource) {
        source = unpacked.unpackedSource;
        sourceLabel = 'unpacked source';
      }
    }

    if (!source && request?.responseBody) {
      source =
        typeof request.responseBody === 'string'
          ? request.responseBody
          : JSON.stringify(request.responseBody);
      sourceLabel = 'original source';
    }

    if (!source) {
      return {
        text: `[get_source_detail] File: ${file.name}\nURL: ${file.url || 'N/A'}\nSize: ${file.size ? formatFileSize(file.size) : 'unknown'}\n\nSource code not available (no response body captured).`,
        found: true,
      };
    }

    // Giới hạn độ dài output
    const maxLen = 50000;
    const truncated = source.length > maxLen;
    if (truncated) {
      source = source.substring(0, maxLen);
    }

    const text = [
      `[get_source_detail] File: ${file.name}`,
      `URL: ${file.url || 'N/A'}`,
      `Size: ${file.size ? formatFileSize(file.size) : 'unknown'}`,
      `Source: ${sourceLabel}`,
      truncated ? `Note: Source truncated at ${maxLen} characters.` : '',
      ``,
      source,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      text,
      found: true,
    };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
