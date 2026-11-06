import { useReconStore } from '../stores/useReconStore';
import { FillInputHandler } from '../handler/FillInputHandler';
import type { FillInputParams } from '../parsers/FillInputParser';

const handler = new FillInputHandler();

export async function executeFillInput(
  params: FillInputParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.ref, params.value);

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