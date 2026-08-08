import { CodeController } from '@renderer/controller/CodeController';
import { DeleteFileParams } from '../../../types/tool-types';

export const executeDeleteFile = async (params: DeleteFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const result = await CodeController.executeTool('delete_file', { file_path: filePath });

  if (!result.success) {
    return "[delete_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[delete_file for '" + filePath + "'] Result: File deleted successfully";
};