/**
 * ------------------------------------------------------------------
 * ViewReplaceHistoryHandler
 * ------------------------------------------------------------------
 * IPC message handler for viewing replace-in-file history.
 * ------------------------------------------------------------------
 */

import { ReplaceInFileHistoryManager } from '../../managers/ReplaceInFileHistoryManager';
import { BaseResult } from './FileHandlerTypes';

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