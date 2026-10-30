import { CodeController } from '../CodeController';
import { ReplaceInFileParams } from '../parsers/ReplaceInFileParser';

export async function executeReplaceInFile(
  params: ReplaceInFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = (params as any).path || params.file_path || '';
  const result = await CodeController.executeTool(
    'replace_in_file',
    {
      path: filePath,
      old_str: params.old_content,
      new_str: params.new_content,
    },
    { conversationId, actionId },
  );

  if (!result.success) {
    return "[replace_in_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[replace_in_file for '" + filePath + "'] Result: File updated successfully";
}