/**
 * ListPayloadsHandler — Liệt kê tất cả payload variable của một request trong Repeater.
 *
 * Usage:
 *   const handler = new ListPayloadsHandler();
 *   const result = handler.handle(requests, 'repeater_1');
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { getRepeaterIds, loadPayloadValues } from '../components/WorkspacePanel/Repeater';

export interface PayloadInfo {
  index: number;
  name: string;
  location: 'param' | 'header' | 'body';
  values: string[];
}

/** Quét regex ${name} trong một chuỗi, trả về danh sách tên biến (unique, theo thứ tự xuất hiện). */
const scanPayloadVariables = (text: string): string[] => {
  const names: string[] = [];
  const regex = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
};

/** Trích xuất tất cả payload variables từ một request. */
const extractPayloads = (req: NetworkRequest): PayloadInfo[] => {
  const payloads: PayloadInfo[] = [];

  // Params — quét query string của URL
  try {
    const url = new URL(req.url);
    if (url.search) {
      const names = scanPayloadVariables(url.search);
      names.forEach((name) => payloads.push({ index: payloads.length, name, location: 'param', values: [] }));
    }
  } catch {
    // URL không hợp lệ — bỏ qua params
  }

  // Headers — quét JSON string của headers
  const headersJson = JSON.stringify(req.requestHeaders || {});
  scanPayloadVariables(headersJson).forEach((name) => {
    payloads.push({ index: payloads.length, name, location: 'header', values: [] });
  });

  // Body — quét request body
  scanPayloadVariables(req.requestBody || '').forEach((name) => {
    payloads.push({ index: payloads.length, name, location: 'body', values: [] });
  });

  return payloads;
};

export class ListPayloadsHandler {
  public handle(requests: NetworkRequest[], repeaterId: string): { text: string } {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[list_payloads] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);
    const repeaterIds = getRepeaterIds();
    const repeaterReqs = requests.filter((req) => repeaterIds.has(req.id));

    if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
      return {
        text: `[list_payloads] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
      };
    }

    const req = repeaterReqs[repeaterIdx];
    const payloads = extractPayloads(req);

    if (payloads.length === 0) {
      return {
        text: `[list_payloads] ${repeaterId} — Total payloads: 0\nNo payload variables found. Use update_repeater_content to add \${variable_name} placeholders.`,
      };
    }

    // Lấy values từ localStorage
    const allValues = loadPayloadValues();
    const requestValues = allValues[req.id] || {};

    const lines: string[] = [];
    lines.push(`[list_payloads] ${repeaterId} — Total payloads: ${payloads.length}`);

    payloads.forEach((p) => {
      const values = requestValues[p.name] || [];
      const preview =
        values.length > 0
          ? values.slice(0, 10).join(', ') + (values.length > 10 ? ` ... (${values.length} values)` : ` (${values.length} values)`)
          : '(no values yet)';
      lines.push(`- payload_${p.index} | ${p.name} | ${p.location} | ${preview}`);
    });

    return { text: lines.join('\n') };
  }
}