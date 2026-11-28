/**
 * ------------------------------------------------------------------
 * List Files Executor
 * ------------------------------------------------------------------
 * Thực thi tool list_files: gọi ListFilesHandler để liệt kê cây thư mục
 * và trả về kết quả dạng JSON cho agent.
 *
 * Main functions:
 * - executeListFiles() : Liệt kê file/folder theo folder_path và depth
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import { ListFilesHandler } from './list-files.handler';

// ── Types ──
import { ListFilesParams } from '../tool.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const listFilesHandler = new ListFilesHandler();

// ─── Functions ───────────────────────────────────────────────────────────────
export async function executeListFiles(
  params: ListFilesParams,
  _bypassIgnore: boolean = false,
  basePath?: string | null,
): Promise<string | null> {
  const folderPath = (params as any).path || params.folder_path || '';
  const data = await listFilesHandler.handle({
    path: folderPath,
    basePath: basePath || undefined,
    depth: params.depth,
    recursive: (params as any).recursive,
  } as any);

  if (data.error) {
    return "[list_files for '" + folderPath + "'] Result: Error - " + data.error;
  }

  const files = data.files || [];
  return JSON.stringify(files, null, 2);
}
