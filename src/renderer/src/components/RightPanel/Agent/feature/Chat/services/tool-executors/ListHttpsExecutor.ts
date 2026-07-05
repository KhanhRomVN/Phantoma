import { targetService } from '@renderer/services/TargetService';

export interface ListHttpsParams {
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
 * Lists captured HTTPS requests from the current emulate target
 */
export async function executeListHttps(
  params: ListHttpsParams,
): Promise<string | null> {
  try {
    // Get the list of requests from the target service
    // The requests are stored in the network events state
    // For now, we fetch from the API or use the global state
    
    // Use the global request list from the emulate store
    // In the actual implementation, we need to access the requests from the Emulate state
    // For now, we'll try to get them from window.__emulate_requests__ or similar
    
    const requests = (window as any).__emulate_requests__ || [];
    
    let filtered = requests;
    
    // Apply filters
    if (params.filter) {
      const { method, host, path, status } = params.filter;
      if (method) {
        filtered = filtered.filter((r: any) => 
          r.method?.toLowerCase() === method.toLowerCase()
        );
      }
      if (host) {
        filtered = filtered.filter((r: any) => 
          r.host?.toLowerCase().includes(host.toLowerCase())
        );
      }
      if (path) {
        filtered = filtered.filter((r: any) => 
          r.path?.toLowerCase().includes(path.toLowerCase())
        );
      }
      if (status !== undefined) {
        filtered = filtered.filter((r: any) => r.status === status);
      }
    }
    
    // Apply limit
    if (params.limit && params.limit > 0) {
      filtered = filtered.slice(0, params.limit);
    }
    
    // Format results with stt (index)
    const formatted = filtered.map((req: any, index: number) => ({
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
      return `[list_https] Result: No HTTPS requests found.`;
    }
    
    return `[list_https] Result: Found ${formatted.length} HTTPS request(s):\n\`\`\`json\n${JSON.stringify(formatted, null, 2)}\n\`\`\``;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return `[list_https] Error: ${errorMsg}`;
  }
}