import { useReconStore } from '../stores/useReconStore';
import { CloseTabHandler } from '../handler/CloseTabHandler';
import type { CloseTabParams } from '../parsers/CloseTabParser';

const handler = new CloseTabHandler();

export async function executeCloseTab(
  params: CloseTabParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.tabId);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tab closed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to close tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while closing tab',
    };
  }
}