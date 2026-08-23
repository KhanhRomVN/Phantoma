/**
 * UpdateRepeaterContentHandler — Cập nhật params/headers/body của request trong Repeater.
 *
 * Usage:
 *   const handler = new UpdateRepeaterContentHandler();
 *   const result = handler.handle(requests, 'repeater_1', 'headers', oldContent, newContent);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { getRepeaterIds } from '../components/WorkspacePanel/Repeater';

export type RepeaterTarget = 'params' | 'headers' | 'body';

export class UpdateRepeaterContentHandler {
  public handle(
    requests: NetworkRequest[],
    repeaterId: string,
    target: RepeaterTarget,
    oldContent: string,
    newContent: string,
  ): { text: string } {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[update_repeater_content] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);
    const repeaterIds = getRepeaterIds();
    const repeaterReqs = requests.filter((req) => repeaterIds.has(req.id));

    if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
      return {
        text: `[update_repeater_content] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
      };
    }

    const req = repeaterReqs[repeaterIdx];

    if (target === 'params') {
      const [base, query = ''] = req.url.split('?');
      const newQuery = query.replace(oldContent, newContent);
      req.url = base + (newQuery ? '?' + newQuery : '');
    } else if (target === 'headers') {
      const headersJson = JSON.stringify(req.requestHeaders || {});
      const updatedJson = headersJson.replace(oldContent, newContent);
      try {
        req.requestHeaders = JSON.parse(updatedJson);
      } catch {
        // giữ nguyên nếu JSON mới không hợp lệ
      }
    } else if (target === 'body') {
      req.requestBody = (req.requestBody || '').replace(oldContent, newContent);
    }

    return { text: `[update_repeater_content] Updated ${repeaterId} ${target}` };
  }
}