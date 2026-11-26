import { filterRequestsByConfig } from '../hooks/useRequestFilter';
import { useFilterStore } from '../stores/filterStore';
import { useNetworkStore } from '../stores/networkStore';
import { runTool } from '../utils/tool-result.util';

export interface ListHttpsParams {
  filter?: { method?: string; host?: string; path?: string; status?: number };
  limit?: number;
}

/** Execute list_https tool — đọc trực tiếp network/filter store */
export async function executeListHttps(params: ListHttpsParams): Promise<string | null> {
  return runTool('list_https', () => {
    const { method, host, path, status } = params.filter || {};
    const limit = params.limit || 50;

    const allRequests = useNetworkStore.getState().requests;
    const uiFilter = useFilterStore.getState().filter;
    const requests = uiFilter ? filterRequestsByConfig(allRequests, uiFilter, '') : allRequests;

    const stableIndexMap = new Map<string, number>();
    allRequests.forEach((r, idx) => stableIndexMap.set(r.id, idx + 1));

    const lowerMethod = method?.toUpperCase();
    const lowerHost = host?.toLowerCase();
    const lowerPath = path?.toLowerCase();

    let filtered = requests;
    if (lowerMethod) {
      filtered = filtered.filter((r) => r.method.toUpperCase() === lowerMethod);
    }
    if (lowerHost) {
      filtered = filtered.filter((r) => r.host?.toLowerCase().includes(lowerHost));
    }
    if (lowerPath) {
      filtered = filtered.filter((r) => r.path?.toLowerCase().includes(lowerPath));
    }
    if (status !== undefined) {
      filtered = filtered.filter((r) => r.status === status);
    }

    const limited = filtered.slice(0, limit);
    const rows = limited.map(
      (r) =>
        `- request_${stableIndexMap.get(r.id) || 0} | ${r.method} | ${r.status ?? '---'} | ${r.host || ''} | ${r.path || ''} | ${r.size || 'Unknown'}`,
    );

    return [
      `[list_https] Total: ${requests.length}, Filtered: ${filtered.length}, Showing: ${limited.length}`,
      ...rows,
    ].join('\n');
  });
}