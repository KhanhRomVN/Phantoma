/**
 * ------------------------------------------------------------------
 * UpdateRepeaterContentHandler
 * ------------------------------------------------------------------
 * Update params/headers/body bằng cách replace text trong JSON file.
 * Hoạt động giống replace_in_file: exact match với fuzzy fallback.
 *
 * Các methods chính:
 * - handle()      : Replace text trong file repeater content
 * - getFilePath() : Lấy đường dẫn file tương ứng với target
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ── Types ──
import { NetworkRequest } from '../types/inspector';

// ── Utils ──
import { logger } from '@renderer/utils/logger';
import { FuzzyMatcher } from '../../Code/utils/FuzzyMatcher';

// ─── Types ──────────────────────────────────────────────────────────────
export type RepeaterTarget = 'params' | 'headers' | 'body';

// ─── Class ──────────────────────────────────────────────────────────────
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
        logger.info(`[UpdateRepeaterContentHandler] ✅ File read successfully, length: ${fileContent.length}`);
      } catch (readErr: any) {
        // File not found — create with default content
        const defaultContent = target === 'body' ? '' : '[]';
        logger.warn(`[UpdateRepeaterContentHandler] ⚠️  File not found: ${filePath}`);
        logger.warn(`[UpdateRepeaterContentHandler] ⚠️  Read error: ${readErr.message || String(readErr)}`);
        logger.info(`[UpdateRepeaterContentHandler] Creating file with default content: ${JSON.stringify(defaultContent)}`);
        
        try {
          await api.invoke('fs:write-file', filePath, defaultContent);
          fileContent = defaultContent;
          logger.info(`[UpdateRepeaterContentHandler] ✅ File created with default content`);
        } catch (writeErr: any) {
          logger.error(`[UpdateRepeaterContentHandler] ❌ Cannot create file: ${writeErr.message || String(writeErr)}`);
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

      logger.info(`[UpdateRepeaterContentHandler] 🔍 Searching for old_content in file...`);
      logger.info(`[UpdateRepeaterContentHandler] File content length: ${normalizedContent.length}`);
      logger.info(`[UpdateRepeaterContentHandler] Old content length: ${normalizedOld.length}`);

      // Try exact match first
      let targetText = normalizedOld;
      let targetPos = normalizedContent.indexOf(normalizedOld);

      if (targetPos !== -1) {
        logger.info(`[UpdateRepeaterContentHandler] ✅ Exact match found at position: ${targetPos}`);
      } else {
        logger.warn(`[UpdateRepeaterContentHandler] ⚠️  Exact match NOT found, trying fuzzy match...`);
      }

      // If exact match fails, try fuzzy matching
      if (targetPos === -1) {
        const fuzzy = FuzzyMatcher.findMatch(normalizedContent, normalizedOld);
        if (!fuzzy || fuzzy.score > 0.3) {
          logger.error(`[UpdateRepeaterContentHandler] ❌ Fuzzy match FAILED`);
          logger.error(`[UpdateRepeaterContentHandler] Fuzzy score: ${fuzzy?.score || 'N/A'}`);
          logger.error(`[UpdateRepeaterContentHandler] ===== FILE CONTENT =====`);
          logger.error(normalizedContent);
          logger.error(`[UpdateRepeaterContentHandler] ===== OLD CONTENT =====`);
          logger.error(normalizedOld);
          logger.error(`[UpdateRepeaterContentHandler] ======================`);
          return {
            text: `[update_repeater_content] Error: old_content not found in ${target}\n\nDEBUG INFO:\n- Current ${target} content:\n${fileContent}\n\n- Searching for:\n${oldContent}\n\nSuggestion: Check the exact text in the file or try with more context.`,
          };
        }
        // Use fuzzy match result
        logger.info(`[UpdateRepeaterContentHandler] ✅ Fuzzy match found with score: ${fuzzy.score}`);
        targetText = fuzzy.originalText;
        targetPos = normalizedContent.indexOf(targetText);
      }

      if (targetPos === -1) {
        logger.error(`[UpdateRepeaterContentHandler] ❌ Could not locate text after fuzzy match`);
        return {
          text: `[update_repeater_content] Error: Could not locate text in ${target}`,
        };
      }

      // Replace old_content with new_content
      const updatedContent =
        normalizedContent.slice(0, targetPos) +
        normalizedNew +
        normalizedContent.slice(targetPos + targetText.length);

      logger.info(`[UpdateRepeaterContentHandler] ✅ Content replaced successfully`);
      logger.info(`[UpdateRepeaterContentHandler] Updated content length: ${updatedContent.length}`);

      // Format JSON for consistent pretty-print (if valid JSON)
      let finalContent = updatedContent;
      if (target === 'params' || target === 'headers') {
        logger.info(`[UpdateRepeaterContentHandler] 🔍 Validating JSON for ${target}...`);
        try {
          const parsed = JSON.parse(updatedContent);
          finalContent = JSON.stringify(parsed, null, 2);
          logger.info(`[UpdateRepeaterContentHandler] ✅ JSON is valid and formatted with 2-space indent`);
        } catch (parseErr) {
          // If parse fails, DON'T write - return error
          logger.error(`[UpdateRepeaterContentHandler] ❌ JSON validation FAILED`);
          logger.error(`[UpdateRepeaterContentHandler] Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
          logger.error(`[UpdateRepeaterContentHandler] ===== INVALID JSON =====`);
          logger.error(updatedContent);
          logger.error(`[UpdateRepeaterContentHandler] =======================`);
          logger.warn(`[UpdateRepeaterContentHandler] ⚠️  FILE NOT WRITTEN - keeping original content`);
          logger.info(`[UpdateRepeaterContentHandler] 📦 Original file content preserved (length: ${fileContent.length})`);
          return {
            text: `[update_repeater_content] Error: Result is not valid JSON\n\nInvalid content:\n${updatedContent}\n\nParse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\n\n⚠️ Original file content has been preserved.\n\nSuggestion: Check your new_content syntax.`,
          };
        }
      }

      // Backup original content before writing (for potential rollback)
      const backupContent = fileContent;
      logger.info(`[UpdateRepeaterContentHandler] 📦 Backup created (length: ${backupContent.length})`);

      // Write directly to file via IPC
      logger.info(`[UpdateRepeaterContentHandler] 💾 Writing to file: ${filePath}`);
      logger.info(`[UpdateRepeaterContentHandler] Final content length: ${finalContent.length}`);
      try {
        await api.invoke('fs:write-file', filePath, finalContent);
        logger.info(`[UpdateRepeaterContentHandler] ✅ File updated successfully: ${filePath}`);
      } catch (writeErr: any) {
        logger.error(`[UpdateRepeaterContentHandler] ❌ File write FAILED: ${writeErr.message || String(writeErr)}`);
        logger.warn(`[UpdateRepeaterContentHandler] 🔄 Attempting to restore backup...`);
        
        // Try to restore backup
        try {
          await api.invoke('fs:write-file', filePath, backupContent);
          logger.info(`[UpdateRepeaterContentHandler] ✅ Backup restored successfully`);
          return {
            text: `[update_repeater_content] Error: Failed to write file: ${writeErr.message || String(writeErr)}\n\n⚠️ Original content has been restored.`,
          };
        } catch (restoreErr: any) {
          logger.error(`[UpdateRepeaterContentHandler] ❌ Backup restore FAILED: ${restoreErr.message || String(restoreErr)}`);
          return {
            text: `[update_repeater_content] Error: Failed to write file: ${writeErr.message || String(writeErr)}\n\n⚠️ CRITICAL: Could not restore backup. Manual recovery may be needed.`,
          };
        }
      }

      // Dispatch event to refresh UI
      if (typeof window !== 'undefined') {
        logger.info('[UpdateRepeaterContentHandler] 📣 Dispatching repeater-updated event');
        window.dispatchEvent(new CustomEvent('repeater-updated'));
        logger.info('[UpdateRepeaterContentHandler] ✅ Event dispatched successfully');
      }

      logger.info(`[UpdateRepeaterContentHandler] 🎉 Update completed successfully for ${repeaterId} ${target}`);
      return {
        text: `[update_repeater_content] Updated ${repeaterId} ${target}`,
      };
    } catch (err: any) {
      logger.error('[UpdateRepeaterContentHandler] ❌ Unexpected error:', err);
      logger.error('[UpdateRepeaterContentHandler] Error stack:', err.stack);
      return { text: `[update_repeater_content] Error: ${err.message || String(err)}` };
    }
  }
}
