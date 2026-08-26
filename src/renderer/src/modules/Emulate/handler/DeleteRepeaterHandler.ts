/**
 * DeleteRepeaterHandler — Xóa một request khỏi Repeater (từ database).
 *
 * Usage:
 *   const handler = new DeleteRepeaterHandler();
 *   const result = await handler.handle(requests, 'repeater_1', targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';

export class DeleteRepeaterHandler {
  /**
   * Xóa request theo indexing mapping `repeater_<number>`.
   * @param requests   - Danh sách requests gốc đã capture (không dùng nữa, giữ để tương thích)
   * @param repeaterId - Indexing mapping từ list_repeaters, format: repeater_<number>
   * @param targetId   - Target ID để query database
   */
  public async handle(requests: NetworkRequest[], repeaterId: string, targetId?: string | null): Promise<{ text: string }> {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[delete_repeater] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[delete_repeater] Error: targetId is required to access database`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);

    try {
      // Fetch repeater requests from DB
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[delete_repeater] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[delete_repeater] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const req = repeaterReqs[repeaterIdx];
      await emulateApi.deleteRequest(targetId, req.id);

      // Dispatch event để UI update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('repeater-updated'));
      }

      return { text: `[delete_repeater] Removed ${repeaterId}` };
    } catch (err: any) {
      logger.error('[DeleteRepeaterHandler] Error:', err);
      return { text: `[delete_repeater] Error: ${err.message || String(err)}` };
    }
  }
}