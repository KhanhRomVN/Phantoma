/**
 * FillInputExecutor — Execute fill_input tool
 */

import { ReconController } from '@renderer/controller/ReconController';
import type { FillInputParams } from '../../parsers/recon/FillInputParser';

export async function executeFillInput(
  params: FillInputParams,
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
    const result = await ReconController.executeTool('fill_input', { 
      targetId,
      tabId: params.tabId,
      ref: params.ref,
      value: params.value,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Filled input: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fill input',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while filling input',
    };
  }
}
