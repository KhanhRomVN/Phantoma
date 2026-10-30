import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ClearInputParams } from '../parsers/ClearInputParser';

export async function executeClearInput(
  params: ClearInputParams,
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

    const result = await ReconController.executeTool('clear_input', {
      targetId,
      ref: params.ref,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Cleared input: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to clear input',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while clearing input',
    };
  }
}