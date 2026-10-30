import { EmulateController } from '../EmulateController';
import type { GetRepeaterDetailParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute get_repeater_detail tool — gọi EmulateController.executeTool() */
export async function executeGetRepeaterDetail(
  params: GetRepeaterDetailParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'get_repeater_detail',
    {
      repeater_id: params.repeater_id,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[get_repeater_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
