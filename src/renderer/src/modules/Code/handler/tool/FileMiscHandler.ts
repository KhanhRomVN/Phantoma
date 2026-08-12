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
    console.log('[DEBUG-Diagnostics] handleGetDiagnostics called | pathValue:', pathValue);

    if (!pathValue) {
      return { command: 'getDiagnosticsResult', requestId: message.requestId, error: 'Path is required' };
    }

    try {
      // Lazy import để tránh circular dependency
      const { useDiagnosticsStore } = await import('../../stores/diagnosticsStore');
      const allDiagnostics = useDiagnosticsStore.getState().diagnostics;
      const fileDiagnostics = useDiagnosticsStore.getState().getDiagnosticsForFile(pathValue);

      console.log('[DEBUG-Diagnostics] total URIs in store:', Object.keys(allDiagnostics).length);
      console.log('[DEBUG-Diagnostics] URIs:', Object.keys(allDiagnostics).slice(0, 5));
      console.log('[DEBUG-Diagnostics] diagnostics for', pathValue, ':', fileDiagnostics.length, 'items');

      return {
        command: 'getDiagnosticsResult',
        requestId: message.requestId,
        path: pathValue,
        diagnostics: fileDiagnostics.length > 0 ? fileDiagnostics : [],
      };
    } catch (e: any) {
      console.error('[DEBUG-Diagnostics] error:', e);
      return {
        command: 'getDiagnosticsResult',
        requestId: message.requestId,
        path: pathValue,
        error: e.message || String(e),
        diagnostics: [],
      };
    }
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