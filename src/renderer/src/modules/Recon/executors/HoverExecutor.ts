import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { HoverParams } from '../parsers/HoverParser';

export async function executeHover(
  params: HoverParams,
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

    const result = await ReconController.executeTool('hover', {
      targetId,
      ref: params.ref,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Hovered: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to hover',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while hovering',
    };
  }
}