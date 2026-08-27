/**
 * SendToRepeaterHandler — Thêm request HTTPS đã capture vào Repeater bằng cách tạo DB record.
 *
 * Usage:
 *   const handler = new SendToRepeaterHandler();
 *   const result = await handler.handle(requests, 3, targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';

export class SendToRepeaterHandler {
  /**
   * Thêm request theo index 1-indexed (vị trí gốc, không phụ thuộc filter UI).
   * @param requests - Danh sách requests gốc đã capture
   * @param index    - Số index 1-indexed từ list_https
   * @param targetId - Target ID để lưu vào DB
   */
  public async handle(requests: NetworkRequest[], index: number, targetId?: string | null): Promise<{ text: string }> {
    const arrayIndex = index - 1;

    if (arrayIndex < 0 || arrayIndex >= requests.length) {
      return {
        text: `[send_to_repeater] Error: index ${index} out of range (1-${requests.length})`,
      };
    }

    if (!targetId) {
      return {
        text: `[send_to_repeater] Error: targetId is required to save to database`,
      };
    }

    const req = requests[arrayIndex];
    
    try {
      // Parse headers từ NetworkRequest format
      let headers: any[] = [];
      if (req.requestHeaders) {
        headers = Object.entries(req.requestHeaders).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value,
          enabled: true,
        }));
      }

      // Format JSON with indentation for readability
      const headersFormatted = JSON.stringify(headers, null, 2);

      const res = await emulateApi.createRequest(targetId, {
        method: req.method,
        url: req.url,
        body: req.requestBody || '',
        params: '[]', // Default empty params (already formatted)
        headers: headersFormatted,
      });

      if (res.success) {
        // Dispatch event để UI update
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('repeater-updated'));
        }
        return { text: `[send_to_repeater] Added request_${index} to repeater (DB ID: ${res.data?.id})` };
      } else {
        return { text: `[send_to_repeater] Error: ${res.error || 'Failed to create request'}` };
      }
    } catch (err: any) {
      logger.error('[SendToRepeaterHandler] Error:', err);
      return { text: `[send_to_repeater] Error: ${err.message || String(err)}` };
    }
  }
}