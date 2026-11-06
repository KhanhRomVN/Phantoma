import { useReconStore } from '../stores/useReconStore';
import { CreateTabHandler } from '../handler/CreateTabHandler';
import type { CreateTabParams } from '../parsers/CreateTabParser';

const handler = new CreateTabHandler();

export async function executeCreateTab(
  params: CreateTabParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.url);

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