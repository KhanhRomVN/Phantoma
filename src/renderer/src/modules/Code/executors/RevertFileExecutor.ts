import { CodeController } from '../CodeController';
import { RevertFileParams } from '../parsers/RevertFileParser';

export async function executeRevertFile(
  params: RevertFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = (params as any).path || params.file_path || '';
  const result = await CodeController.executeTool(
    'revert_file',
    {
      file_path: filePath,
      version: (params as any).version,
    },
    { conversationId, actionId },
  );

  if (!result.success) {
    return "[revert_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[revert_file for '" + filePath + "'] Result: File reverted successfully";
}