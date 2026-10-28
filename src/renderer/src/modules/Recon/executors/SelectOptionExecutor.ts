import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { SelectOptionParams } from '../parsers/SelectOptionParser';

export async function executeSelectOption(
  params: SelectOptionParams,
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

    const result = await ReconController.executeTool('select_option', {
      targetId,
      ref: params.ref,
      value: params.value,
      label: params.label,
      frameId: params.frameId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Selected option: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to select option',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while selecting option',
    };
  }
}