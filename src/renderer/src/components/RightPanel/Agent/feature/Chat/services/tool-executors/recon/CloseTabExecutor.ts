/**
 * CloseTabExecutor — Execute close_tab tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { CloseTabParams } from '../../parsers/recon/CloseTabParser';

export async function executeCloseTab(
  params: CloseTabParams,
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
