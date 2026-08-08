import { CodeController } from '@renderer/controller/CodeController';
import { RevertFileParams } from '../../../types/tool-types';

export async function executeRevertFile(
  params: RevertFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool('revert_file', {
    file_path: filePath,
    version: (params as any).version,
  }, { conversationId, actionId });

  if (!result.success) {
    return "[revert_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[revert_file for '" + filePath + "'] Result: File reverted successfully";
}