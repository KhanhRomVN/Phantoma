import { useReconStore } from '../stores/useReconStore';
import { ListTabsHandler } from '../handler/ListTabsHandler';
import type { ListTabsParams } from '../parsers/ListTabsParser';

const handler = new ListTabsHandler();

export async function executeListTabs(
  _params: ListTabsParams,
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
        output: result.data?.output || 'Tabs listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list tabs',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing tabs',
    };
  }
}