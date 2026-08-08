/**
 * FileHandlers — Gộp các handler thao tác file còn lại.
 *
 * Bao gồm:
 *   - DeleteFileHandler     : Xóa file
 *   - ListFilesHandler      : Liệt kê cây thư mục
 *   - FindFilesHandler      : Tìm file theo tên
 *   - RevertFileHandler     : Revert file về version cũ
 *   - ViewReplaceHistoryHandler : Xem lịch sử replace
 *   - FileMiscHandler       : getFileStats, getDiagnostics, getFileContent
 *
 * ?Note:
 *   Port từ Zen, adapt từ vscode API → window.api.invoke IPC.
 */

import { SecurityValidator } from '../../utils/security';
import { ReplaceInFileHistoryManager } from '../../managers/ReplaceInFileHistoryManager';

// ─── Types ────────────────────────────────────────────────────────────

interface BaseParams {
  requestId?: string;
}

interface ListFilesParams extends BaseParams {
  path?: string;
  folder_path?: string;
  filePath?: string;
  depth?: number | string;
  recursive?: boolean | string;
}

interface FindFilesParams extends BaseParams {
  fileName?: string;
  file_name?: string;
  folderPath?: string;
  folder_path?: string;
}

interface RevertFileParams extends BaseParams {
  file_path?: string;
  path?: string;
  version?: number;
  conversationId?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ViewReplaceHistoryHandler
// ═══════════════════════════════════════════════════════════════════════
interface FileMiscParams extends BaseParams {
  path?: string;
  filePath?: string;
}

interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════════════
// DeleteFileHandler
// ═══════════════════════════════════════════════════════════════════════

export class DeleteFileHandler {
  public async handle(message: any): Promise<BaseResult> {
    const pathValue = message.file_path;
    if (!pathValue) {
      return { command: 'deleteFileResult', requestId: message.requestId, error: "'file_path' is required" };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');
      await api.invoke('fs:delete-file', pathValue);
      return { command: 'deleteFileResult', requestId: message.requestId, success: true };
    } catch (e: any) {
      return { command: 'deleteFileResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ListFilesHandler
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// FindFilesHandler
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// RevertFileHandler
// ═══════════════════════════════════════════════════════════════════════

export class RevertFileHandler {
  public async handle(message: RevertFileParams): Promise<BaseResult> {
    const pathValue = message.file_path || message.path;
    const version = message.version;

    if (!pathValue) {
      return { command: 'revertFileResult', requestId: message.requestId, error: "'file_path' is required" };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const sec = SecurityValidator.validatePath(pathValue, false);
      if (!sec.safe) {
        return { command: 'revertFileResult', requestId: message.requestId, error: sec.reason };
      }

      // Kiểm tra file tồn tại
      try {
        await api.invoke('fs:stat', pathValue);
      } catch {
        return { command: 'revertFileResult', requestId: message.requestId, error: `File not found: '${pathValue}'` };
      }

      if (version !== undefined && version !== null && message.conversationId) {
        // Revert về version cụ thể trong ReplaceInFileHistory
        const historyManager = ReplaceInFileHistoryManager.getInstance();
        historyManager.setActiveConversationId(message.conversationId);

        const history = await historyManager.getHistoryVersion(pathValue, parseInt(String(version), 10));
        if (!history) {
          return {
            command: 'revertFileResult',
            requestId: message.requestId,
            error: `No history found for version ${version} of file '${pathValue}'`,
          };
        }

        await api.invoke('fs:write-file', pathValue, history.fullContent);
        await historyManager.deleteVersionsAfter(pathValue, parseInt(String(version), 10));
      } else {
        // TODO: Revert về checkpoint (CheckpointManager) — chưa implement
        return {
          command: 'revertFileResult',
          requestId: message.requestId,
          error: 'No version specified and no checkpoint available. Cannot revert.',
        };
      }

      return {
        command: 'revertFileResult',
        requestId: message.requestId,
        success: true,
      };
    } catch (e: any) {
      return { command: 'revertFileResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ViewReplaceHistoryHandler
// ═══════════════════════════════════════════════════════════════════════

export class ViewReplaceHistoryHandler {
  public async handleHistory(message: any): Promise<BaseResult> {
    const pathValue = message.filePath || message.file_path;
    if (!pathValue) {
      return { command: 'viewReplaceHistoryResult', requestId: message.requestId, error: 'filePath is required' };
    }

    try {
      const historyManager = ReplaceInFileHistoryManager.getInstance();
      const history = await historyManager.getHistoryList(pathValue);

      return {
        command: 'viewReplaceHistoryResult',
        requestId: message.requestId,
        path: pathValue,
        history,
      };
    } catch (e: any) {
      return { command: 'viewReplaceHistoryResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }

  public async handleHistoryVersion(message: any): Promise<BaseResult> {
    const pathValue = message.filePath || message.file_path;
    const version = message.version;

    if (!pathValue || version === undefined) {
      return { command: 'getHistoryVersionResult', requestId: message.requestId, error: 'filePath and version are required' };
    }

    try {
      const historyManager = ReplaceInFileHistoryManager.getInstance();
      const history = await historyManager.getHistoryVersion(pathValue, version);

      if (!history) {
        return {
          command: 'getHistoryVersionResult',
          requestId: message.requestId,
          error: `Version ${version} not found for '${pathValue}'`,
        };
      }

      return {
        command: 'getHistoryVersionResult',
        requestId: message.requestId,
        path: pathValue,
        version,
        content: history.fullContent,
        errorCount: history.errorCount,
        warningCount: history.warningCount,
        timestamp: history.timestamp,
      };
    } catch (e: any) {
      return { command: 'getHistoryVersionResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FileMiscHandler
// ═══════════════════════════════════════════════════════════════════════

export class FileMiscHandler {
  /** Lấy thông tin file (kích thước, ngày sửa...) */
  public async handleGetFileStats(message: FileMiscParams): Promise<BaseResult> {
    const pathValue = message.path || message.filePath;
    if (!pathValue) {
      return { command: 'getFileStatsResult', requestId: message.requestId, error: 'Path is required' };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');
      const stats = await api.invoke('fs:stat', pathValue);

      return {
        command: 'getFileStatsResult',
        requestId: message.requestId,
        path: pathValue,
        stats,
      };
    } catch (e: any) {
      return { command: 'getFileStatsResult', requestId: message.requestId, error: e.message || String(e) };
    }
  }

  /** Lấy diagnostics cho file */
  public async handleGetDiagnostics(message: FileMiscParams): Promise<BaseResult> {
    const pathValue = message.path || message.filePath;
    if (!pathValue) {
      return { command: 'getDiagnosticsResult', requestId: message.requestId, error: 'Path is required' };
    }

    // TODO: Tích hợp với LSP client để lấy diagnostics thực
    return {
      command: 'getDiagnosticsResult',
      requestId: message.requestId,
      path: pathValue,
      diagnostics: [],
    };
  }

  /** Lấy nội dung file (alias cho readFile) */
  public async handleGetFileContent(message: FileMiscParams): Promise<BaseResult> {
    const pathValue = message.path || message.filePath;
    if (!pathValue) {
      return { command: 'fileContent', requestId: message.requestId, error: 'Path is required' };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');
      const content = await api.invoke('fs:read-file', pathValue);

      return {
        command: 'fileContent',
        requestId: message.requestId,
        path: pathValue,
        content,
      };
    } catch (e: any) {
      return { command: 'fileContent', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}