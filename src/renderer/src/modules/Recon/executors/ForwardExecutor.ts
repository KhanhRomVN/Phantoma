import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ForwardParams } from '../parsers/ForwardParser';

export async function executeForward(
  _params: ForwardParams,
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

    const result = await ReconController.executeTool('forward', {
      targetId,
    });

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