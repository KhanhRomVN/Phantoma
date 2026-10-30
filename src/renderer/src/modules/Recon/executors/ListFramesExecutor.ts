import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ListFramesParams } from '../parsers/ListFramesParser';

export async function executeListFrames(
  _params: ListFramesParams,
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

    const result = await ReconController.executeTool('list_frames', {
      targetId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Frames listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list frames',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing frames',
    };
  }
}