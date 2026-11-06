import { useReconStore } from '../stores/useReconStore';
import { ClearInputHandler } from '../handler/ClearInputHandler';
import type { ClearInputParams } from '../parsers/ClearInputParser';

const handler = new ClearInputHandler();

export async function executeClearInput(
  params: ClearInputParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.ref);

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