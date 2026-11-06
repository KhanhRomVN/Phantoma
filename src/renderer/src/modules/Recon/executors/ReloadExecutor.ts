import { useReconStore } from '../stores/useReconStore';
import { ReloadHandler } from '../handler/ReloadHandler';
import type { ReloadParams } from '../parsers/ReloadParser';

const handler = new ReloadHandler();

export async function executeReload(
  _params: ReloadParams,
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