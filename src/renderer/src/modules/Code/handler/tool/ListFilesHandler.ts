/**
 * ------------------------------------------------------------------
 * ListFilesHandler
 * ------------------------------------------------------------------
 * IPC message handler for listing directory tree.
 * ------------------------------------------------------------------
 */

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

interface ListFilesParams extends BaseParams {
  path?: string;
  folder_path?: string;
  filePath?: string;
  depth?: number | string;
  recursive?: boolean | string;
}

interface ListedNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: ListedNode[];
}

const toListed = (nodes: Array<{ name: string; type: 'file' | 'folder'; size?: number; children?: any[] }>): ListedNode[] =>
  nodes.map((n) =>
    n.type === 'folder'
      ? { name: n.name, type: 'folder', children: toListed(n.children ?? []) }
      : { name: n.name, type: 'file', size: n.size },
  );

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
      let resolvedPath = pathValue;
      if (!/^([A-Za-z]:[\\/]|\/|file:\/\/)/.test(pathValue)) {
        let projectPath: string | undefined = (message as any).basePath;
        if (!projectPath) {
          const { useCodeStore } = await import('../../hooks/useCodeStore');
          const state = useCodeStore.getState();
          const proj = state.projects.find((p) => p.id === state.currentProjectId);
          projectPath = proj?.explorerRoot ?? proj?.path;
        }
        if (projectPath) {
          const base = projectPath.replace(/\/$/, '');
          const rel = pathValue.replace(/^\.\/?/, '').replace(/\/$/, '');
          resolvedPath = rel ? base + '/' + rel : base;
        }
      }

      const tree = toListed(
        await codeApi.fs.tree(resolvedPath, maxDepth, { exclude: ['node_modules'], hidden: false }),
      );

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