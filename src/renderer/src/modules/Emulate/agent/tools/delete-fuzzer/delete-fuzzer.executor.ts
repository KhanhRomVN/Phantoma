import type { DeleteFuzzerParams } from './delete-fuzzer.parser';
import { emulateApi } from '@renderer/modules/Emulate/shared/api/emulate.api';
import { resolveFuzzer } from '@renderer/modules/Emulate/shared/utils/fuzzer-resolver.util';
import { runTool } from '@renderer/modules/Emulate/shared/utils/tool-result.util';

/** Execute delete_fuzzer tool — gọi emulateApi trực tiếp */
export async function executeDeleteFuzzer(
  params: DeleteFuzzerParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('delete_fuzzer', async () => {
    if (!params.fuzzer_id) throw new Error('fuzzer_id is required');

    const resolved = await resolveFuzzer('delete_fuzzer', params.fuzzer_id, contextTargetId);
    if (resolved.error !== undefined) return resolved.error;

    await emulateApi.deleteRequest(resolved.targetId, resolved.req.id);

    window.dispatchEvent(new CustomEvent('fuzzer-updated'));
    return `[delete_fuzzer] Removed ${params.fuzzer_id}`;
  });
}