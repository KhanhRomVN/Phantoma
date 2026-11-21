import { emulateApi } from '@renderer/modules/Emulate/shared/api/emulate.api';
import { runTool } from '@renderer/modules/Emulate/shared/utils/tool-result.util';
import { logger } from '@renderer/modules/Emulate/shared/utils/logger.util';

/** Execute list_fuzzers tool — gọi emulateApi trực tiếp */
export async function executeListFuzzers(
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('list_fuzzers', async () => {
    if (!contextTargetId) {
      return '[list_fuzzers] Error: targetId is required to query database';
    }

    const res = await emulateApi.listRequests(contextTargetId);
    if (!res.success) {
      return `[list_fuzzers] Error: ${res.error || 'Failed to fetch from database'}`;
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
        logger.warn('[ListFuzzersExecutor] Invalid URL:', req.url);
      }
      return `- fuzzer_${i} | ${req.method} | ${host} | ${path}`;
    });

    return `[list_fuzzers] Total: ${dbRequests.length}\n` + lines.join('\n');
  });
}