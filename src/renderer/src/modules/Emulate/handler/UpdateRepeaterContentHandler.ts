/**
 * UpdateRepeaterContentHandler — Cập nhật params/headers/body của request trong Repeater (lưu vào database).
 * Sử dụng FuzzyMatcher để tìm old_content khi exact match thất bại.
 *
 * Usage:
 *   const handler = new UpdateRepeaterContentHandler();
 *   const result = await handler.handle(requests, 'repeater_1', 'headers', oldContent, newContent, targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';
import { FuzzyMatcher } from '@renderer/modules/Code/utils/FuzzyMatcher';

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
      // Fetch repeater requests from DB
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

      const dbReq = repeaterReqs[repeaterIdx];
      let updatedUrl = dbReq.url;
      let updatedHeaders = dbReq.headers;
      let updatedBody = dbReq.body;
      let updatedParams = dbReq.params;

      if (target === 'params') {
        const paramsStr = dbReq.params || '{}';
        
        console.log('[DEBUG][UpdateRepeaterContentHandler] target=params');
        console.log('[DEBUG][UpdateRepeaterContentHandler] paramsStr:', JSON.stringify(paramsStr));
        console.log('[DEBUG][UpdateRepeaterContentHandler] paramsStr length:', paramsStr.length);
        console.log('[DEBUG][UpdateRepeaterContentHandler] oldContent:', JSON.stringify(oldContent));
        console.log('[DEBUG][UpdateRepeaterContentHandler] oldContent length:', oldContent.length);
        console.log('[DEBUG][UpdateRepeaterContentHandler] exact match check:', paramsStr.indexOf(oldContent) !== -1);
        
        // Try exact match first
        let targetText = oldContent;
        if (paramsStr.indexOf(oldContent) === -1) {
          // Fallback to fuzzy match
          console.log('[DEBUG][UpdateRepeaterContentHandler] Exact match failed, trying fuzzy match...');
          const fuzzy = FuzzyMatcher.findMatch(paramsStr, oldContent);
          console.log('[DEBUG][UpdateRepeaterContentHandler] Fuzzy match result:', fuzzy);
          if (!fuzzy || fuzzy.score > 0.3) {
            return {
              text: `[update_repeater_content] Error: old_content not found in ${target}. Expected exact match or fuzzy match with score < 0.3\n\nDEBUG INFO:\n- paramsStr: ${JSON.stringify(paramsStr)}\n- oldContent: ${JSON.stringify(oldContent)}\n- fuzzy score: ${fuzzy?.score || 'null'}`,
            };
          }
          targetText = fuzzy.originalText;
        }
        
        updatedParams = paramsStr.replace(targetText, newContent);
        console.log('[DEBUG][UpdateRepeaterContentHandler] updatedParams:', JSON.stringify(updatedParams));
      } else if (target === 'headers') {
        const headersStr = dbReq.headers || '[]';
        
        // Try exact match first
        let targetText = oldContent;
        if (headersStr.indexOf(oldContent) === -1) {
          // Fallback to fuzzy match
          const fuzzy = FuzzyMatcher.findMatch(headersStr, oldContent);
          if (!fuzzy || fuzzy.score > 0.3) {
            return {
              text: `[update_repeater_content] Error: old_content not found in ${target}. Expected exact match or fuzzy match with score < 0.3`,
            };
          }
          targetText = fuzzy.originalText;
        }
        
        updatedHeaders = headersStr.replace(targetText, newContent);
      } else if (target === 'body') {
        const bodyStr = dbReq.body || '';
        
        // Try exact match first
        let targetText = oldContent;
        if (bodyStr.indexOf(oldContent) === -1) {
          // Fallback to fuzzy match
          const fuzzy = FuzzyMatcher.findMatch(bodyStr, oldContent);
          if (!fuzzy || fuzzy.score > 0.3) {
            return {
              text: `[update_repeater_content] Error: old_content not found in ${target}. Expected exact match or fuzzy match with score < 0.3`,
            };
          }
          targetText = fuzzy.originalText;
        }
        
        updatedBody = bodyStr.replace(targetText, newContent);
      }

      // Update in database
      await emulateApi.updateRequest(targetId, dbReq.id, {
        method: dbReq.method,
        url: updatedUrl,
        body: updatedBody,
        params: updatedParams,
        headers: updatedHeaders,
      });

      // Dispatch event để UI update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('repeater-updated'));
      }

      return { text: `[update_repeater_content] Updated ${repeaterId} ${target}` };
    } catch (err: any) {
      logger.error('[UpdateRepeaterContentHandler] Error:', err);
      return { text: `[update_repeater_content] Error: ${err.message || String(err)}` };
    }
  }
}