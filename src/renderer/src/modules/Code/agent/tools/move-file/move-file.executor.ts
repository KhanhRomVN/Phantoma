/**
 * ------------------------------------------------------------------
 * Move File Executor
 * ------------------------------------------------------------------
 * Thực thi tool move_file: gọi MoveFileHandler để chuyển file vào thư
 * mục đích và định dạng kết quả trả về cho agent.
 *
 * Main functions:
 * - executeMoveFile() : Di chuyển file theo file_path và target_folder_path
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { MoveFileHandler } from './move-file.handler';

// ── Types ──
import type { MoveFileParams } from '../tool.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const moveFileHandler = new MoveFileHandler();

// ─── Functions ───────────────────────────────────────────────────────────────
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