/**
 * ClickElementExecutor — Execute click_element tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { ClickElementParams } from '../../parsers/recon/ClickElementParser';

export async function executeClickElement(
  params: ClickElementParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    // Get target ID (use active if not specified)
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    // Execute via controller
    const result = await ReconController.executeTool('click_element', { 
      targetId,
      tabId: params.tabId,
      ref: params.ref,
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
