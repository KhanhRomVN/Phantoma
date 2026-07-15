import { requestStorage } from '@renderer/services/IndexedDBStorage';

export interface ListHttpsParams {
  targetId?: string;
  filter?: {
    method?: string;
    host?: string;
    path?: string;
    status?: number;
  };
  limit?: number;
}

/**
 * Execute list_https tool
 * Lists captured HTTPS requests from the current emulate target via IndexedDB
 */
export async function executeListHttps(
  params: ListHttpsParams,
): Promise<string | null> {
  const { targetId, filter, limit } = params;

  console.log('[list_https] executeListHttps called:', { targetId, filter, limit });

  if (!targetId) {
    console.warn('[list_https] No targetId provided — no active emulate target');
    return `[list_https] Result: No active target. Please select or start an emulate target first.`;
  }

  try {
    console.log('[list_https] Fetching requests from IndexedDB for target:', targetId);
    const storedRequests = await requestStorage.getRequests(targetId, limit || 100, 0);
    console.log('[list_https] Fetched requests count:', storedRequests.length);

    let filtered = storedRequests;

    // Apply filters
    if (filter) {
      const { method, host, path, status } = filter;
      if (method) {
        filtered = filtered.filter((r) =>
          r.method?.toLowerCase() === method.toLowerCase(),
        );
      }
      if (host) {
        filtered = filtered.filter((r) =>
          r.host?.toLowerCase().includes(host.toLowerCase()),
        );
      }
      if (path) {
        filtered = filtered.filter((r) =>
          r.path?.toLowerCase().includes(path.toLowerCase()),
        );
      }
      if (status !== undefined) {
        filtered = filtered.filter((r) => r.status === status);
      }
      console.log('[list_https] After filter:', filtered.length, 'requests');
    }

    // Apply limit again after filter
    if (limit && limit > 0 && filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    // Format results with stt (index)
    const formatted = filtered.map((req, index) => ({
      stt: index,
      method: req.method || 'GET',
      host: req.host || '',
      path: req.path || '',
      url: req.url || '',
      status: req.status || 0,
      type: req.type || 'other',
      size: req.size || '0 B',
      time: req.time || '0ms',
      timestamp: req.timestamp || Date.now(),
    }));

    if (formatted.length === 0) {
      console.log('[list_https] No requests found for target:', targetId);
      return `[list_https] Result: No HTTPS requests found for target "${targetId}".`;
    }

    console.log('[list_https] Returning', formatted.length, 'requests');
    return `[list_https] Result: Found ${formatted.length} HTTPS request(s):\n\`\`\`json\n${JSON.stringify(formatted, null, 2)}\n\`\`\``;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[list_https] Error:', errorMsg);
    return `[list_https] Error: ${errorMsg}`;
  }
}