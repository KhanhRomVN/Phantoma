import { extractParamValue } from '../../../utils/ToolParser';
import { ListSourcesParams } from '../../../types/tool-types';

/**
 * Parse list_sources tag from AI response.
 * Format:
 *   <list_sources>
 *     <host>cdn.example.com</host>
 *     <type>js</type>
 *   </list_sources>
 */
export function parseListSources(innerContent: string): ListSourcesParams {
  const params: ListSourcesParams = {};

  const filter: ListSourcesParams['filter'] = {};

  const host = extractParamValue(innerContent, 'host');
  if (host) filter.host = host;

  const type = extractParamValue(innerContent, 'type');
  if (type) filter.type = type;

  if (Object.keys(filter).length > 0) {
    params.filter = filter;
  }

  return params;
}