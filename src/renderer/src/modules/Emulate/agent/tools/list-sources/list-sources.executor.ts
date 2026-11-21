import { useNetworkStore } from '@renderer/modules/Emulate/features/traffic/stores/network.store';
import { collectSourceFiles, formatFileSize } from '@renderer/modules/Emulate/shared/utils/source-files.util';
import { runTool } from '@renderer/modules/Emulate/shared/utils/tool-result.util';

export interface ListSourcesParams {
  filter?: { host?: string; type?: string };
}

/** Execute list_sources tool — đọc trực tiếp network store */
export async function executeListSources(params: ListSourcesParams): Promise<string | null> {
  return runTool('list_sources', () => {
    const { host, type } = params.filter || {};
    const requests = useNetworkStore.getState().requests;

    let filtered = requests.filter((r) => r.url && r.url.length > 0);
    const filterType = type?.toLowerCase();
    if (filterType) {
      filtered = filtered.filter((r) => r.type?.toLowerCase() === filterType);
    }
    const lowerHost = host?.toLowerCase();
    if (lowerHost) {
      filtered = filtered.filter((r) => r.host?.toLowerCase().includes(lowerHost));
    }

    const lines = collectSourceFiles(filtered).map(
      ({ node, fullPath }) => `- ${fullPath}${node.size ? ` (${formatFileSize(node.size)})` : ''}`,
    );

    return [
      `[list_sources] Total: ${collectSourceFiles(requests).length}, Filtered: ${lines.length}`,
      '',
      ...lines,
    ].join('\n');
  });
}