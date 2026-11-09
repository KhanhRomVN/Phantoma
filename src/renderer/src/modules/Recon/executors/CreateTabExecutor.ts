import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { CreateTabParams } from '../parsers/CreateTabParser';

export async function executeCreateTab(
  params: CreateTabParams,
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

    const result = await ReconController.executeTool('create_tab', {
      targetId,
      url: params.url,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tab created successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while creating tab',
    };
  }
}