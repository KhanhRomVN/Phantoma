/**
 * GetRepeaterDetailHandler — Trả về params, headers, body của một request trong Repeater.
 *
 * Usage:
 *   const handler = new GetRepeaterDetailHandler();
 *   const result = handler.handle(requests, 'repeater_1');
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { getRepeaterIds } from '../components/WorkspacePanel/Repeater';

export class GetRepeaterDetailHandler {
  public handle(requests: NetworkRequest[], repeaterId: string): { text: string } {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[get_repeater_detail] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);
    const repeaterIds = getRepeaterIds();
    const repeaterReqs = requests.filter((req) => repeaterIds.has(req.id));

    if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
      return {
        text: `[get_repeater_detail] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
      };
    }

    const req = repeaterReqs[repeaterIdx];

    let params: Record<string, string> = {};
    try {
      const url = new URL(req.url);
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } catch {
      params = {};
    }

    const detail = {
      params,
      headers: req.requestHeaders || {},
      body: req.requestBody || '',
    };

    return {
      text: `[get_repeater_detail] ${repeaterId}\n` + JSON.stringify(detail, null, 2),
    };
  }
}