import { useReconStore } from '../stores/useReconStore';
import { ListFramesHandler } from '../handler/ListFramesHandler';
import type { ListFramesParams } from '../parsers/ListFramesParser';

const handler = new ListFramesHandler();

export async function executeListFrames(
  _params: ListFramesParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId);

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