import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ScrollToElementParams } from '../parsers/ScrollToElementParser';

export async function executeScrollToElement(
  params: ScrollToElementParams,
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

    const result = await ReconController.executeTool('scroll_to_element', {
      targetId,
      ref: params.ref,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Scrolled to element: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to scroll to element',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while scrolling to element',
    };
  }
}