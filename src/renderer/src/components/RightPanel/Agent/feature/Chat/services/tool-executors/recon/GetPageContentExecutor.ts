/**
 * GetPageContentExecutor — Execute get_page_content tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { GetPageContentParams } from '../../parsers/recon/GetPageContentParser';

export async function executeGetPageContent(
  params: GetPageContentParams,
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
    const result = await ReconController.executeTool('get_page_content', { 
      targetId,
      tabId: params.tabId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Page content retrieved',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to get page content',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while getting page content',
    };
  }
}
