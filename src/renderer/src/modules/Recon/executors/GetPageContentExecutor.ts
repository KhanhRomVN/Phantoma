import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { GetPageContentParams } from '../parsers/GetPageContentParser';

export async function executeGetPageContent(
  params: GetPageContentParams,
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

    const result = await ReconController.executeTool('get_page_content', {
      targetId,
      maxChars: params.maxChars,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Page content retrieved',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to get page content',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while getting page content',
    };
  }
}