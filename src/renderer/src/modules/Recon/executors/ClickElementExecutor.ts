import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ClickElementParams } from '../parsers/ClickElementParser';

export async function executeClickElement(
  params: ClickElementParams,
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

    const result = await ReconController.executeTool('click_element', {
      targetId,
      ref: params.ref,
      clickType: params.clickType,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Clicked element: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to click element',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while clicking element',
    };
  }
}