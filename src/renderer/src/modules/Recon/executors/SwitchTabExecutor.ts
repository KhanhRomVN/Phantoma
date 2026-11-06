import { useReconStore } from '../stores/useReconStore';
import { SwitchTabHandler } from '../handler/SwitchTabHandler';
import type { SwitchTabParams } from '../parsers/SwitchTabParser';

const handler = new SwitchTabHandler();

export async function executeSwitchTab(
  params: SwitchTabParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.tabId);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Switched tab successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to switch tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while switching tab',
    };
  }
}