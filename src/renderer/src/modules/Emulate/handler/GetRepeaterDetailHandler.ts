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

      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.id: ${req.id}`);
      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.params: ${JSON.stringify(req.params)}`);
      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.headers length: ${req.headers?.length || 0}`);
      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.body length: ${req.body?.length || 0}`);

      // Get raw content from database - NO auto-formatting, show exact file content
      const paramsRaw = req.params || '[]';
      const headersRaw = req.headers || '[]';
      const bodyRaw = req.body || '';

      // Build output with EXACT content (no formatting)
      const method = req.method || 'GET';
      const url = req.url || '';
      const firstLine = `[get_repeater_detail] ${repeaterId} ${method} ${url}`;

      // Output EXACT content without formatting
      const paramsText = paramsRaw 
        ? '\n\n**Params:**\n```json\n' + paramsRaw + '\n```'
        : '\n\n**Params:**\n```json\n```';
        
      const headersText = headersRaw 
        ? '\n\n**Headers:**\n```json\n' + headersRaw + '\n```'
        : '\n\n**Headers:**\n```json\n```';
        
      const bodyText = bodyRaw 
        ? '\n\n**Body:**\n```json\n' + bodyRaw + '\n```'
        : '\n\n**Body:**\n```json\n```';

      return {
        text: firstLine + paramsText + headersText + bodyText,
      };
    } catch (err: any) {
      logger.error('[GetRepeaterDetailHandler] Error:', err);
      return { text: `[get_repeater_detail] Error: ${err.message || String(err)}` };
    }
  }
}