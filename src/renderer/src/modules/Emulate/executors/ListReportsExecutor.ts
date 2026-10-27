import { EmulateController } from '../EmulateController';

/** Execute list_reports tool — gọi EmulateController.executeTool() */
export async function executeListReports(contextTargetId?: string | null): Promise<string | null> {
  const result = await EmulateController.executeTool('list_reports', {}, contextTargetId);

  if (!result.success) {
    return '[list_reports] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
