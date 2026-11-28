/**
 * ------------------------------------------------------------------
 * Delete File Executor
 * ------------------------------------------------------------------
 * Thực thi tool delete_file: gọi DeleteFileHandler để xóa file và
 * định dạng kết quả trả về cho agent.
 *
 * Main functions:
 * - executeDeleteFile() : Xóa file theo file_path
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { DeleteFileHandler } from './delete-file.handler';

// ── Types ──
import type { DeleteFileParams } from '../tool.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const deleteFileHandler = new DeleteFileHandler();

// ─── Functions ───────────────────────────────────────────────────────────────
export const executeDeleteFile = async (params: DeleteFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const result = await deleteFileHandler.handle({ file_path: filePath });

  if (result.error) {
    return "[delete_file for '" + filePath + "'] Result: Error - " + result.error;
  }
  return "[delete_file for '" + filePath + "'] Result: File deleted successfully";
};