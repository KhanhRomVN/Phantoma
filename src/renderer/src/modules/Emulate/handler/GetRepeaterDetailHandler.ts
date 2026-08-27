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

      // Get raw content from database and format as JSON
      const paramsRaw = req.params || '[]';
      const headersRaw = req.headers || '[]';
      const bodyRaw = req.body || '';

      // Auto-format JSON for readability
      const formatJson = (jsonStr: string): string => {
        try {
          const parsed = JSON.parse(jsonStr);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return jsonStr; // Return as-is if not valid JSON
        }
      };

      // Build output with formatted JSON content
      const method = req.method || 'GET';
      const url = req.url || '';
      const firstLine = `[get_repeater_detail] ${repeaterId} ${method} ${url}`;

      // Output formatted JSON content
      let paramsText = '';
      if (paramsRaw && paramsRaw !== '[]') {
        paramsText = '\n\n**Params:**\n```json\n' + formatJson(paramsRaw) + '\n```';
      }

      let headersText = '';
      if (headersRaw && headersRaw !== '[]') {
        headersText = '\n\n**Headers:**\n```json\n' + formatJson(headersRaw) + '\n```';
      }

      let bodyText = '';
      if (bodyRaw) {
        bodyText = '\n\n**Body:**\n```json\n' + formatJson(bodyRaw) + '\n```';
      } else {
        bodyText = '\n\n**Body:** <no value>';
      }

      return {
        text: firstLine + paramsText + headersText + bodyText,
      };
    } catch (err: any) {
      logger.error('[GetRepeaterDetailHandler] Error:', err);
      return { text: `[get_repeater_detail] Error: ${err.message || String(err)}` };
    }
  }
}