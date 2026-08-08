import { EmulateController } from '@renderer/controller/EmulateController';

/** Execute list_hosts tool — gọi EmulateController.executeTool() */
export async function executeListHosts(): Promise<string | null> {
  const result = await EmulateController.executeTool('list_hosts');

  if (!result.success) {
    return '[list_hosts] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}