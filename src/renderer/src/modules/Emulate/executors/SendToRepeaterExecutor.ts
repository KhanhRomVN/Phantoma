import type { SendToRepeaterParams } from '../parsers/SendToRepeaterParser';
import { emulateApi } from '../services/emulate-api.service';
import { useNetworkStore } from '../stores/networkStore';
import { runTool } from '../utils/tool-result.util';

/** Execute send_to_repeater tool — gọi emulateApi trực tiếp */
export async function executeSendToRepeater(
  params: SendToRepeaterParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('send_to_repeater', async () => {
    if (params.index === undefined) throw new Error('index is required');

    const requests = useNetworkStore.getState().requests;
    const arrayIndex = params.index - 1;
    if (arrayIndex < 0 || arrayIndex >= requests.length) {
      return `[send_to_repeater] Error: index ${params.index} out of range (1-${requests.length})`;
    }
    if (!contextTargetId) {
      return '[send_to_repeater] Error: targetId is required to save to database';
    }

    const req = requests[arrayIndex];
    const headers = Object.entries(req.requestHeaders || {}).map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    }));

    const res = await emulateApi.createRequest(contextTargetId, {
      method: req.method,
      url: req.url,
      body: req.requestBody || '',
      params: '[]',
      headers: JSON.stringify(headers, null, 2),
    });
    if (!res.success) {
      return `[send_to_repeater] Error: ${res.error || 'Failed to create request'}`;
    }

    window.dispatchEvent(new CustomEvent('repeater-updated'));
    return `[send_to_repeater] Added request_${params.index} to repeater (DB ID: ${res.data?.id})`;
  });
}