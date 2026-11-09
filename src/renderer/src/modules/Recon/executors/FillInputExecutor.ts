import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { FillInputParams } from '../parsers/FillInputParser';

export async function executeFillInput(
  params: FillInputParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('fill_input', {
      targetId,
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