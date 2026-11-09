import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { EvaluateJsParams } from '../parsers/EvaluateJsParser';

export async function executeEvaluateJs(
  params: EvaluateJsParams,
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

    const result = await ReconController.executeTool('evaluate_js', {
      targetId,
      script: params.script,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'JS executed',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to evaluate JS',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while evaluating JS',
    };
  }
}