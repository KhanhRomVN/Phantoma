import type { DeleteRepeaterParams } from '../parsers/DeleteRepeaterParser';
import { emulateApi } from '../services/emulate-api.service';
import { resolveRepeater } from '../utils/repeater-resolver.util';
import { runTool } from '../utils/tool-result.util';

/** Execute delete_repeater tool — gọi emulateApi trực tiếp */
export async function executeDeleteRepeater(
  params: DeleteRepeaterParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('delete_repeater', async () => {
    if (!params.repeater_id) throw new Error('repeater_id is required');

    const resolved = await resolveRepeater('delete_repeater', params.repeater_id, contextTargetId);
    if (resolved.error !== undefined) return resolved.error;

    await emulateApi.deleteRequest(resolved.targetId, resolved.req.id);

    window.dispatchEvent(new CustomEvent('repeater-updated'));
    return `[delete_repeater] Removed ${params.repeater_id}`;
  });
}