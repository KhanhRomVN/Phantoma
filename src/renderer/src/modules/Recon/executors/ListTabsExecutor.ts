import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ListTabsParams } from '../parsers/ListTabsParser';

export async function executeListTabs(
  _params: ListTabsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('list_tabs', { targetId });

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