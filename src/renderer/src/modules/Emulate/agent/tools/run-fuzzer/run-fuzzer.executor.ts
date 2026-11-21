import { emulateApi } from '@renderer/modules/Emulate/shared/api/emulate.api';
import { resolveFuzzer } from '@renderer/modules/Emulate/shared/utils/fuzzer-resolver.util';
import { runTool } from '@renderer/modules/Emulate/shared/utils/tool-result.util';
import { logger } from '@renderer/modules/Emulate/shared/utils/logger.util';

export interface RunFuzzerParams {
  fuzzer_id: string;
  iterations?: number;
}

interface PayloadSet {
  name: string;
  values: string[];
}

interface RunResult {
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: string;
  payloadCombo: Record<string, string>;
}

const MAX_RUNS = 100;
const MAX_BODY_PREVIEW = 5000;

const parseJsonArray = (raw: string | undefined, label: string): any[] => {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch (err) {
    logger.warn(`[RunFuzzerExecutor] Failed to parse ${label}:`, raw, err);
    return [];
  }
};

const toRecord = (items: any[]): Record<string, string> =>
  Object.fromEntries(
    items.filter((i) => i.enabled !== false && i.key).map((i) => [i.key, i.value]),
  );

const applyVars = (text: string, combo: Record<string, string>): string =>
  Object.entries(combo).reduce((acc, [k, v]) => acc.split('${' + k + '}').join(v), text);

const mapVars = (rec: Record<string, string>, combo: Record<string, string>) =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, applyVars(v, combo)]));

const buildCombinations = (payloads: PayloadSet[]): Array<Record<string, string>> =>
  payloads.reduce<Array<Record<string, string>>>(
    (acc, p) => acc.flatMap((combo) => p.values.map((val) => ({ ...combo, [p.name]: val }))),
    [{}],
  );

const formatCombo = (combo: Record<string, string>): string =>
  Object.entries(combo)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

/** Execute run_fuzzer tool — gọi emulateApi + fetch trực tiếp */
export async function executeRunFuzzer(
  params: RunFuzzerParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('run_fuzzer', async () => {
    if (!params.fuzzer_id) throw new Error('fuzzer_id is required');

    const resolved = await resolveFuzzer('run_fuzzer', params.fuzzer_id, contextTargetId);
    if (resolved.error !== undefined) return resolved.error;

    const { req: reqData, targetId } = resolved;

    let payloads: PayloadSet[] = [];
    try {
      const payloadRes = await emulateApi.listPayloads(targetId, reqData.id);
      if (payloadRes.success && payloadRes.data) {
        payloads = payloadRes.data
          .filter((p) => Boolean(p.enabled))
          .map((p) => {
            let values: string[] = [];
            try {
              values = p.payload_values ? JSON.parse(p.payload_values) : [];
              if (!Array.isArray(values)) values = [];
            } catch {
              values = [];
            }
            return { name: p.name, values };
          })
          .filter((p) => p.values.length > 0);
      }
    } catch (err) {
      logger.warn('[RunFuzzerExecutor] Failed to load payloads:', err);
    }

    const headersObj = toRecord(parseJsonArray(reqData.headers, 'headers'));
    const paramsObj = toRecord(parseJsonArray(reqData.params, 'params'));
    const combinations = buildCombinations(payloads).slice(0, MAX_RUNS);

    const results: RunResult[] = [];
    for (const combo of combinations) {
      const finalHeaders = mapVars(headersObj, combo);
      const finalParams = mapVars(paramsObj, combo);
      const finalBody = applyVars(reqData.body || '', combo);

      let finalUrl = reqData.url;
      if (Object.keys(finalParams).length > 0) {
        const queryString = Object.entries(finalParams)
          .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
          .join('&');
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
      }

      const startTime = Date.now();
      let status = 0;
      let headers: Record<string, string> = {};
      let body = '';
      try {
        const response = await fetch(finalUrl, {
          method: reqData.method,
          headers: finalHeaders,
          body: reqData.method !== 'GET' && finalBody ? finalBody : undefined,
        });
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        body = await response.text();
        status = response.status;
      } catch (err) {
        logger.error('[RunFuzzerExecutor] Fetch failed:', err);
        headers = {};
        body = String(err);
      }

      results.push({
        status,
        duration: Date.now() - startTime,
        headers,
        body,
        payloadCombo: combo,
      });
    }

    try {
      const endTime = Math.floor(Date.now() / 1000);
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const statuses: Record<string, number> = {};
      results.forEach((r, idx) => {
        statuses[String(idx)] = r.status;
      });
      const saveRes = await emulateApi.saveHistory(targetId, reqData.id, {
        history: {
          method: reqData.method,
          url: reqData.url,
          status: results[results.length - 1]?.status,
          statuses: JSON.stringify(statuses),
          timestamp: endTime,
          end_time: endTime,
          duration: totalDuration,
          payload_count: results.length,
          payload_summary: results.map((r) => formatCombo(r.payloadCombo)).join(' | '),
          request_headers: JSON.stringify(headersObj),
          request_body: reqData.method !== 'GET' ? reqData.body : '',
        },
        runs: results.map((r) => ({
          payload_name: Object.keys(r.payloadCombo).join(', '),
          payload_value: Object.values(r.payloadCombo).join(', '),
          status: r.status,
          duration: r.duration,
          method: reqData.method,
          url: reqData.url,
          params: JSON.stringify(paramsObj),
          request_headers: JSON.stringify(headersObj),
          request_body: reqData.method !== 'GET' ? reqData.body : '',
          response_headers: JSON.stringify(r.headers),
          response_body: r.body,
        })),
      });
      if (!saveRes.success) {
        logger.error('[RunFuzzerExecutor] Failed to save history:', saveRes.error);
      } else {
        window.dispatchEvent(new CustomEvent('fuzzer-updated'));
      }
    } catch (err) {
      logger.error('[RunFuzzerExecutor] Failed to save history:', err);
    }

    if (results.length === 1) {
      const r = results[0];
      const payloadText =
        Object.keys(r.payloadCombo).length > 0 ? `\nPayload: ${formatCombo(r.payloadCombo)}` : '';
      const headersText = Object.entries(r.headers)
        .map(([key, value]) => `  "${key}": "${value}"`)
        .join(',\n');
      const bodyText =
        r.body.length > MAX_BODY_PREVIEW
          ? r.body.substring(0, MAX_BODY_PREVIEW) + '\n... (truncated)'
          : r.body;

      return [
        `[run_fuzzer] ${reqData.method} ${reqData.url}${payloadText}`,
        '',
        `Status: ${r.status}`,
        `Duration: ${r.duration}ms`,
        '',
        '--- Response Headers ---',
        '{',
        headersText,
        '}',
        '',
        '--- Response Body ---',
        bodyText,
      ].join('\n');
    }

    const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
    const successCount = results.filter((r) => r.status >= 200 && r.status < 300).length;

    let summary = `[run_fuzzer] ${reqData.method} ${reqData.url}\n\n`;
    summary += `Total Runs: ${results.length}\n`;
    summary += `Success: ${successCount}/${results.length}\n`;
    summary += `Avg Duration: ${avgDuration}ms\n\n`;
    summary += `--- Results ---\n`;
    results.forEach((r, idx) => {
      const mark = r.status >= 200 && r.status < 300 ? '✓' : '✗';
      const payloadText =
        Object.keys(r.payloadCombo).length > 0 ? ` | Payload: ${formatCombo(r.payloadCombo)}` : '';
      summary += `${idx + 1}. ${mark} Status: ${r.status} | Duration: ${r.duration}ms${payloadText}\n`;
    });

    return summary;
  });
}