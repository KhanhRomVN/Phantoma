import { useReconStore } from '../stores/useReconStore';
import { GetPageContentHandler } from '../handler/GetPageContentHandler';
import type { GetPageContentParams } from '../parsers/GetPageContentParser';

const handler = new GetPageContentHandler();

export async function executeGetPageContent(
  params: GetPageContentParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, undefined, params.maxChars);

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