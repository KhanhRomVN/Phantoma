import { useNetworkStore } from '../stores/networkStore';
import { runTool } from '../utils/tool-result.util';

export interface GetHttpsDetailParams {
  index: number;
}

const MAX_BODY_LENGTH = 50000;

const stringify = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/** Execute get_https_detail tool — đọc trực tiếp network store */
export async function executeGetHttpsDetail(params: GetHttpsDetailParams): Promise<string | null> {
  return runTool('get_https_detail', () => {
    if (params.index === undefined) throw new Error('index is required');

    const requests = useNetworkStore.getState().requests;
    const arrayIndex = params.index - 1;

    if (arrayIndex < 0 || arrayIndex >= requests.length) {
      return `[get_https_detail] Error: index ${params.index} out of range (1-${requests.length})`;
    }

    const req = requests[arrayIndex];
    const reqHeaders = req.requestHeaders ? stringify(req.requestHeaders) : 'N/A';
    const reqBody = req.requestBody ? stringify(req.requestBody) : '(empty)';
    const resHeaders = req.responseHeaders ? stringify(req.responseHeaders) : 'N/A';

    let resBody = '(empty)';
    if (req.responseBody) {
      resBody = stringify(req.responseBody);
      if (resBody.length > MAX_BODY_LENGTH) {
        resBody = resBody.substring(0, MAX_BODY_LENGTH) + '\n... (truncated)';
      }
    }

    return [
      `[get_https_detail] Request #${params.index}`,
      `--- Request ---`,
      `Method:  ${req.method || 'UNKNOWN'}`,
      `URL:     ${req.url || 'N/A'}`,
      `Headers: ${reqHeaders}`,
      ``,
      `Body:    ${reqBody}`,
      ``,
      `--- Response ---`,
      `Status:  ${req.status ? String(req.status) : 'N/A'}`,
      `Headers: ${resHeaders}`,
      ``,
      `Body:    ${resBody}`,
    ].join('\n');
  });
}