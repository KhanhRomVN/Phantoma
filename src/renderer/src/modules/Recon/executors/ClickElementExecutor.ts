import { useReconStore } from '../stores/useReconStore';
import { ClickElementHandler } from '../handler/ClickElementHandler';
import type { ClickElementParams } from '../parsers/ClickElementParser';

const handler = new ClickElementHandler();

export async function executeClickElement(
  params: ClickElementParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.ref, undefined, params.clickType);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Clicked element: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to click element',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while clicking element',
    };
  }
}