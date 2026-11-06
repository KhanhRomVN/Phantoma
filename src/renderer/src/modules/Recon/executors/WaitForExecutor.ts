import { useReconStore } from '../stores/useReconStore';
import { WaitForHandler } from '../handler/WaitForHandler';
import type { WaitForParams } from '../parsers/WaitForParser';

const handler = new WaitForHandler();

export async function executeWaitFor(
  params: WaitForParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(
      targetId,
      params.condition,
      params.ref,
      params.text,
      params.timeoutMs,
    );

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Waited for: ${params.condition}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to wait',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while waiting',
    };
  }
}