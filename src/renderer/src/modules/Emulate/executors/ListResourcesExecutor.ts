import { useNetworkStore } from '../stores/networkStore';
import { buildResourceItems } from '../utils/resource-items.util';
import { runTool } from '../utils/tool-result.util';

export interface ListResourcesParams {
  filter?: { type?: string };
}

/** Execute list_resources tool — đọc trực tiếp network store */
export async function executeListResources(params: ListResourcesParams): Promise<string | null> {
  return runTool('list_resources', () => {
    const items = buildResourceItems(useNetworkStore.getState().requests);
    const filterType = params.filter?.type?.toLowerCase();
    const filtered = filterType
      ? items.filter((item) => item.type.toLowerCase() === filterType)
      : items;

    const lines = filtered.map(
      (item) => `- ${item.filename} (${item.type}, ${item.size}, ${item.contentType})`,
    );

    return [
      `[list_resources] Total: ${items.length}, Filtered: ${filtered.length}`,
      '',
      ...lines,
    ].join('\n');
  });
}