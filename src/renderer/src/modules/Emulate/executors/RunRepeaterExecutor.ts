import { EmulateController } from '../EmulateController';

export interface RunRepeaterParams {
  repeater_id: string;
  iterations?: number;
}

/** Execute run_repeater tool — gọi EmulateController.executeTool() */
export async function executeRunRepeater(
  params: RunRepeaterParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'run_repeater',
    {
      repeater_id: params.repeater_id,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[run_repeater] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
