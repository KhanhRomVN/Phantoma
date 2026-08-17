/**
 * GetHttpsDetailHandler — Trả về chi tiết request/response của một HTTPS request.
 *
 * Usage:
 *   const handler = new GetHttpsDetailHandler();
 *   const result = handler.handle(requests, 3);
 */

// TYPE
import { NetworkRequest } from '../types/inspector';

export interface GetHttpsDetailResult {
  text: string;
  found: boolean;
}

export class GetHttpsDetailHandler {
  /**
   * Get HTTPS request detail by stable index (1-indexed).
   * @param requests - All requests array
   * @param stableIndex - 1-indexed position from list_https output
   */
  public handle(requests: NetworkRequest[], stableIndex: number): GetHttpsDetailResult {
    // Convert 1-indexed stable index to 0-indexed array position
    const arrayIndex = stableIndex - 1;

    if (arrayIndex < 0 || arrayIndex >= requests.length) {
      return {
        text: `[get_https_detail] Error: index ${stableIndex} out of range (1-${requests.length})`,
        found: false,
      };
    }

    const req = requests[arrayIndex];
    const method = req.method || 'UNKNOWN';
    const url = req.url || 'N/A';
    const status = req.status ? String(req.status) : 'N/A';

    // Format request headers
    let reqHeaders = 'N/A';
    if (req.requestHeaders) {
      try {
        reqHeaders = JSON.stringify(req.requestHeaders, null, 2);
      } catch {
        reqHeaders = String(req.requestHeaders);
      }
    }

    // Format request body
    let reqBody = '(empty)';
    if (req.requestBody) {
      try {
        reqBody =
          typeof req.requestBody === 'string'
            ? req.requestBody
            : JSON.stringify(req.requestBody, null, 2);
      } catch {
        reqBody = String(req.requestBody);
      }
    }

    // Format response headers
    let resHeaders = 'N/A';
    if (req.responseHeaders) {
      try {
        resHeaders = JSON.stringify(req.responseHeaders, null, 2);
      } catch {
        resHeaders = String(req.responseHeaders);
      }
    }

    // Format response body
    let resBody = '(empty)';
    if (req.responseBody) {
      try {
        resBody =
          typeof req.responseBody === 'string'
            ? req.responseBody
            : JSON.stringify(req.responseBody, null, 2);
      } catch {
        resBody = String(req.responseBody);
      }
      // Giới hạn độ dài
      const maxLen = 50000;
      if (resBody.length > maxLen) {
        resBody = resBody.substring(0, maxLen) + '\n... (truncated)';
      }
    }

    const text = [
      `[get_https_detail] Request #${stableIndex}`,
      `--- Request ---`,
      `Method:  ${method}`,
      `URL:     ${url}`,
      `Headers: ${reqHeaders}`,
      ``,
      `Body:    ${reqBody}`,
      ``,
      `--- Response ---`,
      `Status:  ${status}`,
      `Headers: ${resHeaders}`,
      ``,
      `Body:    ${resBody}`,
    ].join('\n');

    return {
      text,
      found: true,
    };
  }
}
