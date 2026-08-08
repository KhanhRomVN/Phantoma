import { EmulateController } from '@renderer/controller/EmulateController';

export interface ListHttpsParams {
  filter?: { method?: string; host?: string; path?: string; status?: number };
  limit?: number;
}

/** Execute list_https tool — gọi EmulateController.executeTool() */
export async function executeListHttps(params: ListHttpsParams): Promise<string | null> {
  const result = await EmulateController.executeTool('list_https', {
    filter: params.filter || {},
    limit: params.limit || 50,
  });

  if (!result.success) {
    return '[list_https] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}