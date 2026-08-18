/**
 * ListTabsExecutor — Execute list_tabs tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { ListTabsParams } from '../../parsers/recon/ListTabsParser';

export async function executeListTabs(
  params: ListTabsParams,
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
    const result = await ReconController.executeTool('list_tabs', { targetId });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tabs listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list tabs',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing tabs',
    };
  }
}
