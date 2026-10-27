import { EmulateController } from '../EmulateController';
import type { DeleteRepeaterParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute delete_repeater tool — gọi EmulateController.executeTool() */
export async function executeDeleteRepeater(
  params: DeleteRepeaterParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'delete_repeater',
    {
      repeater_id: params.repeater_id,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[delete_repeater] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
