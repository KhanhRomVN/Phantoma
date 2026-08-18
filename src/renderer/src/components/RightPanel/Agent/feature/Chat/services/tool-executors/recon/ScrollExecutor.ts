/**
 * ScrollExecutor — Execute scroll tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { ScrollParams } from '../../parsers/recon/ScrollParser';

export async function executeScroll(
  params: ScrollParams,
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
    const result = await ReconController.executeTool('scroll', { 
      targetId,
      tabId: params.tabId,
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
