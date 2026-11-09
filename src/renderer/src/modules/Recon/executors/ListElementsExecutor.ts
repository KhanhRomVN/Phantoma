import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { ListElementsParams } from '../parsers/ListElementsParser';

export async function executeListElements(
  params: ListElementsParams,
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

    const result = await ReconController.executeTool('list_elements', {
      targetId,
      elementType: params.elementType,
      labelContains: params.labelContains,
      visibleOnly: params.visibleOnly,
      limit: params.limit,
      offset: params.offset,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Elements listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list elements',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing elements',
    };
  }
}