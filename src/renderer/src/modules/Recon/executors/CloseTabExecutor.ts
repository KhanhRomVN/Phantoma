import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { CloseTabParams } from '../parsers/CloseTabParser';

export async function executeCloseTab(
  params: CloseTabParams,
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

    const result = await ReconController.executeTool('close_tab', {
      targetId,
      tabId: params.tabId,
    });

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