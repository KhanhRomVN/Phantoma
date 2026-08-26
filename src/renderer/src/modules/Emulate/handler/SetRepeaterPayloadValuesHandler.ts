/**
 * SetRepeaterPayloadValuesHandler — Gán lại toàn bộ giá trị cho một payload variable (lưu vào database).
 *
 * Usage:
 *   const handler = new SetRepeaterPayloadValuesHandler();
 *   const result = await handler.handle(requests, 'repeater_1', 'payload_0', ['val1', 'val2'], targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';
import { ListPayloadsHandler } from './ListPayloadsHandler';

export class SetRepeaterPayloadValuesHandler {
  private listPayloadsHandler = new ListPayloadsHandler();

  public async handle(
    requests: NetworkRequest[],
    repeaterId: string,
    payloadId: string,
    values: string[],
    targetId?: string | null,
  ): Promise<{ text: string }> {
    // Validate repeater_id
    const repeaterMatch = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!repeaterMatch) {
      return {
        text: `[set_repeater_payload_values] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    // Validate payload_id
    const payloadMatch = /^payload_(\d+)$/.exec(payloadId.trim());
    if (!payloadMatch) {
      return {
        text: `[set_repeater_payload_values] Error: invalid payload id "${payloadId}". Expected format: payload_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[set_repeater_payload_values] Error: targetId is required to access database`,
      };
    }

    const repeaterIdx = parseInt(repeaterMatch[1], 10);
    const payloadIdx = parseInt(payloadMatch[1], 10);

    try {
      // Fetch repeater requests from DB
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[set_repeater_payload_values] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[set_repeater_payload_values] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const dbReq = repeaterReqs[repeaterIdx];

      // Tìm payload theo index — dùng ListPayloadsHandler để quét lại
      const listResult = await this.listPayloadsHandler.handle(requests, repeaterId, targetId);
      const text = listResult.text;

      // Parse danh sách payload từ output của list_payloads
      const payloadLines = text
        .split('\n')
        .filter((line) => line.startsWith('- payload_'));

      if (payloadIdx < 0 || payloadIdx >= payloadLines.length) {
        return {
          text: `[set_repeater_payload_values] Error: payload ${payloadId} out of range (0-${payloadLines.length - 1})`,
        };
      }

      // Extract payload name từ dòng `- payload_N | name | location | values`
      const line = payloadLines[payloadIdx];
      const parts = line.split('|').map((s) => s.trim());
      const payloadName = parts[1];

      if (!payloadName) {
        return {
          text: `[set_repeater_payload_values] Error: cannot resolve payload name from "${line}"`,
        };
      }

      // Cập nhật values trong database
      await emulateApi.upsertPayload(targetId, dbReq.id, {
        name: payloadName,
        payload_values: JSON.stringify(values),
        enabled: 1,
      });

      return {
        text: `[set_repeater_payload_values] Updated payload_${payloadIdx} (${payloadName}) — ${values.length} values`,
      };
    } catch (err: any) {
      logger.error('[SetRepeaterPayloadValuesHandler] Error:', err);
      return { text: `[set_repeater_payload_values] Error: ${err.message || String(err)}` };
    }
  }
}