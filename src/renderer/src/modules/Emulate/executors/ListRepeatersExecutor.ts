import { emulateApi } from '../services/emulate-api.service';
import { runTool } from '../utils/tool-result.util';

/** Execute list_repeaters tool — gọi emulateApi trực tiếp */
export async function executeListRepeaters(
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('list_repeaters', async () => {
    if (!contextTargetId) {
      return '[list_repeaters] Error: targetId is required to query database';
    }

    const res = await emulateApi.listRequests(contextTargetId);
    if (!res.success) {
      return `[list_repeaters] Error: ${res.error || 'Failed to fetch from database'}`;
    }

    const dbRequests = res.data || [];
    const lines = dbRequests.map((req: any, i: number) => {
      let host = '';
      let path = '';
      try {
        const url = new URL(req.url);
        host = url.host;
        path = url.pathname + url.search;
      } catch {
        console.warn('[ListRepeatersExecutor] Invalid URL:', req.url);
      }
      return `- repeater_${i} | ${req.method} | ${host} | ${path}`;
    });

    return `[list_repeaters] Total: ${dbRequests.length}\n` + lines.join('\n');
  });
}