/**
 * ------------------------------------------------------------------
 * GetRepeaterDetailHandler
 * ------------------------------------------------------------------
 * Trả về params, headers, body và payloads của một request trong
 * Repeater (từ database). Output chính xác nội dung gốc không format.
 *
 * Các methods chính:
 * - handle() : Lấy chi tiết repeater request theo indexing mapping
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ── Types ──
import { NetworkRequest } from '../types/inspector';

// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
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

// ─── Class ──────────────────────────────────────────────────────────────
export class GetRepeaterDetailHandler {
  public async handle(requests: NetworkRequest[], repeaterId: string, targetId?: string | null): Promise<{ text: string }> {
    const match = /^repeater_(\d+)$/.exec(repeaterId.trim());
    if (!match) {
      return {
        text: `[get_repeater_detail] Error: invalid repeater id "${repeaterId}". Expected format: repeater_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[get_repeater_detail] Error: targetId is required to access database`,
      };
    }

    const repeaterIdx = parseInt(match[1], 10);

    try {
      // Fetch repeater requests from DB
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data) {
        return {
          text: `[get_repeater_detail] Error: ${res.error || 'Failed to fetch from database'}`,
        };
      }

      const repeaterReqs = res.data;
      if (repeaterIdx < 0 || repeaterIdx >= repeaterReqs.length) {
        return {
          text: `[get_repeater_detail] Error: repeater ${repeaterId} out of range (0-${repeaterReqs.length - 1})`,
        };
      }

      const req = repeaterReqs[repeaterIdx];

      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.id: ${req.id}`);
      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.params: ${JSON.stringify(req.params)}`);
      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.headers length: ${req.headers?.length || 0}`);
      logger.info(`[GetRepeaterDetailHandler] DEBUG - req.body length: ${req.body?.length || 0}`);

      // Get raw content from database - NO auto-formatting, show exact file content
      const paramsRaw = req.params || '[]';
      const headersRaw = req.headers || '[]';
      const bodyRaw = req.body || '';

      // Build output with EXACT content (no formatting)
      const method = req.method || 'GET';
      const url = req.url || '';
      const firstLine = `[get_repeater_detail] ${repeaterId} ${method} ${url}`;

      // Output EXACT content without formatting
      const paramsText = paramsRaw 
        ? '\n\n**Params:**\n```json\n' + paramsRaw + '\n```'
        : '\n\n**Params:**\n```json\n```';
        
      const headersText = headersRaw 
        ? '\n\n**Headers:**\n```json\n' + headersRaw + '\n```'
        : '\n\n**Headers:**\n```json\n```';
        
      const bodyText = bodyRaw 
        ? '\n\n**Body:**\n```json\n' + bodyRaw + '\n```'
        : '\n\n**Body:**\n```json\n```';

      // Extract and list payloads
      const payloadNames: string[] = [];
      
      // Scan params
      try {
        const params = JSON.parse(paramsRaw);
        if (Array.isArray(params)) {
          params.forEach((p: any) => {
            const names = scanPayloadVariables(JSON.stringify(p));
            names.forEach(n => { if (!payloadNames.includes(n)) payloadNames.push(n); });
          });
        }
      } catch { /* ignore */ }
      
      // Scan headers
      try {
        const headers = JSON.parse(headersRaw);
        if (Array.isArray(headers)) {
          headers.forEach((h: any) => {
            const names = scanPayloadVariables(JSON.stringify(h));
            names.forEach(n => { if (!payloadNames.includes(n)) payloadNames.push(n); });
          });
        }
      } catch { /* ignore */ }
      
      // Scan body
      const bodyNames = scanPayloadVariables(bodyRaw);
      bodyNames.forEach(n => { if (!payloadNames.includes(n)) payloadNames.push(n); });

      // Fetch payload values from DB
      let payloadsText = '\n\n**Payloads:**\n';
      
      if (payloadNames.length === 0) {
        payloadsText += 'No payload variables found.';
      } else {
        const payloadsRes = await emulateApi.listPayloads(targetId!, req.id);
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

        payloadNames.forEach((name, idx) => {
          const values = payloadValuesMap[name] || [];
          const preview = values.length > 0
            ? values.slice(0, 5).join(', ') + (values.length > 5 ? ` ... (${values.length} total)` : ` (${values.length} total)`)
            : '(no values)';
          payloadsText += `\n- payload_${idx} | ${name} | ${preview}`;
        });
      }

      return {
        text: firstLine + paramsText + headersText + bodyText + payloadsText,
      };
    } catch (err: any) {
      logger.error('[GetRepeaterDetailHandler] Error:', err);
      return { text: `[get_repeater_detail] Error: ${err.message || String(err)}` };
    }
  }
}