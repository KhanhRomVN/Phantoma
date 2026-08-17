import { extractParamValue } from '../../../utils/ToolParser';
import { ListResourcesParams } from '../../../types/tool-types';

/**
 * Parse list_resources tag from AI response.
 * Format:
 *   <list_resources>
 *     <filter>
 *       <type>image</type>
 *     </filter>
 *   </list_resources>
 */
export function parseListResources(innerContent: string): ListResourcesParams {
  const params: ListResourcesParams = {};

  // Extract filter block
  const filterMatch = /<filter>([\s\S]*?)<\/filter>/i.exec(innerContent);
  if (filterMatch) {
    const filterContent = filterMatch[1];
    const filter: ListResourcesParams['filter'] = {};

    const type = extractParamValue(filterContent, 'type');
    if (type) filter.type = type;

    if (Object.keys(filter).length > 0) {
      params.filter = filter;
    }
  }

  return params;
}
