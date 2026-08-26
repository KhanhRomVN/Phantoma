/**
 * UpdateRepeaterContentHandler — Cập nhật params/headers/body của request trong Repeater (lưu vào database).
 *
 * Usage:
 *   const handler = new UpdateRepeaterContentHandler();
 *   const result = await handler.handle(requests, 'repeater_1', 'headers', oldContent, newContent, targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';

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

      if (target === 'params') {
        const [base, query = ''] = dbReq.url.split('?');
        const newQuery = query.replace(oldContent, newContent);
        updatedUrl = base + (newQuery ? '?' + newQuery : '');
      } else if (target === 'headers') {
        const headersStr = dbReq.headers || '[]';
        updatedHeaders = headersStr.replace(oldContent, newContent);
      } else if (target === 'body') {
        updatedBody = (dbReq.body || '').replace(oldContent, newContent);
      }

      // Update in database
      await emulateApi.updateRequest(targetId, dbReq.id, {
        method: dbReq.method,
        url: updatedUrl,
        body: updatedBody,
        params: dbReq.params,
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