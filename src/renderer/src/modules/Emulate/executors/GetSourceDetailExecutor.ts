import { useNetworkStore } from '../stores/networkStore';
import { collectSourceFiles, formatFileSize } from '../utils/source-files.util';
import { runTool } from '../utils/tool-result.util';

export interface GetSourceDetailParams {
  filepath: string;
}

const MAX_SOURCE_LENGTH = 50000;

/** Execute get_source_detail tool — đọc trực tiếp network store */
export async function executeGetSourceDetail(
  params: GetSourceDetailParams,
): Promise<string | null> {
  return runTool('get_source_detail', () => {
    if (!params.filepath) throw new Error('filepath is required');

    const { requests, unpackedScripts } = useNetworkStore.getState();
    const flatFiles = collectSourceFiles(requests);
    const match = flatFiles.find((f) => f.fullPath === params.filepath);

    if (!match) {
      return `[get_source_detail] Error: source file "${params.filepath}" not found. Available files: ${flatFiles
        .map((f) => f.fullPath)
        .slice(0, 10)
        .join(', ')}${flatFiles.length > 10 ? '...' : ''}`;
    }

    const file = match.node;
    const request = requests.find((r) => r.url === file.url);
    const sizeText = file.size ? formatFileSize(file.size) : 'unknown';

    let source: string | null = null;
    let sourceLabel = '';

    if (file.scriptId) {
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
      return `[get_source_detail] File: ${file.name}\nURL: ${file.url || 'N/A'}\nSize: ${sizeText}\n\nSource code not available (no response body captured).`;
    }

    const truncated = source.length > MAX_SOURCE_LENGTH;
    if (truncated) source = source.substring(0, MAX_SOURCE_LENGTH);

    return [
      `[get_source_detail] File: ${file.name}`,
      `Path: ${params.filepath}`,
      `URL: ${file.url || 'N/A'}`,
      `Size: ${sizeText}`,
      `Source: ${sourceLabel}`,
      truncated ? `Note: Source truncated at ${MAX_SOURCE_LENGTH} characters.` : '',
      '',
      source,
    ]
      .filter(Boolean)
      .join('\n');
  });
}