import { EmulateController } from '@renderer/controller/EmulateController';

export interface GetHttpsDetailParams {
  index: number;
}

/** Execute get_https_detail tool — gọi EmulateController.executeTool() */
export async function executeGetHttpsDetail(params: GetHttpsDetailParams): Promise<string | null> {
  const result = await EmulateController.executeTool('get_https_detail', { index: params.index });

  if (!result.success) {
    return '[get_https_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}