/**
 * SendToRepeaterHandler — Thêm request HTTPS đã capture vào Repeater.
 *
 * Usage:
 *   const handler = new SendToRepeaterHandler();
 *   const result = handler.handle(requests, 3);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { addToRepeater } from '../components/WorkspacePanel/Repeater';

export class SendToRepeaterHandler {
  /**
   * Thêm request theo index 1-indexed (vị trí gốc, không phụ thuộc filter UI).
   * @param requests - Danh sách requests gốc đã capture
   * @param index    - Số index 1-indexed từ list_https
   */
  public handle(requests: NetworkRequest[], index: number): { text: string } {
    const arrayIndex = index - 1;

    if (arrayIndex < 0 || arrayIndex >= requests.length) {
      return {
        text: `[send_to_repeater] Error: index ${index} out of range (1-${requests.length})`,
      };
    }

    const req = requests[arrayIndex];
    addToRepeater(req.id);
    return { text: `[send_to_repeater] Added request_${index} to repeater` };
  }
}