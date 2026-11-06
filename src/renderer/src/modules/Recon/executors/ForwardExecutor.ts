import { useReconStore } from '../stores/useReconStore';
import { ForwardHandler } from '../handler/ForwardHandler';
import type { ForwardParams } from '../parsers/ForwardParser';

const handler = new ForwardHandler();

export async function executeForward(
  _params: ForwardParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Navigated forward',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate forward',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while navigating forward',
    };
  }
}