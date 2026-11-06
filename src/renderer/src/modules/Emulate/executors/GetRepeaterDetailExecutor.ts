import type { GetRepeaterDetailParams } from '../parsers/GetRepeaterDetailParser';
import { emulateApi } from '../services/emulate-api.service';
import { resolveRepeater } from '../utils/repeater-resolver.util';
import { runTool } from '../utils/tool-result.util';

const scanPayloadVariables = (text: string): string[] => {
  const names: string[] = [];
  const regex = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
};

const scanJsonArray = (raw: string): string[] => {
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items)
      ? items.flatMap((item) => scanPayloadVariables(JSON.stringify(item)))
      : [];
  } catch {
    return [];
  }
};

/** Execute get_repeater_detail tool — gọi emulateApi trực tiếp */
export async function executeGetRepeaterDetail(
  params: GetRepeaterDetailParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool('get_repeater_detail', async () => {
    if (!params.repeater_id) throw new Error('repeater_id is required');

    const resolved = await resolveRepeater(
      'get_repeater_detail',
      params.repeater_id,
      contextTargetId,
    );
    if (resolved.error !== undefined) return resolved.error;

    const { req, targetId } = resolved;
    const paramsRaw = req.params || '[]';
    const headersRaw = req.headers || '[]';
    const bodyRaw = req.body || '';

    const payloadNames = [
      ...new Set([
        ...scanJsonArray(paramsRaw),
        ...scanJsonArray(headersRaw),
        ...scanPayloadVariables(bodyRaw),
      ]),
    ];

    let payloadsText = '\n\n**Payloads:**\n';
    if (payloadNames.length === 0) {
      payloadsText += 'No payload variables found.';
    } else {
      const payloadsRes = await emulateApi.listPayloads(targetId, req.id);
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
        const preview =
          values.length > 0
            ? values.slice(0, 5).join(', ') +
              (values.length > 5 ? ` ... (${values.length} total)` : ` (${values.length} total)`)
            : '(no values)';
        payloadsText += `\n- payload_${idx} | ${name} | ${preview}`;
      });
    }

    return (
      `[get_repeater_detail] ${params.repeater_id} ${req.method || 'GET'} ${req.url || ''}` +
      '\n\n**Params:**\n```json\n' +
      paramsRaw +
      '\n```' +
      '\n\n**Headers:**\n```json\n' +
      headersRaw +
      '\n```' +
      '\n\n**Body:**\n```json\n' +
      bodyRaw +
      '\n```' +
      payloadsText
    );
  });
}