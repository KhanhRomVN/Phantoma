import { EmulateController } from '@renderer/controller/EmulateController';

export interface ListSourcesParams {
  filter?: { host?: string; type?: string };
}

/** Execute list_sources tool — gọi EmulateController.executeTool() */
export async function executeListSources(params: ListSourcesParams): Promise<string | null> {
  const result = await EmulateController.executeTool('list_sources', {
    filter: params.filter || {},
  });

  if (!result.success) {
    return '[list_sources] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}