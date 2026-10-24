import { CodeController } from '../CodeController';
import { WriteToFileParams } from '../parsers/WriteToFileParser';

export async function executeWriteToFile(
  params: WriteToFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = (params as any).path || params.file_path || '';
  const result = await CodeController.executeTool(
    'write_to_file',
    {
      path: filePath,
      content: params.content || '',
    },
    { conversationId, actionId },
  );

  if (!result.success) {
    return "[write_to_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[write_to_file for '" + filePath + "'] Result: File written successfully";
}