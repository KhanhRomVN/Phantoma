/**
 * SetRepeaterPayloadValuesHandler — Gán lại toàn bộ giá trị cho một payload variable.
 *
 * Usage:
 *   const handler = new SetRepeaterPayloadValuesHandler();
 *   const result = handler.handle(requests, 'repeater_1', 'payload_0', ['val1', 'val2']);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { getRepeaterIds, loadPayloadValues, savePayloadValues } from '../components/WorkspacePanel/Repeater';
import { ListPayloadsHandler } from './ListPayloadsHandler';

export class SetRepeaterPayloadValuesHandler {
  private listPayloadsHandler = new ListPayloadsHandler();

  public handle(
    requests: NetworkRequest[],
    repeaterId: string,
    payloadId: string,
    values: string[],
  ): { text: string } {
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

    const repeaterIdx = parseInt(repeaterMatch[1], 10);
    const payloadIdx = parseInt(payloadMatch[1], 10);

    const repeaterIds = getRepeaterIds();
    const repeaterReqs = requests.filter((req) => repeaterIds.has(req.id));

    if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
      return {
        text: `[set_repeater_payload_values] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
      };
    }

    const req = repeaterReqs[repeaterIdx];

    // Tìm payload theo index — dùng ListPayloadsHandler để quét lại
    const listResult = this.listPayloadsHandler.handle(requests, repeaterId);
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

    // Cập nhật values trong localStorage
    const allValues = loadPayloadValues();
    if (!allValues[req.id]) {
      allValues[req.id] = {};
    }
    allValues[req.id][payloadName] = values;
    savePayloadValues(allValues);

    return {
      text: `[set_repeater_payload_values] Updated payload_${payloadIdx} (${payloadName}) — ${values.length} values`,
    };
  }
}