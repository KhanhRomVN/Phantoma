/**
 * UpdateRepeaterContentHandler — Update params/headers/body bằng cách replace text trong JSON file.
 * Hoạt động giống hệt replace_in_file: exact string replacement với fuzzy fallback.
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
  public async handle(
    requests: NetworkRequest[],
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
        text: `[update_repeater_content] Error: targetId is required to access database`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);

    try {
      // Fetch repeater request from DB to get request ID and current content
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[update_repeater_content] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[update_repeater_content] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const req = repeaterReqs[repeaterIdx];

      // Get current file content based on target (stored as JSON in backend)
      let fileContent = '';
      if (target === 'params') {
        fileContent = req.params || '[]';
      } else if (target === 'headers') {
        fileContent = req.headers || '[]';
      } else if (target === 'body') {
        fileContent = req.body || '';
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

      // If exact match fails, try fuzzy matching (như ReplaceInFileHandler)
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

      // Use updatedContent as-is, NO auto-formatting
      // This preserves the exact format provided by the user/AI
      const finalContent = updatedContent;

      // Update in database via API
      const updateInput: any = {};
      if (target === 'params') updateInput.params = finalContent;
      if (target === 'headers') updateInput.headers = finalContent;
      if (target === 'body') updateInput.body = finalContent;

      logger.info(`[UpdateRepeaterContentHandler] DEBUG - updateInput: ${JSON.stringify(updateInput)}`);
      
      const updateRes = await emulateApi.updateRequest(targetId, req.id, updateInput);
      
      logger.info(`[UpdateRepeaterContentHandler] DEBUG - updateRes: ${JSON.stringify(updateRes)}`);
      
      if (!updateRes.success) {
        return {
          text: `[update_repeater_content] Error: ${updateRes.error || 'Failed to update'}`,
        };
      }

      // Dispatch event to refresh UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('repeater-updated'));
      }

      return { 
        text: `[update_repeater_content] Updated ${repeaterId} ${target}` 
      };
    } catch (err: any) {
      logger.error('[UpdateRepeaterContentHandler] Error:', err);
      return { text: `[update_repeater_content] Error: ${err.message || String(err)}` };
    }
  }
}
