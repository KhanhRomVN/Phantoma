import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ScrollParams } from '../parsers/ScrollParser';

export async function executeScroll(
  params: ScrollParams,
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

    const result = await ReconController.executeTool('scroll', {
      targetId,
      direction: params.direction,
      amount: params.amount,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Scrolled ${params.direction}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to scroll',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while scrolling',
    };
  }
}