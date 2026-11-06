import { useReconStore } from '../stores/useReconStore';
import { BackHandler } from '../handler/BackHandler';
import type { BackParams } from '../parsers/BackParser';

const handler = new BackHandler();

export async function executeBack(
  _params: BackParams,
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
        output: result.data?.output || 'Navigated back',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate back',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while navigating back',
    };
  }
}