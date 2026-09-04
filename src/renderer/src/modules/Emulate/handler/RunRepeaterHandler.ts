/**
 * RunRepeaterHandler — Chạy repeater giống như click button "Send" trong UI.
 *
 * Workflow:
 * 1. Lấy request từ DB theo repeater_id
 * 2. Build request với params/headers/body
 * 3. Kiểm tra payload:
 *    - Nếu KHÔNG có payload enabled → chạy 1 lần đơn giản
 *    - Nếu CÓ payload enabled → chạy với cartesian combinations
 * 4. Tự động lưu mỗi run vào history (max 30 entries per repeater)
 * 5. Trả về:
 *    - 1 phiên: Chi tiết response body và headers
 *    - Nhiều phiên: Danh sách tóm tắt
 *
 * Usage:
 *   const handler = new RunRepeaterHandler();
 *   const result = await handler.handle(requests, 'repeater_0', targetId);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { emulateApi } from '../services/emulate-api.service';
import { logger } from '@renderer/utils/logger';
import { ipcService } from '../../../services/ipc.service';

interface SendRequestResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: number;
  duration: number;
  payload: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
}

const MAX_HISTORY_ENTRIES = 30;

export class RunRepeaterHandler {
  public async handle(
    _requests: NetworkRequest[],
    repeaterId: string,
    targetId?: string | null,
  ): Promise<{ text: string }> {
    if (!targetId) {
      return {
        text: `[run_repeater] Error: targetId is required`,
      };
    }

    if (!repeaterId) {
      return {
        text: `[run_repeater] Error: repeater_id is required`,
      };
    }

    try {
      // Parse repeater_0 -> index 0
      const match = /^repeater_(\d+)$/i.exec(repeaterId.trim());
      if (!match) {
        return {
          text: `[run_repeater] Error: Invalid repeater_id format. Expected: repeater_<number>`,
        };
      }

      const index = parseInt(match[1], 10);

      // Lấy danh sách requests từ DB
      const listRes = await emulateApi.listRequests(targetId);
      if (!listRes.success || !listRes.data) {
        return {
          text: `[run_repeater] Error: Failed to fetch repeater requests from database`,
        };
      }

      const dbRequests = listRes.data;
      if (index < 0 || index >= dbRequests.length) {
        return {
          text: `[run_repeater] Error: repeater_${index} not found. Available: repeater_0 to repeater_${dbRequests.length - 1}`,
        };
      }

      const reqData = dbRequests[index];

      // Parse payloads từ JSON
      let payloads: Array<{ name: string; enabled: boolean; values: string[] }> = [];
      try {
        payloads = reqData.payloads ? JSON.parse(reqData.payloads) : [];
      } catch (err) {
        logger.warn('[RunRepeaterHandler] Failed to parse payloads:', reqData.payloads, err);
      }

      // Filter enabled payloads with values
      const enabledPayloads = payloads.filter(p => p.enabled && p.values && p.values.length > 0);

      // Parse params từ JSON
      let params: any[] = [];
      try {
        params = reqData.params ? JSON.parse(reqData.params) : [];
      } catch (err) {
        logger.warn('[RunRepeaterHandler] Failed to parse params:', reqData.params, err);
      }

      // Parse headers từ JSON
      let headers: any[] = [];
      try {
        headers = reqData.headers ? JSON.parse(reqData.headers) : [];
      } catch (err) {
        logger.warn('[RunRepeaterHandler] Failed to parse headers:', reqData.headers, err);
      }

      // Build request
      const headersObj: Record<string, string> = {};
      if (Array.isArray(headers)) {
        headers
          .filter((h: any) => h.enabled !== false && h.key)
          .forEach((h: any) => {
            headersObj[h.key] = h.value;
          });
      }

      const paramsObj: Record<string, string> = {};
      if (Array.isArray(params)) {
        params
          .filter((p: any) => p.enabled !== false && p.key)
          .forEach((p: any) => {
            paramsObj[p.key] = p.value;
          });
      }

      // Generate cartesian combinations from enabled payloads
      const generateCombinations = (): Array<Record<string, string>> => {
        if (enabledPayloads.length === 0) {
          return [{}]; // No payload -> single run
        }

        // Cartesian product
        let result: Array<Record<string, string>> = [{}];
        enabledPayloads.forEach(payload => {
          const newResult: Array<Record<string, string>> = [];
          result.forEach(combination => {
            payload.values.forEach(val => {
              newResult.push({ ...combination, [payload.name]: val });
            });
          });
          result = newResult;
        });
        return result;
      };

      const combinations = generateCombinations();
      const totalRuns = combinations.length;

      // Validate iterations
      const validIterations = Math.max(1, Math.min(totalRuns, 100)); // Max 100 để tránh spam

      // Execute requests với payload combinations
      const results: Array<{
        status: number;
        duration: number;
        headers: Record<string, string>;
        body: string;
        payloadCombo: Record<string, string>;
      }> = [];

      for (let i = 0; i < validIterations; i++) {
        const combo = combinations[i];
        
        // Replace payload variables trong params, headers, body
        const replacePayloadVars = (str: string): string => {
          if (!str) return str;
          let result = str;
          Object.entries(combo).forEach(([key, value]) => {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
          });
          return result;
        };

        // Apply payload replacements
        const finalHeaders: Record<string, string> = {};
        Object.entries(headersObj).forEach(([key, value]) => {
          finalHeaders[key] = replacePayloadVars(value);
        });

        const finalParams: Record<string, string> = {};
        Object.entries(paramsObj).forEach(([key, value]) => {
          finalParams[key] = replacePayloadVars(value);
        });

        const finalBody = replacePayloadVars(reqData.body || '');

        // Build URL với params
        let finalUrl = reqData.url;
        if (Object.keys(finalParams).length > 0) {
          const queryString = Object.entries(finalParams)
            .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
            .join('&');
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
        }

        const startTime = Date.now();
        const result = await ipcService.sendRequest({
          url: finalUrl,
          method: reqData.method,
          headers: finalHeaders,
          body: reqData.method !== 'GET' && finalBody ? finalBody : undefined,
        });

        const sendResult: SendRequestResult = result.success
          ? (result.data as SendRequestResult)
          : { status: 0, headers: {}, body: '' };

        const duration = Date.now() - startTime;

        results.push({
          status: sendResult.status || 0,
          duration,
          headers: sendResult.headers,
          body: sendResult.body,
          payloadCombo: combo,
        });
      }

      // Storage key cho history
      const storageKey = `repeater_history_${targetId}_${reqData.id}`;

      // Load existing history
      let history: HistoryEntry[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          history = JSON.parse(stored);
        }
      } catch (err) {
        logger.warn('[RunRepeaterHandler] Failed to load history:', err);
      }

      // Lưu vào history (mỗi run)
      results.forEach(r => {
        const payloadText = Object.entries(r.payloadCombo).length > 0
          ? Object.entries(r.payloadCombo).map(([k, v]) => `${k}=${v}`).join(', ')
          : '';

        const historyEntry: HistoryEntry = {
          id: crypto.randomUUID(),
          method: reqData.method,
          url: reqData.url, // URL gốc, không có params
          status: r.status,
          timestamp: Date.now(),
          duration: r.duration,
          payload: payloadText,
          requestHeaders: headersObj,
          requestBody: reqData.method !== 'GET' ? reqData.body : undefined,
          responseHeaders: r.headers,
          responseBody: r.body,
        };

        history.unshift(historyEntry);
      });

      // Limit history to MAX_HISTORY_ENTRIES (FIFO queue)
      if (history.length > MAX_HISTORY_ENTRIES) {
        history = history.slice(0, MAX_HISTORY_ENTRIES);
      }

      // Save back to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(history));
      } catch (err) {
        logger.error('[RunRepeaterHandler] Failed to save history:', err);
      }

      // Format response theo số lần chạy
      if (validIterations === 1) {
        // Single run: Hiển thị chi tiết
        const sendResult = results[0];
        const payloadText = Object.entries(sendResult.payloadCombo).length > 0
          ? `\nPayload: ${Object.entries(sendResult.payloadCombo).map(([k, v]) => `${k}=${v}`).join(', ')}`
          : '';

        const responseHeadersText = Object.entries(sendResult.headers)
          .map(([key, value]) => `  "${key}": "${value}"`)
          .join(',\n');

        let responseBodyText = sendResult.body;
        if (responseBodyText.length > 5000) {
          responseBodyText = responseBodyText.substring(0, 5000) + '\n... (truncated)';
        }

        return {
          text: `[run_repeater] ${reqData.method} ${reqData.url}${payloadText}

Status: ${sendResult.status}
Duration: ${sendResult.duration}ms

--- Response Headers ---
{
${responseHeadersText}
}

--- Response Body ---
${responseBodyText}`,
        };
      } else {
        // Multiple runs: Hiển thị danh sách
        const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
        const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;

        let summary = `[run_repeater] ${reqData.method} ${reqData.url}\n\n`;
        summary += `Total Runs: ${validIterations}\n`;
        summary += `Success: ${successCount}/${validIterations}\n`;
        summary += `Avg Duration: ${avgDuration}ms\n\n`;
        summary += `--- Results ---\n`;

        results.forEach((r, idx) => {
          const statusEmoji = r.status >= 200 && r.status < 300 ? '✓' : '✗';
          const payloadText = Object.entries(r.payloadCombo).length > 0
            ? ` | Payload: ${Object.entries(r.payloadCombo).map(([k, v]) => `${k}=${v}`).join(', ')}`
            : '';
          summary += `${idx + 1}. ${statusEmoji} Status: ${r.status} | Duration: ${r.duration}ms${payloadText}\n`;
        });

        return { text: summary };
      }
    } catch (err: any) {
      logger.error('[RunRepeaterHandler] Error:', err);
      return {
        text: `[run_repeater] Error: ${err.message || String(err)}`,
      };
    }
  }
}
