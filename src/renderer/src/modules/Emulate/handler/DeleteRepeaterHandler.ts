/**
 * DeleteRepeaterHandler — Xóa một request khỏi Repeater.
 *
 * Usage:
 *   const handler = new DeleteRepeaterHandler();
 *   const result = handler.handle(requests, 'repeater_1');
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { getRepeaterIds, removeFromRepeater } from '../components/WorkspacePanel/Repeater';

export class DeleteRepeaterHandler {
  /**
   * Xóa request theo indexing mapping `repeater_<number>`.
   * @param requests   - Danh sách requests gốc đã capture
   * @param repeaterId - Indexing mapping từ list_repeaters, format: repeater_<number>
   */
  public handle(requests: NetworkRequest[], repeaterId: string): { text: string } {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[delete_repeater] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);
    const repeaterIds = getRepeaterIds();
    const repeaterReqs = requests.filter((req) => repeaterIds.has(req.id));

    if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
      return {
        text: `[delete_repeater] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
      };
    }

    const req = repeaterReqs[repeaterIdx];
    removeFromRepeater(req.id);
    return { text: `[delete_repeater] Removed ${repeaterId}` };
  }
}