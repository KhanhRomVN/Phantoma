/**
 * ------------------------------------------------------------------
 * Find Files Executor
 * ------------------------------------------------------------------
 * Thực thi tool find_files: gọi FindFilesHandler để tìm file theo tên
 * và định dạng danh sách kết quả cho agent.
 *
 * Main types:
 * - FindFilesResult : Kết quả khớp theo tên file
 *
 * Main functions:
 * - executeFindFiles() : Tìm file và trả về output cùng tổng số kết quả
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { FindFilesHandler } from './find-files.handler';
import { FindFilesParams } from './find-files.parser';

// ─── Constants ───────────────────────────────────────────────────────────────
const findFilesHandler = new FindFilesHandler();

// ─── Types ───────────────────────────────────────────────────────────────────
export interface FindFilesResult {
  fileName: string;
  matches: string[];
}

// ─── Functions ───────────────────────────────────────────────────────────────
export async function executeFindFiles(params: FindFilesParams): Promise<{
  output: string;
  results?: FindFilesResult[];
  totalMatches?: number;
} | null> {
  const fileNames = params.file_names || [];
  const fileName =
    fileNames.length > 0
      ? fileNames[0]
      : (params as any).fileName || (params as any).file_name || '';
  const folderPath = (params as any).folderPath || (params as any).folder_path;

  const data = await findFilesHandler.handle({ fileName, folderPath });

  if (data.error) {
    return { output: '[find_files] Result: Error - ' + data.error };
  }

  const matches = data.matches || [];
  const totalMatches = data.totalMatches || matches.length;

  let output = '[find_files] Found ' + totalMatches + ' file(s)\n\n';
  if (totalMatches === 0) {
    output += 'No files found.';
  } else {
    matches.forEach((m: any) => {
      output += '- ' + (m.path || m) + '\n';
    });
  }

  return { output, totalMatches };
}