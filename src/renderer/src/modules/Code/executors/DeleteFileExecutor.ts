import { DeleteFileHandler } from '../handler/tool/DeleteFileHandler';
import type { DeleteFileParams } from '../types/tool-params';

const deleteFileHandler = new DeleteFileHandler();

export const executeDeleteFile = async (params: DeleteFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const result = await deleteFileHandler.handle({ file_path: filePath });

  if (result.error) {
    return "[delete_file for '" + filePath + "'] Result: Error - " + result.error;
  }
  return "[delete_file for '" + filePath + "'] Result: File deleted successfully";
};