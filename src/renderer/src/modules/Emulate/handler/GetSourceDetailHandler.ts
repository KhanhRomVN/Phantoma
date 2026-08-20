/**
 * GetSourceDetailHandler — Trả về nội dung source code của một file.
 *
 * Usage:
 *   const handler = new GetSourceDetailHandler();
 *   const result = handler.handle(requests, unpackedScripts, 'example.com/assets/main.js');
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
   * Get source file detail by file path.
   * @param requests - All requests array
   * @param unpackedScripts - Unpacked script sources map
   * @param filePath - File path from list_sources output (e.g., 'example.com/assets/main.js')
   */
  public handle(
    requests: NetworkRequest[],
    unpackedScripts: Map<string, CdpScriptUnpackedData> | undefined,
    filePath: string,
  ): GetSourceDetailResult {
    // Build unfiltered flat file list with their full paths
    const allRequests = requests.filter((r) => r.url && r.url.length > 0);
    const tree = buildSourceTree(allRequests as any);
    const flatFiles: { node: SourceNode; fullPath: string }[] = [];

    const collectFiles = (node: SourceNode, parentPath: string) => {
      if (node.type === 'domain' || node.type === 'folder') {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.children) {
          for (const child of node.children) {
            collectFiles(child, currentPath);
          }
        }
      } else if (node.type === 'file') {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        flatFiles.push({ node, fullPath });
      }
    };
    for (const root of tree.roots) {
      collectFiles(root, '');
    }

    // Find file by path
    const match = flatFiles.find((f) => f.fullPath === filePath);

    if (!match) {
      return {
        text: `[get_source_detail] Error: source file "${filePath}" not found. Available files: ${flatFiles.map((f) => f.fullPath).slice(0, 10).join(', ')}${flatFiles.length > 10 ? '...' : ''}`,
        found: false,
      };
    }

    const file = match.node;

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
      `Path: ${filePath}`,
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
