/**
 * ------------------------------------------------------------------
 * ListFilesHandler
 * ------------------------------------------------------------------
 * IPC message handler for listing directory tree.
 * ------------------------------------------------------------------
 */

import { BaseParams, BaseResult } from './FileHandlerTypes';

interface ListFilesParams extends BaseParams {
  path?: string;
  folder_path?: string;
  filePath?: string;
  depth?: number | string;
  recursive?: boolean | string;
}

export class ListFilesHandler {
  public async handle(message: ListFilesParams): Promise<BaseResult> {
    const pathValue = message.path || message.folder_path || message.filePath || '.';
    let maxDepth = 1;

    if (message.depth !== undefined && message.depth !== null) {
      if (String(message.depth).toLowerCase() === 'max') maxDepth = 999;
      else maxDepth = parseInt(String(message.depth), 10) || 1;
    } else if (message.recursive === true || message.recursive === 'true') {
      maxDepth = 20;
    } else if (message.recursive) {
      maxDepth = parseInt(String(message.recursive), 10) || 1;
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const buildTree = async (
        dirPath: string,
        currentDepth: number,
      ): Promise<any[]> => {
        if (currentDepth > maxDepth) return [];

        let dirEntries: Array<{ name: string; type: 'file' | 'folder'; size?: number }>;
        try {
          dirEntries = await api.invoke('fs:read-dir', dirPath);
        } catch {
          return [];
        }

        dirEntries.sort((a, b) => {
          const aIsDir = a.type === 'folder' ? 0 : 1;
          const bIsDir = b.type === 'folder' ? 0 : 1;
          if (aIsDir !== bIsDir) return aIsDir - bIsDir;
          return a.name.localeCompare(b.name);
        });

        const results: any[] = [];
        for (const entry of dirEntries) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

          if (entry.type === 'folder') {
            const fullPath = dirPath.replace(/\/$/, '') + '/' + entry.name;
            const children = await buildTree(fullPath, currentDepth + 1);
            results.push({ name: entry.name, type: 'folder', children });
          } else {
            results.push({ name: entry.name, type: 'file', size: entry.size });
          }
        }
        return results;
      };

      const tree = await buildTree(pathValue, 1);

      return {
        command: 'listFilesResult',
        requestId: message.requestId,
        path: pathValue,
        files: tree,
      };
    } catch (e: any) {
      return {
        command: 'listFilesResult',
        requestId: message.requestId,
        path: pathValue,
        error: e.message || String(e),
      };
    }
  }
}