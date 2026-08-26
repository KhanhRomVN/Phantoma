/**
 * GetRepeaterDetailHandler — Trả về params, headers, body của một request trong Repeater (từ database).
 *
 * Usage:
 *   const handler = new GetRepeaterDetailHandler();
 *   const result = await handler.handle(requests, 'repeater_1', targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';

export class GetRepeaterDetailHandler {
  public async handle(requests: NetworkRequest[], repeaterId: string, targetId?: string | null): Promise<{ text: string }> {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[get_repeater_detail] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[get_repeater_detail] Error: targetId is required to access database`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);

    try {
      // Fetch repeater requests from DB
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[get_repeater_detail] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[get_repeater_detail] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const req = repeaterReqs[repeaterIdx];

      // Parse params from URL
      let params: Record<string, string> = {};
      try {
        const parsed = req.params ? JSON.parse(req.params) : [];
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (p.enabled !== false && p.key) {
              params[p.key] = p.value || '';
            }
          });
        }
      } catch {
        // Fallback: parse from URL
        try {
          const url = new URL(req.url);
          url.searchParams.forEach((value, key) => {
            params[key] = value;
          });
        } catch {
          params = {};
        }
      }

      // Parse headers
      let headers: Record<string, string> = {};
      try {
        const parsed = req.headers ? JSON.parse(req.headers) : [];
        if (Array.isArray(parsed)) {
          parsed.forEach((h: any) => {
            if (h.enabled !== false && h.key) {
              headers[h.key] = h.value || '';
            }
          });
        }
      } catch (err) {
        logger.warn('[GetRepeaterDetailHandler] Failed to parse headers:', err);
      }

      const detail = {
        params,
        headers,
        body: req.body || '',
      };

      return {
        text: `[get_repeater_detail] ${repeaterId}\n` + JSON.stringify(detail, null, 2),
      };
    } catch (err: any) {
      logger.error('[GetRepeaterDetailHandler] Error:', err);
      return { text: `[get_repeater_detail] Error: ${err.message || String(err)}` };
    }
  }
}