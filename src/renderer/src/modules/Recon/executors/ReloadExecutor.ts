import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ReloadParams } from '../parsers/ReloadParser';

export async function executeReload(
  _params: ReloadParams,
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

    const result = await ReconController.executeTool('reload', {
      targetId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Page reloaded',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to reload page',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while reloading page',
    };
  }
}