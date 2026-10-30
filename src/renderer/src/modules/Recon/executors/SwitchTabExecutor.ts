import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { SwitchTabParams } from '../parsers/SwitchTabParser';

export async function executeSwitchTab(
  params: SwitchTabParams,
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

    const result = await ReconController.executeTool('switch_tab', {
      targetId,
      tabId: params.tabId,
    });

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