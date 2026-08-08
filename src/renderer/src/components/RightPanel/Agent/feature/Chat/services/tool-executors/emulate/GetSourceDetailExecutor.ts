import { EmulateController } from '@renderer/controller/EmulateController';

export interface GetSourceDetailParams {
  index: number;
}

/** Execute get_source_detail tool — gọi EmulateController.executeTool() */
export async function executeGetSourceDetail(params: GetSourceDetailParams): Promise<string | null> {
  const result = await EmulateController.executeTool('get_source_detail', { index: params.index });

  if (!result.success) {
    return '[get_source_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}