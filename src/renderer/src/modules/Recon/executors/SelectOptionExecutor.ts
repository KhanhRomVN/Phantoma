import { useReconStore } from '../stores/useReconStore';
import { SelectOptionHandler } from '../handler/SelectOptionHandler';
import type { SelectOptionParams } from '../parsers/SelectOptionParser';

const handler = new SelectOptionHandler();

export async function executeSelectOption(
  params: SelectOptionParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.ref, params.value, params.label);

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