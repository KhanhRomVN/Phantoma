import { useReconStore } from '../stores/useReconStore';
import { HoverHandler } from '../handler/HoverHandler';
import type { HoverParams } from '../parsers/HoverParser';

const handler = new HoverHandler();

export async function executeHover(
  params: HoverParams,
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
        output: result.data?.output || `Hovered: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to hover',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while hovering',
    };
  }
}