import { useReconStore } from '../stores/useReconStore';
import { ListElementsHandler } from '../handler/ListElementsHandler';
import type { ListElementsParams } from '../parsers/ListElementsParser';

const handler = new ListElementsHandler();

export async function executeListElements(
  params: ListElementsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(
      targetId,
      undefined,
      params.elementType,
      params.labelContains,
      params.visibleOnly,
      params.limit,
      params.offset,
    );

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