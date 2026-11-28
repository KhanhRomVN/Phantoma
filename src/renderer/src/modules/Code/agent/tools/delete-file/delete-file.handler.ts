/**
 * ------------------------------------------------------------------
 * DeleteFileHandler
 * ------------------------------------------------------------------
 * IPC message handler for deleting a file.
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import { codeApi } from '../../../shared/api/code.api';

// ── Utils ──
import { resolveWorkspacePath } from '../../../shared/utils/path-resolver.util';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

// ─── Class ───────────────────────────────────────────────────────────────────
export class DeleteFileHandler {
  public async handle(message: any): Promise<BaseResult> {
    const inputPath = message.file_path;
    if (!inputPath) {
      return { command: 'deleteFileResult', requestId: message.requestId, error: "'file_path' is required" };
    }

    try {
      // Resolve relative path against workspace root (same as ReadFileHandler).
      const pathValue = await resolveWorkspacePath(inputPath, message.basePath);
      await codeApi.fs.deleteFile(pathValue);
      return { command: 'deleteFileResult', requestId: message.requestId, success: true };
    } catch (e: any) {
      return { command: 'deleteFileResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}