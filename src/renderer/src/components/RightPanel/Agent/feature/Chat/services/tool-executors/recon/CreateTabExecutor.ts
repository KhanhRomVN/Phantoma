/**
 * CreateTabExecutor — Execute create_tab tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { CreateTabParams } from '../../parsers/recon/CreateTabParser';

export async function executeCreateTab(
  params: CreateTabParams,
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
    const result = await ReconController.executeTool('create_tab', { 
      targetId,
      url: params.url,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tab created successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while creating tab',
    };
  }
}
