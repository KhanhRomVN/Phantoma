import { useReconStore } from '../stores/useReconStore';
import { NavigateHandler } from '../handler/NavigateHandler';
import type { NavigateParams } from '../parsers/NavigateParser';

const handler = new NavigateHandler();

export async function executeNavigate(
  params: NavigateParams,
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
      params.url,
      undefined,
      params.waitUntil,
      params.timeoutMs,
    );

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