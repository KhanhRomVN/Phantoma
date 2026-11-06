import { useReconStore } from '../stores/useReconStore';
import { PressKeyHandler } from '../handler/PressKeyHandler';
import type { PressKeyParams } from '../parsers/PressKeyParser';

const handler = new PressKeyHandler();

export async function executePressKey(
  params: PressKeyParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.key);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Pressed key: ${params.key}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to press key',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while pressing key',
    };
  }
}