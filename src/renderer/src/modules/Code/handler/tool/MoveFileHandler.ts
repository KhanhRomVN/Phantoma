/**
 * ------------------------------------------------------------------
 * MoveFileHandler
 * ------------------------------------------------------------------
 * IPC message handler for moving a file into a target folder.
 * ------------------------------------------------------------------
 */

import { resolveWorkspacePath } from '../../utils/pathResolver';
import { SecurityValidator } from '../../utils/security';

interface BaseParams {
  requestId?: string;
}

interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

interface MoveFileParams extends BaseParams {
  file_path?: string;
  target_folder_path?: string;
  basePath?: string;
}

export class MoveFileHandler {
  public async handle(message: MoveFileParams): Promise<BaseResult> {
    if (!message.file_path || !message.target_folder_path) {
      return {
        command: 'moveFileResult',
        requestId: message.requestId,
        error: "'file_path' and 'target_folder_path' are required",
      };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const source = await resolveWorkspacePath(message.file_path, message.basePath);
      const targetFolder = await resolveWorkspacePath(message.target_folder_path, message.basePath);
      const fileName = source.split(/[\\/]/).pop() as string;
      const destination = targetFolder.replace(/[\\/]$/, '') + '/' + fileName;

      for (const p of [source, destination]) {
        const sec = SecurityValidator.validatePath(p, true);
        if (!sec.safe) {
          return {
            command: 'moveFileResult',
            requestId: message.requestId,
            error: sec.reason || 'Security validation failed',
          };
        }
      }

      await api.invoke('fs:rename', source, destination);
      return {
        command: 'moveFileResult',
        requestId: message.requestId,
        success: true,
        path: destination,
      };
    } catch (e: any) {
      return {
        command: 'moveFileResult',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }
}