/**
 * ------------------------------------------------------------------
 * Replace In File Executor
 * ------------------------------------------------------------------
 * Thực thi tool replace_in_file: gọi ReplaceInFileHandler (có file lock)
 * để thay thế nội dung file và định dạng kết quả cho agent.
 *
 * Main functions:
 * - executeReplaceInFile() : Thay thế old_content bằng new_content trong file
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { fileLockManager } from '../../services/file-lock.service';

// ── Utils ──
import { ReplaceInFileHandler } from './replace-in-file.handler';

// ── Types ──
import type { ReplaceInFileParams } from '../tool.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const replaceInFileHandler = new ReplaceInFileHandler(fileLockManager);

// ─── Functions ───────────────────────────────────────────────────────────────
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