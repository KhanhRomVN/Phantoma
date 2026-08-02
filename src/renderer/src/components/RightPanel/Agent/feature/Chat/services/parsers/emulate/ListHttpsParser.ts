import { extractParamValue } from '../../../utils/ToolParser';
import { ListHttpsParams } from '../../../types/tool-types';

/**
 * Parse list_https tag from AI response.
 * Format:
 *   <list_https>
 *     <limit>50</limit>
 *     <method>GET</method>
 *     <host>api.example.com</host>
 *     <path>/users</path>
 *     <status>200</status>
 *     <type>xhr</type>
 *   </list_https>
 */
export function parseListHttps(innerContent: string): ListHttpsParams {
  const params: ListHttpsParams = {};

  // Extract limit
  const limitParam = extractParamValue(innerContent, 'limit');
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed)) params.limit = parsed;
  }

  const filter: ListHttpsParams['filter'] = {};

  const method = extractParamValue(innerContent, 'method');
  if (method) filter.method = method;

  const host = extractParamValue(innerContent, 'host');
  if (host) filter.host = host;

  const path = extractParamValue(innerContent, 'path');
  if (path) filter.path = path;

  const status = extractParamValue(innerContent, 'status');
  if (status) {
    const parsed = parseInt(status, 10);
    if (!isNaN(parsed)) filter.status = parsed;
  }

  const type = extractParamValue(innerContent, 'type');
  if (type) filter.type = type;

  if (Object.keys(filter).length > 0) {
    params.filter = filter;
  }

  return params;
}