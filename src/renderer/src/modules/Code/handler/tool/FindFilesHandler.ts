/**
 * ------------------------------------------------------------------
 * FindFilesHandler
 * ------------------------------------------------------------------
 * IPC message handler for finding files by name pattern.
 * ------------------------------------------------------------------
 */

import { resolveWorkspacePath } from '../../utils/pathResolver';
import { codeApi } from '../../services/code-api.service';

interface BaseParams {
  requestId?: string;
}

interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

interface FindFilesParams extends BaseParams {
  fileName?: string;
  file_name?: string;
  folderPath?: string;
  folder_path?: string;
}

export class FindFilesHandler {
  public async handle(message: FindFilesParams): Promise<BaseResult> {
    const fileName = message.fileName || message.file_name || '';
    const folderPath = message.folderPath || message.folder_path;

    if (!fileName) {
      return { command: 'findFilesResult', requestId: message.requestId, error: 'No file name provided' };
    }

    try {

      // Resolve relative folder against workspace root so search hits the project.
      const resolvedFolder = await resolveWorkspacePath(
        folderPath || '.',
        (message as any).basePath,
      );
      const results = await codeApi.fs.findFiles(resolvedFolder, fileName, {
        exclude: ['node_modules', '.git'],
      });

      return {
        command: 'findFilesResult',
        requestId: message.requestId,
        fileName,
        folderPath: folderPath || null,
        matches: results,
        totalMatches: results.length,
      };
    } catch (e: any) {
      return {
        command: 'findFilesResult',
        requestId: message.requestId,
        fileName,
        folderPath: folderPath || null,
        matches: [],
        totalMatches: 0,
        error: e.message || String(e),
      };
    }
  }
}