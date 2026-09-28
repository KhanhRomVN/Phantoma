/**
 * ------------------------------------------------------------------
 * FileMiscHandler
 * ------------------------------------------------------------------
 * IPC message handler for miscellaneous file operations:
 * - getFileStats
 * - getDiagnostics
 * - getFileContent
 * ------------------------------------------------------------------
 */

import { logger } from '@renderer/utils/logger';
import { BaseParams, BaseResult } from './FileHandlerTypes';

interface FileMiscParams extends BaseParams {
  path?: string;
  filePath?: string;
}

export class FileMiscHandler {
  /** Lấy thông tin file (kích thước, ngày sửa...) */
  public async handleGetFileStats(message: FileMiscParams): Promise<BaseResult> {
    const pathValue = message.path || message.filePath;
    if (!pathValue) {
      return {
        command: 'getFileStatsResult',
        requestId: message.requestId,
        error: 'Path is required',
      };
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
      return {
        command: 'getFileStatsResult',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }

  /** Lấy diagnostics cho file */
  public async handleGetDiagnostics(message: FileMiscParams): Promise<BaseResult> {
    const pathValue = message.path || message.filePath;

    if (!pathValue) {
      return {
        command: 'getDiagnosticsResult',
        requestId: message.requestId,
        error: 'Path is required',
      };
    }

    // LSP removed — always return empty diagnostics
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
      return {
        command: 'fileContent',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }
}
