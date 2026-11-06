import { MoveFileHandler } from '../handler/tool/MoveFileHandler';
import type { MoveFileParams } from '../types/tool-params';

const moveFileHandler = new MoveFileHandler();

export const executeMoveFile = async (params: MoveFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const targetFolderPath = params.target_folder_path;

  const result = await moveFileHandler.handle({
    file_path: filePath,
    target_folder_path: targetFolderPath,
  });

  if (result.error) {
    return (
      "[move_file from '" +
      filePath +
      "' to '" +
      targetFolderPath +
      "'] Result: Error - " +
      result.error
    );
  }
  return (
    "[move_file from '" +
    filePath +
    "' to '" +
    targetFolderPath +
    "'] Result: File moved successfully"
  );
};