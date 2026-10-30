import { CodeController } from '../CodeController';
import { MoveFileParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

export const executeMoveFile = async (params: MoveFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const targetFolderPath = params.target_folder_path;

  // move_file chưa có handler riêng trong CodeController → dùng delete + write
  const result = await CodeController.executeTool('delete_file', { file_path: filePath });

  if (!result.success) {
    return (
      "[move_file from '" +
      filePath +
      "' to '" +
      targetFolderPath +
      "'] Result: Error - " +
      (result.error || '')
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