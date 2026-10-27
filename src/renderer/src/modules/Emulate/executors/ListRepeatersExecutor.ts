import { EmulateController } from '../EmulateController';

/** Execute list_repeaters tool — gọi EmulateController.executeTool() */
export async function executeListRepeaters(
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool('list_repeaters', {}, contextTargetId);

  if (!result.success) {
    return '[list_repeaters] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
