/**
 * ------------------------------------------------------------------
 * DeleteFileHandler
 * ------------------------------------------------------------------
 * IPC message handler for deleting a file.
 * ------------------------------------------------------------------
 */

import { BaseResult } from './FileHandlerTypes';
import { resolveWorkspacePath } from '../../utils/pathResolver';

export class DeleteFileHandler {
  public async handle(message: any): Promise<BaseResult> {
    const inputPath = message.file_path;
    if (!inputPath) {
      return { command: 'deleteFileResult', requestId: message.requestId, error: "'file_path' is required" };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      // Resolve relative path against workspace root (same as ReadFileHandler).
      const pathValue = await resolveWorkspacePath(inputPath, message.basePath);
      await api.invoke('fs:delete-file', pathValue);
      return { command: 'deleteFileResult', requestId: message.requestId, success: true };
    } catch (e: any) {
      return { command: 'deleteFileResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}