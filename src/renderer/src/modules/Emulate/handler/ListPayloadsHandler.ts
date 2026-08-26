/**
 * ListPayloadsHandler — Liệt kê tất cả payload variable của một request trong Repeater (từ database).
 *
 * Usage:
 *   const handler = new ListPayloadsHandler();
 *   const result = await handler.handle(requests, 'repeater_1', targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';

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

/** Trích xuất tất cả payload variables từ một request DB record. */
const extractPayloadsFromDbRequest = (dbReq: any): PayloadInfo[] => {
  const payloads: PayloadInfo[] = [];

  // Params — quét từ URL
  try {
    const url = new URL(dbReq.url);
    if (url.search) {
      const names = scanPayloadVariables(url.search);
      names.forEach((name) => payloads.push({ index: payloads.length, name, location: 'param', values: [] }));
    }
  } catch {
    // URL không hợp lệ
  }

  // Headers — quét từ headers JSON
  try {
    const headers = dbReq.headers ? JSON.parse(dbReq.headers) : [];
    const headersJson = JSON.stringify(headers);
    scanPayloadVariables(headersJson).forEach((name) => {
      payloads.push({ index: payloads.length, name, location: 'header', values: [] });
    });
  } catch {
    // Parse error
  }

  // Body — quét request body
  scanPayloadVariables(dbReq.body || '').forEach((name) => {
    payloads.push({ index: payloads.length, name, location: 'body', values: [] });
  });

  return payloads;
};

export class ListPayloadsHandler {
  public async handle(requests: NetworkRequest[], repeaterId: string, targetId?: string | null): Promise<{ text: string }> {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[list_payloads] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[list_payloads] Error: targetId is required to access database`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);

    try {
      // Fetch repeater requests from DB
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[list_payloads] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[list_payloads] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const dbReq = repeaterReqs[repeaterIdx];
      const payloads = extractPayloadsFromDbRequest(dbReq);

      if (payloads.length === 0) {
        return {
          text: `[list_payloads] ${repeaterId} — Total payloads: 0\nNo payload variables found. Use update_repeater_content to add \${variable_name} placeholders.`,
        };
      }

      // Fetch payload values from DB
      const payloadsRes = await emulateApi.listPayloads(targetId, dbReq.id);
      const payloadValuesMap: Record<string, string[]> = {};
      
      if (payloadsRes.success && payloadsRes.data) {
        payloadsRes.data.forEach((p: any) => {
          try {
            payloadValuesMap[p.name] = JSON.parse(p.payload_values || '[]');
          } catch {
            payloadValuesMap[p.name] = [];
          }
        });
      }

      const lines: string[] = [];
      lines.push(`[list_payloads] ${repeaterId} — Total payloads: ${payloads.length}`);

      payloads.forEach((p) => {
        const values = payloadValuesMap[p.name] || [];
        const preview =
          values.length > 0
            ? values.slice(0, 10).join(', ') + (values.length > 10 ? ` ... (${values.length} values)` : ` (${values.length} values)`)
            : '(no values yet)';
        lines.push(`- payload_${p.index} | ${p.name} | ${p.location} | ${preview}`);
      });

      return { text: lines.join('\n') };
    } catch (err: any) {
      logger.error('[ListPayloadsHandler] Error:', err);
      return { text: `[list_payloads] Error: ${err.message || String(err)}` };
    }
  }
}