import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { WaitForParams } from '../parsers/WaitForParser';

export async function executeWaitFor(
  params: WaitForParams,
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

    const result = await ReconController.executeTool('wait_for', {
      targetId,
      condition: params.condition,
      ref: params.ref,
      text: params.text,
      timeoutMs: params.timeoutMs,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Waited for: ${params.condition}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to wait',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while waiting',
    };
  }
}