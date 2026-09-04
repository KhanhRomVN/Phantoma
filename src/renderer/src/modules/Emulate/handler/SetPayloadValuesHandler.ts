/**
 * ------------------------------------------------------------------
 * SetPayloadValuesHandler
 * ------------------------------------------------------------------
 * Execute JS script để sinh và set payload values. Tìm payload theo
 * indexing mapping payload_<number>, cập nhật vào database.
 *
 * Các methods chính:
 * - handle()              : Execute script và cập nhật payload values
 * - extractPayloadNames() : Trích xuất tên payload variables từ request
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { emulateApi } from '../services/emulate-api.service';

// ── Types ──
import { NetworkRequest } from '../types/inspector';

// ── Utils ──
import { logger } from '@renderer/utils/logger';

// ─── Class ──────────────────────────────────────────────────────────────
export class SetPayloadValuesHandler {
  public async handle(
    requests: NetworkRequest[],
    payloadId: string,
    script: string,
    targetId?: string | null,
  ): Promise<{ text: string }> {
    // Validate payload_id format: payload_<number>
    const payloadMatch = /^payload_(\d+)$/.exec(payloadId.trim());
    if (!payloadMatch) {
      return {
        text: `[set_payload_values] Error: invalid payload id "${payloadId}". Expected format: payload_<number>`,
      };
    }

    if (!targetId) {
      return {
        text: `[set_payload_values] Error: targetId is required to access database`,
      };
    }

    const payloadIdx = parseInt(payloadMatch[1], 10);

    try {
      // Execute JS script to generate values array
      logger.info(`[SetPayloadValuesHandler] Executing script to generate values...`);
      let values: string[];
      
      try {
        // Wrap script in IIFE and execute
        const wrappedScript = `(function() { ${script} })()`;
        const result = eval(wrappedScript);
        
        // Validate result is array
        if (!Array.isArray(result)) {
          return {
            text: `[set_payload_values] Error: Script must return an array. Got: ${typeof result}`,
          };
        }
        
        // Convert all values to strings
        values = result.map(v => String(v));
        logger.info(`[SetPayloadValuesHandler] ✅ Generated ${values.length} values from script`);
      } catch (scriptErr: any) {
        logger.error(`[SetPayloadValuesHandler] ❌ Script execution failed:`, scriptErr);
        return {
          text: `[set_payload_values] Error: Script execution failed\n\nError: ${scriptErr.message || String(scriptErr)}\n\nScript:\n${script}`,
        };
      }

      // Get repeater info from first request (we need repeaterId to find the payload)
      // Since we don't have repeaterId in new format, we need to scan all requests
      const res = await emulateApi.listRequests(targetId);
      if (!res.success || !res.data || res.data.length === 0) {
        return {
          text: `[set_payload_values] Error: ${res.error || 'No repeater requests found'}`,
        };
      }

      // Scan all requests to find payloads and match by index
      let foundPayload: { requestId: string; payloadName: string } | null = null;
      let currentPayloadIndex = 0;

      for (const dbReq of res.data) {
        // Scan for payload variables in this request
        const payloadNames = this.extractPayloadNames(dbReq);
        
        for (const name of payloadNames) {
          if (currentPayloadIndex === payloadIdx) {
            foundPayload = { requestId: dbReq.id, payloadName: name };
            break;
          }
          currentPayloadIndex++;
        }
        
        if (foundPayload) break;
      }

      if (!foundPayload) {
        return {
          text: `[set_payload_values] Error: payload ${payloadId} not found (scanned ${currentPayloadIndex} payloads across all repeaters)`,
        };
      }

      // Update values in database
      await emulateApi.upsertPayload(targetId, foundPayload.requestId, {
        name: foundPayload.payloadName,
        payload_values: JSON.stringify(values),
        enabled: 1,
      });

      logger.info(`[SetPayloadValuesHandler] ✅ Updated ${payloadId} (${foundPayload.payloadName}) with ${values.length} values`);
      
      return {
        text: `[set_payload_values] Updated ${payloadId} (${foundPayload.payloadName}) — ${values.length} values`,
      };
    } catch (err: any) {
      logger.error('[SetPayloadValuesHandler] Error:', err);
      return { text: `[set_payload_values] Error: ${err.message || String(err)}` };
    }
  }

  /** Extract payload variable names from a request */
  private extractPayloadNames(dbReq: any): string[] {
    const names: string[] = [];
    const regex = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    
    const scanText = (text: string) => {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const name = match[1];
        if (!names.includes(name)) names.push(name);
      }
    };

    // Scan params
    try {
      const params = JSON.parse(dbReq.params || '[]');
      scanText(JSON.stringify(params));
    } catch { /* ignore */ }

    // Scan headers
    try {
      const headers = JSON.parse(dbReq.headers || '[]');
      scanText(JSON.stringify(headers));
    } catch { /* ignore */ }

    // Scan body
    scanText(dbReq.body || '');

    return names;
  }
}