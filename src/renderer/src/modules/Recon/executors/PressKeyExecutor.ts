import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { PressKeyParams } from '../parsers/PressKeyParser';

export async function executePressKey(
  params: PressKeyParams,
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

    const result = await ReconController.executeTool('press_key', {
      targetId,
      key: params.key,
    });

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