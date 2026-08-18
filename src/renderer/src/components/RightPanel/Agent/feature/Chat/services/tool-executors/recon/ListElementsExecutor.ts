/**
 * ListElementsExecutor — Execute list_elements tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { ListElementsParams } from '../../parsers/recon/ListElementsParser';

export async function executeListElements(
  params: ListElementsParams,
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
    const result = await ReconController.executeTool('list_elements', { 
      targetId,
      tabId: params.tabId,
      elementType: params.elementType,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Elements listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list elements',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing elements',
    };
  }
}
