import { useReconStore } from '../stores/useReconStore';
import { ScrollToElementHandler } from '../handler/ScrollToElementHandler';
import type { ScrollToElementParams } from '../parsers/ScrollToElementParser';

const handler = new ScrollToElementHandler();

export async function executeScrollToElement(
  params: ScrollToElementParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.ref);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Scrolled to element: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to scroll to element',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while scrolling to element',
    };
  }
}