import { CodeController } from '@renderer/controller/CodeController';
import { WriteToFileParams } from '../../../types/tool-types';

export async function executeWriteToFile(
  params: WriteToFileParams,
  skipDiagnostics: boolean = false,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool('write_to_file', {
    path: filePath,
    content: params.content || '',
  }, { skipDiagnostics, conversationId, actionId });

  if (!result.success) {
    return "[write_to_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[write_to_file for '" + filePath + "'] Result: File written successfully";
}