import { DeleteFileHandler } from './delete-file.handler';
import type { DeleteFileParams } from '../tool.types';

const deleteFileHandler = new DeleteFileHandler();

export const executeDeleteFile = async (params: DeleteFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const result = await deleteFileHandler.handle({ file_path: filePath });

  if (result.error) {
    return "[delete_file for '" + filePath + "'] Result: Error - " + result.error;
  }
  return "[delete_file for '" + filePath + "'] Result: File deleted successfully";
};