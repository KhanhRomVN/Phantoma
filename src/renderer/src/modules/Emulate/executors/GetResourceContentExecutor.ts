import { EmulateController } from '../EmulateController';

export interface GetResourceContentParams {
  filename: string;
  start_line?: number;
  end_line?: number;
}

/** Execute get_resource_content tool — gọi EmulateController.executeTool() */
export async function executeGetResourceContent(
  params: GetResourceContentParams,
): Promise<string | null> {
  const result = await EmulateController.executeTool('get_resource_content', {
    filename: params.filename,
    start_line: params.start_line,
    end_line: params.end_line,
  });

  if (!result.success) {
    return '[get_resource_content] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
