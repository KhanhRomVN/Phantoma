import { extractParamValue } from '../../../utils/ToolParser';
import { ListSourcesParams } from '../../../types/tool-types';

/**
 * Parse list_sources tag from AI response.
 * Format:
 *   <list_sources>
 *     <filter>
 *       <host>cdn.example.com</host>
 *       <type>js</type>
 *     </filter>
 *   </list_sources>
 */
export function parseListSources(innerContent: string): ListSourcesParams {
  const params: ListSourcesParams = {};

  // Extract filter block
  const filterContent = extractParamValue(innerContent, 'filter');
  if (filterContent) {
    const filter: ListSourcesParams['filter'] = {};

    const host = extractParamValue(filterContent, 'host');
    if (host) filter.host = host;

    const type = extractParamValue(filterContent, 'type');
    if (type) filter.type = type;

    if (Object.keys(filter).length > 0) {
      params.filter = filter;
    }
  }

  return params;
}