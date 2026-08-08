import { CodeController } from '@renderer/controller/CodeController';
import { ReplaceInFileParams } from '../../../types/tool-types';

export async function executeReplaceInFile(
  params: ReplaceInFileParams,
  skipDiagnostics: boolean = false,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool('replace_in_file', {
    path: filePath,
    old_str: params.old_content,
    new_str: params.new_content,
  }, { skipDiagnostics, conversationId, actionId });

  if (!result.success) {
    return "[replace_in_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[replace_in_file for '" + filePath + "'] Result: File updated successfully";
}