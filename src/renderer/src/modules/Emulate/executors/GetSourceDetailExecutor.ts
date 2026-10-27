import { EmulateController } from '../EmulateController';

export interface GetSourceDetailParams {
  filepath: string;
}

/** Execute get_source_detail tool — gọi EmulateController.executeTool() */
export async function executeGetSourceDetail(
  params: GetSourceDetailParams,
): Promise<string | null> {
  const result = await EmulateController.executeTool('get_source_detail', {
    filepath: params.filepath,
  });

  if (!result.success) {
    return '[get_source_detail] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
