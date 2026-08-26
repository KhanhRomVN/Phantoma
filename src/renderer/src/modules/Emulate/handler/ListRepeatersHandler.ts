/**
 * ListRepeatersHandler — Liệt kê các request hiện đang lưu trong Repeater (từ database).
 *
 * Usage:
 *   const handler = new ListRepeatersHandler();
 *   const result = await handler.handle(requests, targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';

export class ListRepeatersHandler {
  public async handle(requests: NetworkRequest[], targetId?: string | null): Promise<{ text: string }> {
    console.log('[DEBUG][ListRepeatersHandler] targetId:', targetId);
    console.log('[DEBUG][ListRepeatersHandler] total requests in memory:', requests.length);
    
    if (!targetId) {
      return {
        text: `[list_repeaters] Error: targetId is required to query database`,
      };
    }
    
    try {
      const res = await emulateApi.listRequests(targetId);
      
      if (!res.success) {
        return {
          text: `[list_repeaters] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }
      
      const dbRequests = res.data || [];
      console.log('[DEBUG][ListRepeatersHandler] DB requests count:', dbRequests.length);
      
      const lines = dbRequests.map((req: any, i: number) => {
        let host = '';
        let path = '';
        try {
          host = new URL(req.url).host;
          path = new URL(req.url).pathname + new URL(req.url).search;
        } catch {
          logger.warn('[ListRepeatersHandler] Invalid URL:', req.url);
        }
        return `- repeater_${i} | ${req.method} | ${host} | ${path}`;
      });

      return {
        text: `[list_repeaters] Total: ${dbRequests.length}\n` + lines.join('\n'),
      };
    } catch (err: any) {
      logger.error('[ListRepeatersHandler] Error:', err);
      return {
        text: `[list_repeaters] Error: ${err.message || String(err)}`,
      };
    }
  }
}