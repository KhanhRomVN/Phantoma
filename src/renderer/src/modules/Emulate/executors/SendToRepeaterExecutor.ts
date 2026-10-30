import { EmulateController } from '../EmulateController';
import type { SendToRepeaterParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute send_to_repeater tool — gọi EmulateController.executeTool() */
export async function executeSendToRepeater(
  params: SendToRepeaterParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'send_to_repeater',
    {
      index: params.index,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[send_to_repeater] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
