/**
 * ------------------------------------------------------------------
 * RevertFileHandler
 * ------------------------------------------------------------------
 * IPC message handler for reverting a file to a previous version.
 * ------------------------------------------------------------------
 */

import { SecurityValidator } from '../../utils/security';
import { ReplaceInFileHistoryManager } from '../../managers/ReplaceInFileHistoryManager';
import { BaseParams, BaseResult } from './FileHandlerTypes';

interface RevertFileParams extends BaseParams {
  file_path?: string;
  path?: string;
  version?: number;
  conversationId?: string;
}

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