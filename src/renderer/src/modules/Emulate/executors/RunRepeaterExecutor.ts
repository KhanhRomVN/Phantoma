import { emulateApi } from '../services/emulate-api.service';
import { resolveRepeater } from '../utils/repeater-resolver.util';
import { runTool } from '../utils/tool-result.util';

export interface RunRepeaterParams {
  repeater_id: string;
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
const MAX_RUNS = 100;
const MAX_BODY_PREVIEW = 5000;

const parseJsonArray = (raw: string | undefined, label: string): any[] => {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch (err) {
    console.warn(`[RunRepeaterExecutor] Failed to parse ${label}:`, raw, err);
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

/** Execute run_repeater tool — gọi emulateApi + fetch trực tiếp */
export async function executeRunRepeater(
  params: RunRepeaterParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('run_repeater', async () => {
    if (!params.repeater_id) throw new Error('repeater_id is required');

    const resolved = await resolveRepeater('run_repeater', params.repeater_id, contextTargetId);
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
      console.warn('[RunRepeaterExecutor] Failed to load payloads:', err);
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
        console.error('[RunRepeaterExecutor] Fetch failed:', err);
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

    const storageKey = `repeater_history_${targetId}_${reqData.id}`;
    let history: HistoryEntry[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) history = JSON.parse(stored);
    } catch (err) {
      console.warn('[RunRepeaterExecutor] Failed to load history:', err);
    }

    results.forEach((r) => {
      history.unshift({
        id: crypto.randomUUID(),
        method: reqData.method,
        url: reqData.url,
        status: r.status,
        timestamp: Date.now(),
        duration: r.duration,
        payload: formatCombo(r.payloadCombo),
        requestHeaders: headersObj,
        requestBody: reqData.method !== 'GET' ? reqData.body : undefined,
        responseHeaders: r.headers,
        responseBody: r.body,
      });
    });
    history = history.slice(0, MAX_HISTORY_ENTRIES);

    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (err) {
      console.error('[RunRepeaterExecutor] Failed to save history:', err);
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
        `[run_repeater] ${reqData.method} ${reqData.url}${payloadText}`,
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

    let summary = `[run_repeater] ${reqData.method} ${reqData.url}\n\n`;
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