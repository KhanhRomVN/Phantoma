import { EmulateController } from '@renderer/controller/EmulateController';

export interface ListResourcesParams {
  filter?: { type?: string };
}

/** Execute list_resources tool — gọi EmulateController.executeTool() */
export async function executeListResources(params: ListResourcesParams): Promise<string | null> {
  const result = await EmulateController.executeTool('list_resources', {
    filter: params.filter || {},
  });

  if (!result.success) {
    return '[list_resources] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
