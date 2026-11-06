import { useReconStore } from '../stores/useReconStore';
import { ScrollHandler } from '../handler/ScrollHandler';
import type { ScrollParams } from '../parsers/ScrollParser';

const handler = new ScrollHandler();

export async function executeScroll(
  params: ScrollParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.direction, params.amount);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Scrolled ${params.direction}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to scroll',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while scrolling',
    };
  }
}