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

import { FuzzyMatcher } from '../../Code/utils/FuzzyMatcher';

// ─── Types ──────────────────────────────────────────────────────────────
export type RepeaterTarget = 'params' | 'headers' | 'body';

// ─── Class ──────────────────────────────────────────────────────────────
export class UpdateRepeaterContentHandler {
  /**
   * Lấy đường dẫn file tương ứng với target
   * Format: ~/.phantoma/emulate:{targetId}/repeaters/repeater_{requestId}/{target}.json
   */
  private async getFilePath(
    targetId: string,
    requestId: string,
    target: RepeaterTarget,
    api: any,
  ): Promise<string> {
    const homedir = await api.invoke('fs:get-homedir');
    return `${homedir}/.phantoma/emulate:${targetId}/repeaters/repeater_${requestId}/${target}.json`;
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

      // Read file content directly via IPC
      let fileContent: string;
      try {
        fileContent = await api.invoke('fs:read-file', filePath);
      } catch (readErr: any) {
        // File not found — create with default content
        const defaultContent = target === 'body' ? '' : '[]';
        console.warn(`[UpdateRepeaterContentHandler] ⚠️  File not found: ${filePath}`);
        console.warn(
          `[UpdateRepeaterContentHandler] ⚠️  Read error: ${readErr.message || String(readErr)}`,
        );

        try {
          await api.invoke('fs:write-file', filePath, defaultContent);
          fileContent = defaultContent;
        } catch (writeErr: any) {
          console.error(
            `[UpdateRepeaterContentHandler] ❌ Cannot create file: ${writeErr.message || String(writeErr)}`,
          );
          return {
            text: `[update_repeater_content] Error: Cannot create file: ${writeErr.message || String(writeErr)}`,
          };
        }
      }

      // Normalize line endings for consistent matching
      const normalizedContent = fileContent.replace(/\r\n/g, '\n');
      const normalizedOld = oldContent.replace(/\r\n/g, '\n');
      const normalizedNew = newContent.replace(/\r\n/g, '\n');

      // Try exact match first
      let targetText = normalizedOld;
      let targetPos = normalizedContent.indexOf(normalizedOld);

      if (targetPos !== -1) {
      } else {
        console.warn(
          `[UpdateRepeaterContentHandler] ⚠️  Exact match NOT found, trying fuzzy match...`,
        );
      }

      // If exact match fails, try fuzzy matching
      if (targetPos === -1) {
        const fuzzy = FuzzyMatcher.findMatch(normalizedContent, normalizedOld);
        if (!fuzzy || fuzzy.score > 0.3) {
          console.error(`[UpdateRepeaterContentHandler] ❌ Fuzzy match FAILED`);
          console.error(`[UpdateRepeaterContentHandler] Fuzzy score: ${fuzzy?.score || 'N/A'}`);
          console.error(`[UpdateRepeaterContentHandler] ===== FILE CONTENT =====`);
          console.error(normalizedContent);
          console.error(`[UpdateRepeaterContentHandler] ===== OLD CONTENT =====`);
          console.error(normalizedOld);
          console.error(`[UpdateRepeaterContentHandler] ======================`);
          return {
            text: `[update_repeater_content] Error: old_content not found in ${target}\n\nDEBUG INFO:\n- Current ${target} content:\n${fileContent}\n\n- Searching for:\n${oldContent}\n\nSuggestion: Check the exact text in the file or try with more context.`,
          };
        }
        // Use fuzzy match result
        targetText = fuzzy.originalText;
        targetPos = normalizedContent.indexOf(targetText);
      }

      if (targetPos === -1) {
        console.error(`[UpdateRepeaterContentHandler] ❌ Could not locate text after fuzzy match`);
        return {
          text: `[update_repeater_content] Error: Could not locate text in ${target}`,
        };
      }

      // Replace old_content with new_content
      const updatedContent =
        normalizedContent.slice(0, targetPos) +
        normalizedNew +
        normalizedContent.slice(targetPos + targetText.length);

      // Format JSON for consistent pretty-print (if valid JSON)
      let finalContent = updatedContent;
      if (target === 'params' || target === 'headers') {
        try {
          const parsed = JSON.parse(updatedContent);
          finalContent = JSON.stringify(parsed, null, 2);
        } catch (parseErr) {
          // If parse fails, DON'T write - return error
          console.error(`[UpdateRepeaterContentHandler] ❌ JSON validation FAILED`);
          console.error(
            `[UpdateRepeaterContentHandler] Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          );
          console.error(`[UpdateRepeaterContentHandler] ===== INVALID JSON =====`);
          console.error(updatedContent);
          console.error(`[UpdateRepeaterContentHandler] =======================`);
          console.warn(
            `[UpdateRepeaterContentHandler] ⚠️  FILE NOT WRITTEN - keeping original content`,
          );
          return {
            text: `[update_repeater_content] Error: Result is not valid JSON\n\nInvalid content:\n${updatedContent}\n\nParse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\n\n⚠️ Original file content has been preserved.\n\nSuggestion: Check your new_content syntax.`,
          };
        }
      }

      // Backup original content before writing (for potential rollback)
      const backupContent = fileContent;

      // Write directly to file via IPC
      try {
        await api.invoke('fs:write-file', filePath, finalContent);
      } catch (writeErr: any) {
        console.error(
          `[UpdateRepeaterContentHandler] ❌ File write FAILED: ${writeErr.message || String(writeErr)}`,
        );

        // Try to restore backup
        try {
          await api.invoke('fs:write-file', filePath, backupContent);
          return {
            text: `[update_repeater_content] Error: Failed to write file: ${writeErr.message || String(writeErr)}\n\n⚠️ Original content has been restored.`,
          };
        } catch (restoreErr: any) {
          console.error(
            `[UpdateRepeaterContentHandler] ❌ Backup restore FAILED: ${restoreErr.message || String(restoreErr)}`,
          );
          return {
            text: `[update_repeater_content] Error: Failed to write file: ${writeErr.message || String(writeErr)}\n\n⚠️ CRITICAL: Could not restore backup. Manual recovery may be needed.`,
          };
        }
      }

      // Dispatch event to refresh UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('repeater-updated'));
      }

      return {
        text: `[update_repeater_content] Updated ${repeaterId} ${target}`,
      };
    } catch (err: any) {
      console.error('[UpdateRepeaterContentHandler] ❌ Unexpected error:', err);
      console.error('[UpdateRepeaterContentHandler] Error stack:', err.stack);
      return { text: `[update_repeater_content] Error: ${err.message || String(err)}` };
    }
  }
}
