import { EmulateController } from '../EmulateController';
import type { UpdateRepeaterContentParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute update_repeater_content tool — gọi EmulateController.executeTool() */
export async function executeUpdateRepeaterContent(
  params: UpdateRepeaterContentParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'update_repeater_content',
    {
      repeater_id: params.repeater_id,
      target: params.target,
      old_content: params.old_content,
      new_content: params.new_content,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[update_repeater_content] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
