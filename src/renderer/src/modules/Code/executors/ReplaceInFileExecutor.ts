import { ReplaceInFileHandler } from '../handler/tool/ReplaceInFileHandler';
import { fileLockManager } from '../managers/FileLockManager';
import type { ReplaceInFileParams } from '../types/tool-params';

const replaceInFileHandler = new ReplaceInFileHandler(fileLockManager);

export async function executeReplaceInFile(
  params: ReplaceInFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = (params as any).path || params.file_path || '';
  const result = await replaceInFileHandler.handle({
    path: filePath,
    old_str: params.old_content,
    new_str: params.new_content,
    conversationId,
    actionId,
  } as any);

  if (result.error) {
    return "[replace_in_file for '" + filePath + "'] Result: Error - " + result.error;
  }
  return "[replace_in_file for '" + filePath + "'] Result: File updated successfully";
}