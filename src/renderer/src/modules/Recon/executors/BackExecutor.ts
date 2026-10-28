import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { BackParams } from '../parsers/BackParser';

export async function executeBack(
  _params: BackParams,
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

    const result = await ReconController.executeTool('back', {
      targetId,
    });

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