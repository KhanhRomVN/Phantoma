/**
 * NavigateExecutor — Execute navigate tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { NavigateParams } from '../../parsers/recon/NavigateParser';

export async function executeNavigate(
  params: NavigateParams,
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
    const result = await ReconController.executeTool('navigate', { 
      targetId,
      tabId: params.tabId,
      url: params.url,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Navigated to ${params.url}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error during navigation',
    };
  }
}
