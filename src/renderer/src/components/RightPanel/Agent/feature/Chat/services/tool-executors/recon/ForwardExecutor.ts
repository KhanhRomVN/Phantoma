/**
 * ForwardExecutor — Execute forward tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { ForwardParams } from '../../parsers/recon/ForwardParser';

export async function executeForward(
  params: ForwardParams,
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
    const result = await ReconController.executeTool('forward', { 
      targetId,
      tabId: params.tabId,
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
