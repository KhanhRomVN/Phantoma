import { useReconStore } from '../stores/useReconStore';
import { EvaluateJsHandler } from '../handler/EvaluateJsHandler';
import type { EvaluateJsParams } from '../parsers/EvaluateJsParser';

const handler = new EvaluateJsHandler();

export async function executeEvaluateJs(
  params: EvaluateJsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.script);

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