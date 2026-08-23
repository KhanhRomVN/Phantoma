/**
 * ListRepeatersHandler — Liệt kê các request hiện đang lưu trong Repeater.
 *
 * Usage:
 *   const handler = new ListRepeatersHandler();
 *   const result = handler.handle(requests);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { getRepeaterIds } from '../components/WorkspacePanel/Repeater';

export class ListRepeatersHandler {
  public handle(requests: NetworkRequest[]): { text: string } {
    const repeaterIds = getRepeaterIds();
    const repeaterReqs = requests.filter((req) => repeaterIds.has(req.id));

    const lines = repeaterReqs.map((req, i) => {
      const host = req.host || '';
      const path = req.path || '';
      return `- repeater_${i} | ${req.method} | ${host} | ${path}`;
    });

    return {
      text: `[list_repeaters] Total: ${repeaterReqs.length}\n` + lines.join('\n'),
    };
  }
}