import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { NavigateParams } from '../parsers/NavigateParser';

export async function executeNavigate(
  params: NavigateParams,
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

    const result = await ReconController.executeTool('navigate', {
      targetId,
      url: params.url,
      waitUntil: params.waitUntil,
      timeoutMs: params.timeoutMs,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Navigated to ${params.url}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error during navigation',
    };
  }
}