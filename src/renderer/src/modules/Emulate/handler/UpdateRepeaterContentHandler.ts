/**
 * UpdateRepeaterContentHandler — Update params/headers/body bằng cách replace text trong JSON file.
 * Hoạt động giống hệt replace_in_file: exact string replacement với fuzzy fallback.
 * Cập nhật trực tiếp vào file thay vì qua API để tránh bước trung gian.
 *
 * Usage:
 *   const handler = new UpdateRepeaterContentHandler();
 *   const result = await handler.handle('repeater_1', 'headers', oldContent, newContent, targetId);
 */

import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';
import { FuzzyMatcher } from '../../Code/utils/FuzzyMatcher';

export type RepeaterTarget = 'params' | 'headers' | 'body';

export class UpdateRepeaterContentHandler {
  /**
   * Lấy đường dẫn file tương ứng với target
   * Format: ~/.phantoma/repeaters/{targetId}/repeater_{requestId}/{target}.json
   */
  private async getFilePath(
    targetId: string,
    requestId: string,
    target: RepeaterTarget,
    api: any,
  ): Promise<string> {
    const homedir = await api.invoke('fs:get-homedir');
    return `${homedir}/.phantoma/repeaters/${targetId}/repeater_${requestId}/${target}.json`;
  }

  public async handle(
    _requests: NetworkRequest[],
    repeaterId: string,
    target: RepeaterTarget,
    oldContent: string,
    newContent: string,
    targetId?: string | null,
  ): Promise<{ text: string }> {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[update_repeater_content] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[update_repeater_content] Error: targetId is required`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);

    // Check IPC availability
    const api = (window as any).api;
    if (!api?.invoke) {
      return {
        text: `[update_repeater_content] Error: IPC not available`,
      };
    }

    try {
      // Fetch repeater request list to get request ID
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[update_repeater_content] Error: ${res.error || 'Failed to fetch repeater list'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[update_repeater_content] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const req = repeaterReqs[repeaterIdx];
      const filePath = await this.getFilePath(targetId, req.id, target, api);

      logger.info(`[UpdateRepeaterContentHandler] Reading file: ${filePath}`);

      // Read file content directly via IPC
      let fileContent: string;
      try {
        fileContent = await api.invoke('fs:read-file', filePath);
      } catch (readErr: any) {
        // File not found — create with default content
        const defaultContent = target === 'body' ? '' : '[]';
        logger.info(`[UpdateRepeaterContentHandler] File not found, creating with default content`);
        
        try {
          await api.invoke('fs:write-file', filePath, defaultContent);
          fileContent = defaultContent;
        } catch (writeErr: any) {
          return {
            text: `[update_repeater_content] Error: Cannot create file: ${writeErr.message || String(writeErr)}`,
          };
        }
      }

      logger.info(`[UpdateRepeaterContentHandler] DEBUG - target: ${target}`);
      logger.info(`[UpdateRepeaterContentHandler] DEBUG - fileContent: ${JSON.stringify(fileContent)}`);
      logger.info(`[UpdateRepeaterContentHandler] DEBUG - oldContent: ${JSON.stringify(oldContent)}`);
      logger.info(`[UpdateRepeaterContentHandler] DEBUG - newContent: ${JSON.stringify(newContent)}`);

      // Normalize line endings for consistent matching
      const normalizedContent = fileContent.replace(/\r\n/g, '\n');
      const normalizedOld = oldContent.replace(/\r\n/g, '\n');
      const normalizedNew = newContent.replace(/\r\n/g, '\n');

      // Try exact match first
      let targetText = normalizedOld;
      let targetPos = normalizedContent.indexOf(normalizedOld);

      // If exact match fails, try fuzzy matching
      if (targetPos === -1) {
        const fuzzy = FuzzyMatcher.findMatch(normalizedContent, normalizedOld);
        if (!fuzzy || fuzzy.score > 0.3) {
          return {
            text: `[update_repeater_content] Error: old_content not found in ${target}\n\nDEBUG INFO:\n- Current ${target} content:\n${fileContent}\n\n- Searching for:\n${oldContent}\n\nSuggestion: Check the exact text in the file or try with more context.`,
          };
        }
        // Use fuzzy match result
        targetText = fuzzy.originalText;
        targetPos = normalizedContent.indexOf(targetText);
      }

      if (targetPos === -1) {
        return {
          text: `[update_repeater_content] Error: Could not locate text in ${target}`,
        };
      }

      // Replace old_content with new_content
      const updatedContent =
        normalizedContent.slice(0, targetPos) +
        normalizedNew +
        normalizedContent.slice(targetPos + targetText.length);

      logger.info(`[UpdateRepeaterContentHandler] DEBUG - updatedContent: ${JSON.stringify(updatedContent)}`);

      // Format JSON for consistent pretty-print (if valid JSON)
      let finalContent = updatedContent;
      if (target === 'params' || target === 'headers') {
        try {
          const parsed = JSON.parse(updatedContent);
          finalContent = JSON.stringify(parsed, null, 2);
          logger.info(`[UpdateRepeaterContentHandler] ✅ JSON formatted with indent`);
        } catch (parseErr) {
          // If parse fails, keep original content and show warning
          logger.warn(`[UpdateRepeaterContentHandler] ⚠️  Invalid JSON, keeping original format: ${parseErr}`);
          // Don't write invalid JSON - return error instead
          return {
            text: `[update_repeater_content] Error: Result is not valid JSON\n\nInvalid content:\n${updatedContent}\n\nParse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\n\nSuggestion: Check your new_content syntax.`,
          };
        }
      }

      // Write directly to file via IPC
      try {
        await api.invoke('fs:write-file', filePath, finalContent);
        logger.info(`[UpdateRepeaterContentHandler] ✅ File updated: ${filePath}`);
      } catch (writeErr: any) {
        return {
          text: `[update_repeater_content] Error: Failed to write file: ${writeErr.message || String(writeErr)}`,
        };
      }

      // Dispatch event to refresh UI
      if (typeof window !== 'undefined') {
        logger.info('[UpdateRepeaterContentHandler] 📣 Dispatching repeater-updated event');
        window.dispatchEvent(new CustomEvent('repeater-updated'));
        logger.info('[UpdateRepeaterContentHandler] ✅ Event dispatched');
      }

      return {
        text: `[update_repeater_content] Updated ${repeaterId} ${target}`,
      };
    } catch (err: any) {
      logger.error('[UpdateRepeaterContentHandler] Error:', err);
      return { text: `[update_repeater_content] Error: ${err.message || String(err)}` };
    }
  }
}
