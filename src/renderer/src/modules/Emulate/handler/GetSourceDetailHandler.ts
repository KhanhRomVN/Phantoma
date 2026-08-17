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
import { buildSourceTree, type SourceNode } from '../utils/source-tree.util';

// HOOK
import type { CdpScriptUnpackedData } from '../hooks/network/useNetworkEvents';

export interface GetSourceDetailResult {
  text: string;
  found: boolean;
}

export class GetSourceDetailHandler {
  /**
   * Get source file detail by stable index (1-indexed).
   * @param requests - All requests array
   * @param unpackedScripts - Unpacked script sources map
   * @param stableIndex - 1-indexed position from list_sources output
   */
  public handle(
    requests: NetworkRequest[],
    unpackedScripts: Map<string, CdpScriptUnpackedData> | undefined,
    stableIndex: number,
  ): GetSourceDetailResult {
    // Build unfiltered flat file list with stable indices (same logic as ListSourcesHandler)
    const allRequests = requests.filter((r) => r.url && r.url.length > 0);
    const tree = buildSourceTree(allRequests as any);
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

    // Convert 1-indexed stable index to 0-indexed array position
    const arrayIndex = stableIndex - 1;

    if (arrayIndex < 0 || arrayIndex >= flatFiles.length) {
      return {
        text: `[get_source_detail] Error: index ${stableIndex} out of range (1-${flatFiles.length})`,
        found: false,
      };
    }

    const file = flatFiles[arrayIndex];

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
      `[get_source_detail] File: ${file.name} (stt=${stableIndex})`,
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
