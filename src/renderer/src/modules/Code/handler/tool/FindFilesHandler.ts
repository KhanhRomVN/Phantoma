/**
 * ------------------------------------------------------------------
 * FindFilesHandler
 * ------------------------------------------------------------------
 * IPC message handler for finding files by name pattern.
 * ------------------------------------------------------------------
 */

import { BaseParams, BaseResult } from './FileHandlerTypes';

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
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const results = await api.invoke('fs:find-files', folderPath || '.', fileName);

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